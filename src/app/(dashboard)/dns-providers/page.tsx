'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DNSProvidersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'cloudflare', config: {} });
  const [configInput, setConfigInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/v1/dns-providers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch providers');
      }

      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let config = {};
      try {
        config = JSON.parse(configInput || '{}');
      } catch {
        alert('Invalid JSON in config');
        setSaving(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/dns-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, config }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || 'Failed to create provider');
        return;
      }

      setFormData({ name: '', type: 'cloudflare', config: {} });
      setConfigInput('');
      setShowForm(false);
      fetchProviders();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this provider?')) return;

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/dns-providers?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProviders();
    } catch (err) {
      console.error('Error:', err);
    }
  }

  const providerTypes = [
    { value: 'cloudflare', label: 'Cloudflare' },
    { value: 'route53', label: 'AWS Route53' },
    { value: 'digitalocean', label: 'DigitalOcean' },
    { value: 'duckdns', label: 'DuckDNS' },
    { value: 'godaddy', label: 'GoDaddy' },
    { value: 'namecheap', label: 'Namecheap' },
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">DNS Providers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Provider'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-4">Add New DNS Provider</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Cloudflare"
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                {providerTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Config (JSON)</label>
              <textarea
                value={configInput}
                onChange={(e) => setConfigInput(e.target.value)}
                placeholder='{"apiToken": "your-token"}'
                className="w-full px-3 py-2 border rounded font-mono text-sm"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example for Cloudflare: {`{"apiToken": "your-cloudflare-token"}`}
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Provider'}
            </button>
          </form>
        </div>
      )}

      {providers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No DNS providers yet. Add your first provider to enable certificate requests.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <span className="text-sm text-gray-500">{provider.type}</span>
                </div>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
