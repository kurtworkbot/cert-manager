import * as acme from 'acme-client';
import * as crypto from 'crypto';
import { 
  updateCertificate, 
  saveChallengeToken, 
  deleteChallengeTokens,
  logHookExecution,
  type Certificate 
} from './db';
import { createDnsProvider, ProviderName } from './dns-providers';
import { 
  getAcmeDirectoryUrl, 
  getAcmeProvider, 
  getEabCredentials,
  ACME_PROVIDERS 
} from './acme-providers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AcmeConfig {
  email: string;
  domain: string;
  challengeType: 'http' | 'dns';
  dnsProvider?: string;
  acmeProvider?: string;
}

// Store account keys per provider
const accountKeys: Map<string, Buffer> = new Map();

async function getOrCreateAccountKey(providerName: string): Promise<Buffer> {
  if (accountKeys.has(providerName)) {
    return accountKeys.get(providerName)!;
  }
  const key = await acme.crypto.createPrivateKey();
  accountKeys.set(providerName, key);
  return key;
}

export async function requestCertificate(config: AcmeConfig): Promise<{
  success: boolean;
  certificate?: string;
  privateKey?: string;
  expiresAt?: string;
  error?: string;
}> {
  const providerName = config.acmeProvider || 'letsencrypt';
  const provider = getAcmeProvider(providerName);
  
  if (!provider) {
    return { success: false, error: `Unknown ACME provider: ${providerName}` };
  }

  try {
    const useStaging = process.env.ACME_PRODUCTION !== 'true';
    const directoryUrl = getAcmeDirectoryUrl(providerName, useStaging);
    const accountKey = await getOrCreateAccountKey(providerName);
    
    const client = new acme.Client({
      directoryUrl,
      accountKey,
    });

    // Handle External Account Binding (EAB) for providers that require it
    if (provider.requiresEab) {
      const eab = getEabCredentials(providerName);
      if (!eab) {
        return { 
          success: false, 
          error: `${provider.label} requires EAB credentials. Set ${provider.eabKeyIdEnvVar} and ${provider.eabMacKeyEnvVar}` 
        };
      }
      
      // Create account with EAB
      await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${config.email}`],
        externalAccountBinding: {
          kid: eab.kid,
          hmacKey: eab.hmacKey,
        },
      });
    } else {
      // Create account without EAB
      await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${config.email}`],
      });
    }

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: config.domain,
    });

    // Get DNS provider if needed
    const dnsProvider = config.challengeType === 'dns' && config.dnsProvider
      ? createDnsProvider(config.dnsProvider as ProviderName)
      : null;

    // Request certificate with challenge handling
    const certificate = await client.auto({
      csr,
      email: config.email,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        if (config.challengeType === 'http') {
          saveChallengeToken(config.domain, challenge.token, keyAuthorization);
        } else if (config.challengeType === 'dns' && dnsProvider) {
          const txtValue = crypto
            .createHash('sha256')
            .update(keyAuthorization)
            .digest('base64url');
          
          await dnsProvider.createRecord({
            domain: config.domain,
            recordName: `_acme-challenge.${config.domain}`,
            recordValue: txtValue,
          });
          
          // Wait for DNS propagation
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      },
      challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
        if (config.challengeType === 'http') {
          deleteChallengeTokens(config.domain);
        } else if (config.challengeType === 'dns' && dnsProvider) {
          const txtValue = crypto
            .createHash('sha256')
            .update(keyAuthorization)
            .digest('base64url');
          
          await dnsProvider.deleteRecord({
            domain: config.domain,
            recordName: `_acme-challenge.${config.domain}`,
            recordValue: txtValue,
          });
        }
      },
      challengePriority: config.challengeType === 'dns' ? ['dns-01'] : ['http-01'],
    });

    // Calculate expiry based on provider's validity period
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + provider.certValidityDays);

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
    acmeProvider: certificate.acme_provider || 'letsencrypt',
  });

  if (result.success) {
    updateCertificate(certId, {
      status: 'valid',
      certificate: result.certificate,
      private_key: result.privateKey,
      issued_at: new Date().toISOString(),
      expires_at: result.expiresAt,
    });

    // Clear notification records after successful renewal
    const { clearNotificationsForCertificate } = await import('./db');
    clearNotificationsForCertificate(certId);

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
