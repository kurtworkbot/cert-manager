import { DnsProvider, DnsChallenge } from './types';

export class DigitalOceanProvider implements DnsProvider {
  name = 'digitalocean';
  private apiToken: string;
  private baseUrl = 'https://api.digitalocean.com/v2';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private getRootDomain(domain: string): string {
    const parts = domain.split('.');
    return parts.slice(-2).join('.');
  }

  private getRecordName(recordName: string, domain: string): string {
    const rootDomain = this.getRootDomain(domain);
    // Remove the root domain suffix to get just the subdomain part
    const suffix = '.' + rootDomain;
    if (recordName.endsWith(suffix)) {
      return recordName.slice(0, -suffix.length);
    }
    return recordName;
  }

  async createRecord(challenge: DnsChallenge): Promise<void> {
    const rootDomain = this.getRootDomain(challenge.domain);
    const name = this.getRecordName(challenge.recordName, challenge.domain);
    
    const response = await fetch(`${this.baseUrl}/domains/${rootDomain}/records`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        type: 'TXT',
        name: name,
        data: challenge.recordValue,
        ttl: 120,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DigitalOcean API error: ${error}`);
    }
  }

  async deleteRecord(challenge: DnsChallenge): Promise<void> {
    const rootDomain = this.getRootDomain(challenge.domain);
    const name = this.getRecordName(challenge.recordName, challenge.domain);
    
    // First, find the record ID
    const listResponse = await fetch(
      `${this.baseUrl}/domains/${rootDomain}/records?type=TXT&name=${name}`,
      { headers: this.headers }
    );
    
    if (!listResponse.ok) return;
    
    const data = await listResponse.json() as { domain_records: { id: number; data: string }[] };
    
    // Delete matching records
    for (const record of data.domain_records || []) {
      if (record.data === challenge.recordValue) {
        await fetch(`${this.baseUrl}/domains/${rootDomain}/records/${record.id}`, {
          method: 'DELETE',
          headers: this.headers,
        });
      }
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: this.headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
