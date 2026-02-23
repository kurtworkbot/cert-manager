import { useState } from 'react';

type ProviderType = 'duckdns' | 'cloudflare' | 'route53' | 'digitalocean';

export default function ProviderConfig() {
  const [providerType, setProviderType] = useState<ProviderType>('duckdns');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Provider added:', { name, type: providerType, token });
    alert('Provider configuration saved!');
    setName('');
    setToken('');
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <div className="px-4 py-5 sm:px-6 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg leading-6 font-medium text-zinc-900 dark:text-zinc-100">Provider Configuration</h3>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Provider Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="My DuckDNS"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Provider Type</label>
            <select
              id="type"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
              className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              <option value="duckdns">DuckDNS</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="route53">AWS Route53</option>
              <option value="digitalocean">DigitalOcean</option>
            </select>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">API Token / Secret</label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="••••••••••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
