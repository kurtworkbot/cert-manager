// ACME Certificate Authority Providers

export interface AcmeProvider {
  name: string;
  label: string;
  directoryUrl: string;
  stagingUrl?: string;
  website: string;
  certValidityDays: number;
  requiresEab?: boolean; // External Account Binding
  eabKeyIdEnvVar?: string;
  eabMacKeyEnvVar?: string;
}

export const ACME_PROVIDERS: Record<string, AcmeProvider> = {
  letsencrypt: {
    name: 'letsencrypt',
    label: "Let's Encrypt",
    directoryUrl: 'https://acme-v02.api.letsencrypt.org/directory',
    stagingUrl: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    website: 'https://letsencrypt.org',
    certValidityDays: 90,
  },
  zerossl: {
    name: 'zerossl',
    label: 'ZeroSSL',
    directoryUrl: 'https://acme.zerossl.com/v2/DV90',
    website: 'https://zerossl.com',
    certValidityDays: 90,
    requiresEab: true,
    eabKeyIdEnvVar: 'ZEROSSL_EAB_KID',
    eabMacKeyEnvVar: 'ZEROSSL_EAB_HMAC_KEY',
  },
  buypass: {
    name: 'buypass',
    label: 'Buypass Go',
    directoryUrl: 'https://api.buypass.com/acme/directory',
    stagingUrl: 'https://api.test4.buypass.no/acme/directory',
    website: 'https://www.buypass.com/ssl/products/acme',
    certValidityDays: 180,
  },
  google: {
    name: 'google',
    label: 'Google Trust Services',
    directoryUrl: 'https://dv.acme-v02.api.pki.goog/directory',
    stagingUrl: 'https://dv.acme-v02.test-api.pki.goog/directory',
    website: 'https://pki.goog',
    certValidityDays: 90,
    requiresEab: true,
    eabKeyIdEnvVar: 'GOOGLE_EAB_KID',
    eabMacKeyEnvVar: 'GOOGLE_EAB_HMAC_KEY',
  },
  sslcom: {
    name: 'sslcom',
    label: 'SSL.com',
    directoryUrl: 'https://acme.ssl.com/sslcom-dv-rsa',
    website: 'https://ssl.com',
    certValidityDays: 90,
    requiresEab: true,
    eabKeyIdEnvVar: 'SSLCOM_EAB_KID',
    eabMacKeyEnvVar: 'SSLCOM_EAB_HMAC_KEY',
  },
};

export type AcmeProviderName = keyof typeof ACME_PROVIDERS;

export function getAcmeProvider(name: string): AcmeProvider | undefined {
  return ACME_PROVIDERS[name];
}

export function getAcmeDirectoryUrl(providerName: string, useStaging: boolean): string {
  const provider = ACME_PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown ACME provider: ${providerName}`);
  }
  
  if (useStaging && provider.stagingUrl) {
    return provider.stagingUrl;
  }
  
  return provider.directoryUrl;
}

export function getAvailableAcmeProviders(): Array<{
  name: string;
  label: string;
  configured: boolean;
  requiresEab: boolean;
  certValidityDays: number;
}> {
  return Object.values(ACME_PROVIDERS).map(provider => ({
    name: provider.name,
    label: provider.label,
    configured: provider.requiresEab
      ? !!(process.env[provider.eabKeyIdEnvVar!] && process.env[provider.eabMacKeyEnvVar!])
      : true,
    requiresEab: provider.requiresEab || false,
    certValidityDays: provider.certValidityDays,
  }));
}

export function getEabCredentials(providerName: string): { kid: string; hmacKey: string } | null {
  const provider = ACME_PROVIDERS[providerName];
  if (!provider?.requiresEab) return null;
  
  const kid = process.env[provider.eabKeyIdEnvVar!];
  const hmacKey = process.env[provider.eabMacKeyEnvVar!];
  
  if (!kid || !hmacKey) return null;
  
  return { kid, hmacKey };
}
