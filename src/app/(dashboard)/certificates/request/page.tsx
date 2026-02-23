'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestCertificatePage() {
  const router = useRouter();
  const [domains, setDomains] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [formData, setFormData] = useState({
    domainId: '',
    providerId: '',
    caProvider: 'letsencrypt',
    challengeType: 'http-01',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [domainsRes, providersRes] = await Promise.all([
        fetch('/api/v1/domains', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/dns-providers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const domainsData = await domainsRes.json();
      const providersData = await providersRes.json();

      setDomains(domainsData.domains || []);
      setProviders(providersData.providers || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to request certificate');
      }

      setSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Request Certificate</h1>
      </div>

      {domains.length === 0 || providers.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please add a domain and DNS provider first before requesting a certificate.
          </p>
          <div className="mt-4 flex gap-4">
            <a href="/domains" className="text-blue-600 hover:underline">→ Add Domain</a>
            <a href="/dns-providers" className="text-blue-600 hover:underline">→ Add DNS Provider</a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded">
                <p className="font-semibold">Certificate requested!</p>
                <p className="text-sm mt-1">{success.message}</p>
                {success.challengeType === 'http-01' && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                    <p className="font-medium">HTTP-01 Challenge:</p>
                    <p className="text-gray-600">Make sure your domain points to this server and is accessible via HTTP.</p>
                  </div>
                )}
                {success.challengeType === 'dns-01' && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                    <p className="font-medium">DNS-01 Challenge:</p>
                    <p className="text-gray-600">Add a TXT record to your DNS:</p>
                    <p className="font-mono mt-1">_acme-challenge.{success.domain}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push('/certificates')}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  View Certificates
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Domain</label>
              <select
                value={formData.domainId}
                onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Select a domain</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">DNS Provider</label>
              <select
                value={formData.providerId}
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Select a provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Certificate Authority</label>
              <select
                value={formData.caProvider}
                onChange={(e) => setFormData({ ...formData, caProvider: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="letsencrypt">Let's Encrypt</option>
                <option value="zerossl">ZeroSSL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Challenge Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="challengeType"
                    value="http-01"
                    checked={formData.challengeType === 'http-01'}
                    onChange={(e) => setFormData({ ...formData, challengeType: e.target.value })}
                  />
                  <span>HTTP-01</span>
                  <span className="text-gray-500 text-sm">(Simple, requires HTTP access)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="challengeType"
                    value="dns-01"
                    checked={formData.challengeType === 'dns-01'}
                    onChange={(e) => setFormData({ ...formData, challengeType: e.target.value })}
                  />
                  <span>DNS-01</span>
                  <span className="text-gray-500 text-sm">(For wildcard certificates)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Requesting...' : 'Request Certificate'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
