import { DnsProvider, ProviderName, ProviderConfig } from './types';
import { CloudflareProvider } from './cloudflare';
import { Route53Provider } from './route53';
import { GoDaddyProvider } from './godaddy';
import { DigitalOceanProvider } from './digitalocean';
import { ManualProvider } from './manual';

export * from './types';
export { CloudflareProvider } from './cloudflare';
export { Route53Provider } from './route53';
export { GoDaddyProvider } from './godaddy';
export { DigitalOceanProvider } from './digitalocean';
export { ManualProvider } from './manual';

/**
 * Create a DNS provider instance based on name and environment config
 */
export function createDnsProvider(name: ProviderName): DnsProvider {
  switch (name) {
    case 'cloudflare': {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      if (!token) throw new Error('CLOUDFLARE_API_TOKEN not configured');
      return new CloudflareProvider(token);
    }
    
    case 'route53': {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION || 'us-east-1';
      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not configured');
      }
      return new Route53Provider(accessKeyId, secretAccessKey, region);
    }
    
    case 'godaddy': {
      const apiKey = process.env.GODADDY_API_KEY;
      const apiSecret = process.env.GODADDY_API_SECRET;
      if (!apiKey || !apiSecret) {
        throw new Error('GODADDY_API_KEY and GODADDY_API_SECRET not configured');
      }
      return new GoDaddyProvider(apiKey, apiSecret);
    }
    
    case 'digitalocean': {
      const token = process.env.DIGITALOCEAN_API_TOKEN;
      if (!token) throw new Error('DIGITALOCEAN_API_TOKEN not configured');
      return new DigitalOceanProvider(token);
    }
    
    case 'manual':
      return new ManualProvider();
    
    default:
      throw new Error(`Unknown DNS provider: ${name}`);
  }
}

/**
 * Get list of available providers with their configuration status
 */
export function getAvailableProviders(): Array<{
  name: ProviderName;
  label: string;
  configured: boolean;
}> {
  return [
    {
      name: 'cloudflare',
      label: 'Cloudflare',
      configured: !!process.env.CLOUDFLARE_API_TOKEN,
    },
    {
      name: 'route53',
      label: 'AWS Route53',
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    },
    {
      name: 'godaddy',
      label: 'GoDaddy',
      configured: !!(process.env.GODADDY_API_KEY && process.env.GODADDY_API_SECRET),
    },
    {
      name: 'digitalocean',
      label: 'DigitalOcean',
      configured: !!process.env.DIGITALOCEAN_API_TOKEN,
    },
    {
      name: 'manual',
      label: 'Manual (Add TXT record yourself)',
      configured: true, // Always available
    },
  ];
}
