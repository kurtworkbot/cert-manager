import { DnsProvider, DnsChallenge } from './types';
import * as crypto from 'crypto';

interface Route53Change {
  Action: 'UPSERT' | 'DELETE';
  ResourceRecordSet: {
    Name: string;
    Type: string;
    TTL: number;
    ResourceRecords: { Value: string }[];
  };
}

export class Route53Provider implements DnsProvider {
  name = 'route53';
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region = 'us-east-1') {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  async createRecord(challenge: DnsChallenge): Promise<void> {
    const hostedZoneId = await this.getHostedZoneId(challenge.domain);
    await this.changeResourceRecordSets(hostedZoneId, 'UPSERT', challenge);
  }

  async deleteRecord(challenge: DnsChallenge): Promise<void> {
    const hostedZoneId = await this.getHostedZoneId(challenge.domain);
    await this.changeResourceRecordSets(hostedZoneId, 'DELETE', challenge);
  }

  private async getHostedZoneId(domain: string): Promise<string> {
    const parts = domain.split('.');
    const rootDomain = parts.slice(-2).join('.') + '.';
    
    const response = await this.signedRequest(
      'GET',
      `https://route53.amazonaws.com/2013-04-01/hostedzonesbyname?dnsname=${rootDomain}`
    );
    
    const text = await response.text();
    // Simple XML parsing for HostedZoneId
    const match = text.match(/<Id>\/hostedzone\/([^<]+)<\/Id>/);
    if (!match) {
      throw new Error(`Route53 hosted zone not found for: ${rootDomain}`);
    }
    
    return match[1];
  }

  private async changeResourceRecordSets(
    hostedZoneId: string,
    action: 'UPSERT' | 'DELETE',
    challenge: DnsChallenge
  ): Promise<void> {
    const change: Route53Change = {
      Action: action,
      ResourceRecordSet: {
        Name: challenge.recordName,
        Type: 'TXT',
        TTL: 120,
        ResourceRecords: [{ Value: `"${challenge.recordValue}"` }],
      },
    };

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <ChangeBatch>
    <Changes>
      <Change>
        <Action>${change.Action}</Action>
        <ResourceRecordSet>
          <Name>${change.ResourceRecordSet.Name}</Name>
          <Type>${change.ResourceRecordSet.Type}</Type>
          <TTL>${change.ResourceRecordSet.TTL}</TTL>
          <ResourceRecords>
            <ResourceRecord>
              <Value>${change.ResourceRecordSet.ResourceRecords[0].Value}</Value>
            </ResourceRecord>
          </ResourceRecords>
        </ResourceRecordSet>
      </Change>
    </Changes>
  </ChangeBatch>
</ChangeResourceRecordSetsRequest>`;

    await this.signedRequest(
      'POST',
      `https://route53.amazonaws.com/2013-04-01/hostedzone/${hostedZoneId}/rrset`,
      body
    );
  }

  private async signedRequest(method: string, url: string, body?: string): Promise<Response> {
    const urlObj = new URL(url);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.slice(0, 8);
    
    const headers: Record<string, string> = {
      'Host': urlObj.host,
      'X-Amz-Date': date,
    };

    if (body) {
      headers['Content-Type'] = 'application/xml';
    }

    // AWS Signature V4
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 'route53';
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
      .join('\n') + '\n';
    
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');
    
    const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex');
    
    const canonicalRequest = [
      method,
      urlObj.pathname,
      urlObj.search.slice(1),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    
    const stringToSign = [
      algorithm,
      date,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    
    const kDate = crypto.createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    
    headers['Authorization'] = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return fetch(url, { method, headers, body });
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await this.signedRequest('GET', 'https://route53.amazonaws.com/2013-04-01/hostedzone?maxitems=1');
      return response.ok;
    } catch {
      return false;
    }
  }
}
