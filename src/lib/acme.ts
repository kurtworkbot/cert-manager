import * as acme from 'acme-client';
import * as crypto from 'crypto';
import { 
  getCertificateByDomain, 
  updateCertificate, 
  saveChallengeToken, 
  deleteChallengeTokens,
  logHookExecution,
  type Certificate 
} from './db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Use Let's Encrypt staging for testing, production for real certs
const ACME_DIRECTORY = process.env.ACME_PRODUCTION === 'true'
  ? acme.directory.letsencrypt.production
  : acme.directory.letsencrypt.staging;

interface AcmeConfig {
  email: string;
  domain: string;
  challengeType: 'http' | 'dns';
  dnsProvider?: string;
  cloudflareApiToken?: string;
}

let accountKey: Buffer | null = null;

async function getOrCreateAccountKey(): Promise<Buffer> {
  if (accountKey) return accountKey;
  accountKey = await acme.crypto.createPrivateKey();
  return accountKey;
}

export async function requestCertificate(config: AcmeConfig): Promise<{
  success: boolean;
  certificate?: string;
  privateKey?: string;
  expiresAt?: string;
  error?: string;
}> {
  try {
    const accountKey = await getOrCreateAccountKey();
    
    const client = new acme.Client({
      directoryUrl: ACME_DIRECTORY,
      accountKey,
    });

    // Create account
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${config.email}`],
    });

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: config.domain,
    });

    // Request certificate with challenge handling
    const certificate = await client.auto({
      csr,
      email: config.email,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        if (config.challengeType === 'http') {
          // Save HTTP challenge token to database
          saveChallengeToken(config.domain, challenge.token, keyAuthorization);
        } else if (config.challengeType === 'dns') {
          // Handle DNS challenge
          if (config.dnsProvider === 'cloudflare' && config.cloudflareApiToken) {
            await createCloudflareDnsRecord(
              config.domain,
              keyAuthorization,
              config.cloudflareApiToken
            );
          }
        }
      },
      challengeRemoveFn: async (authz, challenge) => {
        if (config.challengeType === 'http') {
          deleteChallengeTokens(config.domain);
        } else if (config.challengeType === 'dns') {
          if (config.dnsProvider === 'cloudflare' && config.cloudflareApiToken) {
            await deleteCloudflareDnsRecord(config.domain, config.cloudflareApiToken);
          }
        }
      },
      challengePriority: config.challengeType === 'dns' ? ['dns-01'] : ['http-01'],
    });

    // Calculate expiry (Let's Encrypt certs are valid for 90 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return {
      success: true,
      certificate,
      privateKey: key.toString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('ACME error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function renewCertificate(certId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  const cert = getCertificateByDomain('') as Certificate | undefined;
  // Get by ID instead
  const { getCertificate } = await import('./db');
  const certificate = getCertificate(certId);
  
  if (!certificate) {
    return { success: false, error: 'Certificate not found' };
  }

  const email = process.env.ACME_EMAIL || 'admin@example.com';
  
  const result = await requestCertificate({
    email,
    domain: certificate.domain,
    challengeType: certificate.challenge_type,
    dnsProvider: certificate.dns_provider || undefined,
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  });

  if (result.success) {
    updateCertificate(certId, {
      status: 'valid',
      certificate: result.certificate,
      private_key: result.privateKey,
      issued_at: new Date().toISOString(),
      expires_at: result.expiresAt,
    });

    // Execute hook if configured
    if (certificate.hook_script) {
      await executeHook(certId, certificate.hook_script, {
        domain: certificate.domain,
        certificate: result.certificate!,
        privateKey: result.privateKey!,
      });
    }

    return { success: true };
  }

  updateCertificate(certId, { status: 'error' });
  return { success: false, error: result.error };
}

async function createCloudflareDnsRecord(
  domain: string,
  keyAuthorization: string,
  apiToken: string
): Promise<void> {
  const txtValue = crypto
    .createHash('sha256')
    .update(keyAuthorization)
    .digest('base64url');

  const zoneId = await getCloudflareZoneId(domain, apiToken);
  
  await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'TXT',
      name: `_acme-challenge.${domain}`,
      content: txtValue,
      ttl: 120,
    }),
  });
}

async function deleteCloudflareDnsRecord(
  domain: string,
  apiToken: string
): Promise<void> {
  const zoneId = await getCloudflareZoneId(domain, apiToken);
  
  // Find and delete the ACME challenge record
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=_acme-challenge.${domain}&type=TXT`,
    {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    }
  );
  
  const data = await response.json() as { result: { id: string }[] };
  
  for (const record of data.result || []) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      }
    );
  }
}

async function getCloudflareZoneId(domain: string, apiToken: string): Promise<string> {
  // Extract root domain (e.g., example.com from sub.example.com)
  const parts = domain.split('.');
  const rootDomain = parts.slice(-2).join('.');
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${rootDomain}`,
    {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    }
  );
  
  const data = await response.json() as { result: { id: string }[] };
  
  if (!data.result || data.result.length === 0) {
    throw new Error(`Zone not found for domain: ${rootDomain}`);
  }
  
  return data.result[0].id;
}

async function executeHook(
  certId: number,
  script: string,
  context: { domain: string; certificate: string; privateKey: string }
): Promise<void> {
  try {
    const env = {
      ...process.env,
      CERT_DOMAIN: context.domain,
      CERT_CERTIFICATE: context.certificate,
      CERT_PRIVATE_KEY: context.privateKey,
    };

    const { stdout, stderr } = await execAsync(script, { env });
    logHookExecution(certId, true, stdout + stderr);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logHookExecution(certId, false, errorMessage);
  }
}

export function getCertificateStatus(expiresAt: string | null): 'valid' | 'expiring' | 'expired' | 'pending' {
  if (!expiresAt) return 'pending';
  
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 30) return 'expiring';
  return 'valid';
}
