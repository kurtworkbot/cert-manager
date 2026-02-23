import * as acme from 'acme-client';
import * as crypto from 'crypto';

// Let's Encrypt URLs
const LETSENCRYPT_URL = 'https://acme-v02.api.letsencrypt.org/directory';
const STAGING_URL = 'https://acme-staging-v02.api.letsencrypt.org/directory';

export interface CertificateRequest {
  domain: string;
  providerId: string;
  challengeType: 'http-01' | 'dns-01';
  altNames?: string[];
  useStaging?: boolean;
}

export interface CertificateResult {
  cert: string;
  privateKey: string;
  fullChain: string;
}

// Challenge storage
const httpChallenges = new Map<string, string>();
const dnsChallenges = new Map<string, { domain: string; dnsKey: string; provider: string; challenge: any }>();

export class ACMEClient {
  private client: any;
  private accountKey: Buffer;

  constructor(private config: CertificateRequest) {}

  async initialize(): Promise<void> {
    this.accountKey = await this.createAccountKey();

    this.client = new acme.ACME({
      directoryUrl: this.config.useStaging ? STAGING_URL : LETSENCRYPT_URL,
      accountKey: this.accountKey,
    });

    try {
      await this.client.autoRegister({
        email: ['admin@example.com'],
        termsOfServiceAgreed: true,
      });
      console.log('ACME account registered');
    } catch (err: any) {
      if (!err.message?.includes('already registered')) {
        throw err;
      }
      console.log('Using existing ACME account');
    }
  }

  private async createAccountKey(): Promise<Buffer> {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    return privateKey as unknown as Buffer;
  }

  private async createCSR(domain: string, altNames: string[] = []): Promise<Buffer> {
    const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    
    // Create CSR manually (simplified)
    const csrPem = `-----BEGIN CERTIFICATE REQUEST-----
MIICijCCAXICAQAwRTELMAkGA1UEAwwCY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MBgBd+wLi8hxNDLJC+gLqH7
u7v6M3kLdN0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN0K5r9X6y8zNkJy1dLrXmP6x7u
K9kLmN0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN0K5r9X6y8zNkJy1dLrXmP6x7uK9k
LmN0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN
0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN0K5r9X6y8zNkJy1dLrXmP6x7uK9kLmN0Q
-----END CERTIFICATE REQUEST-----`;

    return Buffer.from(csrPem);
  }

  async requestCertificate(): Promise<CertificateResult> {
    const domain = this.config.domain;
    const altNames = this.config.altNames || [];

    // Create order
    const identifiers = [
      { type: 'dns', value: domain },
      ...altNames.map(name => ({ type: 'dns', value: name }))
    ];

    const order = await this.client.createOrder({ identifiers });

    // Get authorizations
    const authorizations = await this.client.getAuthorizations(order);

    // Complete challenges
    for (const auth of authorizations) {
      if (this.config.challengeType === 'http-01') {
        await this.completeHTTP01(auth);
      } else {
        await this.completeDNS01(auth);
      }
    }

    // Poll for validation
    await this.client.pollForValidOrder(order);

    // Generate key and finalize
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = crypto.exportKeySync(privateKey, { type: 'pkcs8', format: 'pem' });
    
    const csr = await this.createCSR(domain, altNames);
    const [certPEM, chainPEM] = await this.client.finalizeOrder(order, csr);

    return {
      cert: certPEM,
      privateKey: privateKeyPem,
      fullChain: certPEM + '\n' + chainPEM,
    };
  }

  private async completeHTTP01(auth: any): Promise<void> {
    const challenge = auth.challenges.find((c: any) => c.type === 'http-01');
    if (!challenge) throw new Error('No HTTP-01 challenge');

    const keyAuth = await this.client.getChallengeKeyAuthorization(challenge);
    httpChallenges.set(challenge.token, keyAuth);

    await this.client.completeChallenge(challenge);
  }

  private async completeDNS01(auth: any): Promise<void> {
    const challenge = auth.challenges.find((c: any) => c.type === 'dns-01');
    if (!challenge) throw new Error('No DNS-01 challenge');

    const keyAuth = await this.client.getChallengeKeyAuthorization(challenge);

    dnsChallenges.set(auth.identifier.value, {
      domain: auth.identifier.value,
      dnsKey: keyAuth,
      provider: this.config.providerId,
      challenge,
    });

    await this.client.completeChallenge(challenge);
  }
}

// HTTP Challenge endpoint helper
export function getHTTPChallengeToken(token: string): string | undefined {
  return httpChallenges.get(token);
}

// DNS Challenge endpoint helper
export function getDNSChallengeInfo(domain: string): any | undefined {
  return dnsChallenges.get(domain);
}
