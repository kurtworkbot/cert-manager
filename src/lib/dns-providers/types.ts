// DNS Provider Interface

export interface DnsChallenge {
  domain: string;
  recordName: string;  // e.g., "_acme-challenge.example.com"
  recordValue: string; // TXT record value (SHA256 of key authorization)
}

export interface DnsProvider {
  name: string;
  
  /**
   * Create a TXT record for ACME DNS-01 challenge
   */
  createRecord(challenge: DnsChallenge): Promise<void>;
  
  /**
   * Delete the TXT record after validation
   */
  deleteRecord(challenge: DnsChallenge): Promise<void>;
  
  /**
   * Verify the provider credentials are valid
   */
  verifyCredentials?(): Promise<boolean>;
}

export interface ProviderConfig {
  cloudflare?: {
    apiToken: string;
  };
  route53?: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  };
  godaddy?: {
    apiKey: string;
    apiSecret: string;
  };
  digitalocean?: {
    apiToken: string;
  };
}

export type ProviderName = 'cloudflare' | 'route53' | 'godaddy' | 'digitalocean' | 'manual';
