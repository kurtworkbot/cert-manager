import { DnsProvider, DnsProviderConfig } from './index';

export class CloudflareProvider implements DnsProvider {
  name = 'cloudflare';
  private apiToken: string;
  private zoneId?: string;

  constructor(config: DnsProviderConfig) {
    if (!config.apiToken) {
      throw new Error('Cloudflare provider requires an apiToken');
    }
    this.apiToken = config.apiToken;
    this.zoneId = config.zoneId;
  }

  private async getZoneId(domain: string): Promise<string> {
    if (this.zoneId) return this.zoneId;
    throw new Error('Cloudflare provider requires zoneId in config');
  }

  async createRecord(domain: string, value: string): Promise<void> {
    const zoneId = await this.getZoneId(domain);
    
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TXT',
        name: domain,
        content: value,
        ttl: 120,
      }),
    });

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
  }

  async deleteRecord(domain: string): Promise<void> {
    const zoneId = await this.getZoneId(domain);

    // Find the record first
    const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(domain)}`;
    const listResponse = await fetch(listUrl, {
       headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const listData: any = await listResponse.json();
    if (!listData.success) {
      throw new Error(`Cloudflare API error listing records: ${JSON.stringify(listData.errors)}`);
    }

    const records = listData.result;
    if (!records || records.length === 0) {
      return;
    }

    // Delete all matching records
    for (const record of records) {
      const deleteUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const deleteData: any = await deleteResponse.json();
      if (!deleteData.success) {
        throw new Error(`Cloudflare API error deleting record: ${JSON.stringify(deleteData.errors)}`);
      }
    }
  }
}
