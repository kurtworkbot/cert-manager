'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDomains: 0,
    totalCertificates: 0,
    expiringSoon: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        // Fetch domains
        const domainsRes = await fetch('/api/v1/domains', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const domainsData = await domainsRes.json();

        // Fetch certificates
        const certsRes = await fetch('/api/v1/certificates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const certsData = await certsRes.json();

        const certs = certsData.certificates || [];
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringSoon = certs.filter((c: any) => {
          if (!c.expiresAt) return false;
          const expiry = new Date(c.expiresAt);
          return expiry <= thirtyDaysFromNow && expiry > now;
        }).length;

        setStats({
          totalDomains: (domainsData.domains || []).length,
          totalCertificates: certs.length,
          expiringSoon,
          active: certs.filter((c: any) => c.status === 'active').length,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Total Domains</div>
          <div className="text-3xl font-bold">{stats.totalDomains}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Total Certificates</div>
          <div className="text-3xl font-bold">{stats.totalCertificates}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Active Certificates</div>
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Expiring Soon (30 days)</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.expiringSoon}</div>
        </div>
      </div>

      {stats.expiringSoon > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-yellow-800">⚠️ Certificates Expiring Soon</h2>
          <p className="text-yellow-700">
            You have {stats.expiringSoon} certificate(s) expiring within 30 days.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <a href="/domains" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + Add Domain
          </a>
          <a href="/certificates" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            + Request Certificate
          </a>
          <a href="/dns-providers" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            + Add DNS Provider
          </a>
        </div>
      </div>
    </div>
  );
}
