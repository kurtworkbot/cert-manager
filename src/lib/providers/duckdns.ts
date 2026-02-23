import { DnsProvider, DnsProviderConfig } from './index';

export class DuckDnsProvider implements DnsProvider {
  name = 'duckdns';
  private token: string;

  constructor(config: DnsProviderConfig) {
    if (!config.apiToken) {
      throw new Error('DuckDNS provider requires an apiToken');
    }
    this.token = config.apiToken;
  }

  private extractDomain(fqdn: string): string {
    // Remove _acme-challenge. prefix if present
    let domain = fqdn.replace(/^_acme-challenge\./, '');
    // Remove .duckdns.org suffix if present
    domain = domain.replace(/\.duckdns\.org$/, '');
    return domain;
  }

  async createRecord(domain: string, value: string): Promise<void> {
    const d = this.extractDomain(domain);
    const url = `https://www.duckdns.org/update?domains=${d}&token=${this.token}&txt=${value}&verbose=true`;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (!text.startsWith('OK')) {
         throw new Error(`DuckDNS API error: ${text}`);
      }
    } catch (error) {
       throw new Error(`Failed to create record for ${domain}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteRecord(domain: string): Promise<void> {
    const d = this.extractDomain(domain);
    // clear=true clears the TXT record
    const url = `https://www.duckdns.org/update?domains=${d}&token=${this.token}&txt=&clear=true&verbose=true`;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
       if (!text.startsWith('OK')) {
         throw new Error(`DuckDNS API error: ${text}`);
      }
    } catch (error) {
       throw new Error(`Failed to delete record for ${domain}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
