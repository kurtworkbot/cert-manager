import { useState } from 'react';

type Certificate = {
  id: string;
  domain: string;
  status: 'active' | 'expired' | 'error';
  expires_at: string;
};

// Mock Data
const MOCK_CERTIFICATES: Certificate[] = [
  { id: '1', domain: 'example.com', status: 'active', expires_at: '2026-03-01T00:00:00Z' },
  { id: '2', domain: 'test.com', status: 'expired', expires_at: '2026-01-15T00:00:00Z' },
  { id: '3', domain: 'my-app.dev', status: 'error', expires_at: '2026-02-20T00:00:00Z' },
];

export default function CertificateList() {
  const [certs, setCerts] = useState<Certificate[]>(MOCK_CERTIFICATES);
  const [loading, setLoading] = useState<string | null>(null);

  const handleRenew = async (id: string) => {
    setLoading(id);
    console.log(`Renewing certificate ${id}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Optimistic update
    setCerts(certs.map(c => c.id === id ? { ...c, status: 'active', expires_at: '2026-05-01T00:00:00Z' } : c));
    setLoading(null);
    alert(`Certificate ${id} renewed!`);
  };

  const handleDeploy = async (id: string) => {
    setLoading(id);
    console.log(`Deploying certificate ${id}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(null);
    alert(`Certificate ${id} deployed!`);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <div className="px-4 py-5 sm:px-6 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg leading-6 font-medium text-zinc-900 dark:text-zinc-100">Certificates</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Domain</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Expires</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
            {certs.map((cert) => (
              <tr key={cert.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{cert.domain}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    cert.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    cert.status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {cert.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(cert.expires_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleRenew(cert.id)}
                    disabled={loading === cert.id}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 disabled:opacity-50"
                  >
                    {loading === cert.id ? 'Processing...' : 'Renew'}
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <button
                    onClick={() => handleDeploy(cert.id)}
                    disabled={loading === cert.id}
                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                  >
                    Deploy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
