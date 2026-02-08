import { DnsProvider, DnsChallenge } from './types';

export class CloudflareProvider implements DnsProvider {
  name = 'cloudflare';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async createRecord(challenge: DnsChallenge): Promise<void> {
    const zoneId = await this.getZoneId(challenge.domain);
    
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TXT',
        name: challenge.recordName,
        content: challenge.recordValue,
        ttl: 120,
      }),
    });
  }

  async deleteRecord(challenge: DnsChallenge): Promise<void> {
    const zoneId = await this.getZoneId(challenge.domain);
    
    // Find the record
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${challenge.recordName}&type=TXT`,
      { headers: { 'Authorization': `Bearer ${this.apiToken}` } }
    );
    
    const data = await response.json() as { result: { id: string }[] };
    
    // Delete all matching records
    for (const record of data.result || []) {
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.apiToken}` },
        }
      );
    }
  }

  private async getZoneId(domain: string): Promise<string> {
    // Extract root domain
    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.');
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${rootDomain}`,
      { headers: { 'Authorization': `Bearer ${this.apiToken}` } }
    );
    
    const data = await response.json() as { result: { id: string }[] };
    
    if (!data.result || data.result.length === 0) {
      throw new Error(`Cloudflare zone not found for: ${rootDomain}`);
    }
    
    return data.result[0].id;
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
      });
      const data = await response.json() as { success: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  }
}
