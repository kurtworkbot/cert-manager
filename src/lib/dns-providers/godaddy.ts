import { DnsProvider, DnsChallenge } from './types';

export class GoDaddyProvider implements DnsProvider {
  name = 'godaddy';
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.godaddy.com/v1';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private get headers() {
    return {
      'Authorization': `sso-key ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  private getRootDomain(domain: string): string {
    const parts = domain.split('.');
    return parts.slice(-2).join('.');
  }

  private getSubdomain(recordName: string, domain: string): string {
    const rootDomain = this.getRootDomain(domain);
    // recordName is like "_acme-challenge.sub.example.com"
    // We need to extract the part before the root domain
    const suffix = '.' + rootDomain;
    if (recordName.endsWith(suffix)) {
      return recordName.slice(0, -suffix.length);
    }
    return recordName.replace('.' + rootDomain, '');
  }

  async createRecord(challenge: DnsChallenge): Promise<void> {
    const rootDomain = this.getRootDomain(challenge.domain);
    const name = this.getSubdomain(challenge.recordName, challenge.domain);
    
    const response = await fetch(
      `${this.baseUrl}/domains/${rootDomain}/records/TXT/${name}`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify([
          {
            data: challenge.recordValue,
            ttl: 600,
          },
        ]),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GoDaddy API error: ${error}`);
    }
  }

  async deleteRecord(challenge: DnsChallenge): Promise<void> {
    const rootDomain = this.getRootDomain(challenge.domain);
    const name = this.getSubdomain(challenge.recordName, challenge.domain);
    
    // GoDaddy doesn't have a direct delete, we set an empty record
    // or use DELETE endpoint
    const response = await fetch(
      `${this.baseUrl}/domains/${rootDomain}/records/TXT/${name}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    // Ignore errors on delete (record might not exist)
    if (!response.ok && response.status !== 404) {
      console.warn('GoDaddy delete warning:', await response.text());
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/domains?limit=1`, {
        headers: this.headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
