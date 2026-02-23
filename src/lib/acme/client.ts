import * as acme from 'acme-client';
import { encrypt, decrypt } from '../crypto';
import { DnsProvider } from '../providers';

export type AcmeEnvironment = 'letsencrypt-production' | 'letsencrypt-staging' | 'zerossl';

export interface AcmeAccountOptions {
  email: string;
  provider: AcmeEnvironment;
  eab?: {
    kid: string;
    hmacKey: string;
  };
}

export interface AcmeOrder {
  domains: string[];
}

export class AcmeService {
  private static getDirectoryUrl(env: AcmeEnvironment): string {
    switch (env) {
      case 'letsencrypt-production':
        return acme.directory.letsencrypt.production;
      case 'letsencrypt-staging':
        return acme.directory.letsencrypt.staging;
      case 'zerossl':
        return 'https://acme.zerossl.com/v2/DV90';
      default:
        throw new Error(`Unknown ACME environment: ${env}`);
    }
  }

  /**
   * Generates a new account key pair and registers an account with the CA.
   * Returns the account details including the encrypted private key.
   */
  async registerAccount(options: AcmeAccountOptions) {
    const directoryUrl = AcmeService.getDirectoryUrl(options.provider);
    
    // Generate a new private key (RSA 2048)
    const accountKey = await acme.crypto.createPrivateKey();

    const client = new acme.Client({
      directoryUrl,
      accountKey,
      externalAccountBinding: options.eab,
    });

    const registrationOptions = {
      termsOfServiceAgreed: true,
      contact: [`mailto:${options.email}`],
    };

    // Register account
    await client.createAccount(registrationOptions);
    
    // Get account URL from the client instance (stored internally after registration)
    const accountUrl = client.getAccountUrl();

    // Encrypt the private key for storage
    const encryptedKey = await encrypt(accountKey.toString());

    return {
      accountUrl,
      encryptedPrivateKey: encryptedKey,
    };
  }

  /**
   * Creates an order for a certificate.
   */
  async createOrder(
    encryptedAccountKey: string,
    accountUrl: string,
    provider: AcmeEnvironment,
    domains: string[]
  ) {
    const accountKeyPem = await decrypt(encryptedAccountKey);
    const directoryUrl = AcmeService.getDirectoryUrl(provider);

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountKeyPem,
      accountUrl,
    });

    const order = await client.createOrder({
      identifiers: domains.map((domain) => ({ type: 'dns', value: domain })),
    });

    return order;
  }

  /**
   * Get authorizations (challenges) for an order.
   */
  async getAuthorizations(
    encryptedAccountKey: string,
    accountUrl: string,
    provider: AcmeEnvironment,
    order: any
  ) {
    const accountKeyPem = await decrypt(encryptedAccountKey);
    const directoryUrl = AcmeService.getDirectoryUrl(provider);

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountKeyPem,
      accountUrl,
    });

    const authorizations = await client.getAuthorizations(order);
    return authorizations;
  }

  /**
   * Completes a challenge.
   */
  async completeChallenge(
    encryptedAccountKey: string,
    accountUrl: string,
    provider: AcmeEnvironment,
    challenge: any
  ) {
    const accountKeyPem = await decrypt(encryptedAccountKey);
    const directoryUrl = AcmeService.getDirectoryUrl(provider);

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountKeyPem,
      accountUrl,
    });

    await client.completeChallenge(challenge);
    await client.waitForValidStatus(challenge);
  }

  /**
   * Finalizes an order and retrieves the certificate.
   */
  async finalizeOrder(
    encryptedAccountKey: string,
    accountUrl: string,
    provider: AcmeEnvironment,
    order: any,
    domains: string[] // needed for CSR
  ) {
    const accountKeyPem = await decrypt(encryptedAccountKey);
    const directoryUrl = AcmeService.getDirectoryUrl(provider);

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountKeyPem,
      accountUrl,
    });

    // Generate CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: domains[0],
      altNames: domains,
    });

    const finalizedOrder = await client.finalizeOrder(order, csr);
    const cert = await client.getCertificate(finalizedOrder);

    return {
      cert,
      privateKey: key.toString(), // The certificate private key (not account key)
    };
  }

  /**
   * Orchestrates the entire renewal process for a certificate.
   */
  async renew(
    encryptedAccountKey: string,
    accountUrl: string,
    provider: AcmeEnvironment,
    domains: string[],
    dnsProvider: DnsProvider
  ) {
    const accountKeyPem = await decrypt(encryptedAccountKey);
    const directoryUrl = AcmeService.getDirectoryUrl(provider);

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountKeyPem,
      accountUrl,
    });

    // 1. Create Order
    const order = await client.createOrder({
      identifiers: domains.map((domain) => ({ type: 'dns', value: domain })),
    });

    // 2. Get Authorizations
    const authorizations = await client.getAuthorizations(order);

    // 3. Solve Challenges
    for (const auth of authorizations) {
      const challenge = auth.challenges.find((c) => c.type === 'dns-01');
      if (!challenge) {
        throw new Error(`No DNS-01 challenge found for ${auth.identifier.value}`);
      }

      const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);
      const domain = auth.identifier.value;

      // Add TXT record
      console.log(`Creating TXT record for ${domain}...`);
      await dnsProvider.createRecord(`_acme-challenge.${domain}`, keyAuthorization);

      // Wait for propagation (10s)
      console.log('Waiting for DNS propagation...');
      await new Promise((resolve) => setTimeout(resolve, 10000));

      try {
        // Complete challenge
        console.log('Completing challenge...');
        await client.completeChallenge(challenge);
        await client.waitForValidStatus(challenge);
      } finally {
        // Clean up
        console.log('Cleaning up TXT record...');
        await dnsProvider.deleteRecord(`_acme-challenge.${domain}`);
      }
    }

    // 4. Finalize
    const [key, csr] = await acme.crypto.createCsr({
      commonName: domains[0],
      altNames: domains,
    });

    const finalizedOrder = await client.finalizeOrder(order, csr);
    const cert = await client.getCertificate(finalizedOrder);

    return {
      cert,
      privateKey: key.toString(),
    };
  }
}
