export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface DnsProviderConfig {
  apiKey?: string;
  apiToken?: string;
  email?: string;
  zoneId?: string;
  [key: string]: any;
}

export interface DnsProvider {
  name: string;
  createRecord(domain: string, value: string): Promise<void>;
  deleteRecord(domain: string): Promise<void>;
}

export * from './duckdns';
export * from './cloudflare';
