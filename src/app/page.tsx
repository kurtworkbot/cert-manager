'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, 
  RefreshCw, Plus, Trash2, Settings, Clock,
  Globe, Key, AlertTriangle, LogOut
} from 'lucide-react';

interface Certificate {
  id: number;
  domain: string;
  status: string;
  computed_status: string;
  issued_at: string | null;
  expires_at: string | null;
  challenge_type: string;
  dns_provider: string | null;
  auto_renew: boolean;
  hook_script: string | null;
  days_until_expiry: number | null;
}

export default function Home() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [renewingId, setRenewingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function fetchCertificates() {
    try {
      const res = await fetch('/api/certificates');
      const data = await res.json();
      if (data.success) {
        setCertificates(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenew(id: number) {
    setRenewingId(id);
    try {
      const res = await fetch(`/api/certificates/${id}/renew`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchCertificates();
      } else {
        alert(`Renewal failed: ${data.error}`);
      }
    } catch (error) {
      alert('Renewal failed');
    } finally {
      setRenewingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    
    try {
      await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
      await fetchCertificates();
    } catch (error) {
      alert('Delete failed');
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'valid':
        return <ShieldCheck className="w-6 h-6 text-green-500" />;
      case 'expiring':
        return <ShieldAlert className="w-6 h-6 text-yellow-500" />;
      case 'expired':
        return <ShieldX className="w-6 h-6 text-red-500" />;
      default:
        return <Shield className="w-6 h-6 text-gray-400" />;
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      valid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      expiring: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return styles[status] || styles.pending;
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold text-white">CertManager</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Certificate
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Certificates"
            value={certificates.length}
            icon={<Shield className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Valid"
            value={certificates.filter(c => c.computed_status === 'valid').length}
            icon={<ShieldCheck className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="Expiring Soon"
            value={certificates.filter(c => c.computed_status === 'expiring').length}
            icon={<ShieldAlert className="w-6 h-6" />}
            color="yellow"
          />
          <StatCard
            title="Expired"
            value={certificates.filter(c => c.computed_status === 'expired').length}
            icon={<ShieldX className="w-6 h-6" />}
            color="red"
          />
        </div>

        {/* Certificate List */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Certificates</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : certificates.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No certificates yet. Add your first certificate to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/certificates/${cert.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(cert.computed_status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-medium">{cert.domain}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(cert.computed_status)}`}>
                          {cert.computed_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {cert.challenge_type.toUpperCase()}
                          {cert.dns_provider && ` (${cert.dns_provider})`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {cert.days_until_expiry !== null
                            ? `${cert.days_until_expiry} days left`
                            : 'Not issued'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRenew(cert.id)}
                      disabled={renewingId === cert.id}
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Renew certificate"
                    >
                      <RefreshCw className={`w-5 h-5 ${renewingId === cert.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Delete certificate"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddCertificateModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchCertificates();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={colors[color]}>{icon}</div>
      </div>
    </div>
  );
}

function AddCertificateModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [domain, setDomain] = useState('');
  const [challengeType, setChallengeType] = useState<'http' | 'dns'>('http');
  const [dnsProvider, setDnsProvider] = useState('cloudflare');
  const [hookScript, setHookScript] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [issueNow, setIssueNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          challenge_type: challengeType,
          dns_provider: challengeType === 'dns' ? dnsProvider : null,
          auto_renew: autoRenew,
          hook_script: hookScript || null,
          issue_now: issueNow,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onAdded();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to add certificate');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add Certificate</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Challenge Type</label>
            <select
              value={challengeType}
              onChange={(e) => setChallengeType(e.target.value as 'http' | 'dns')}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="http">HTTP-01</option>
              <option value="dns">DNS-01</option>
            </select>
          </div>

          {challengeType === 'dns' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">DNS Provider</label>
              <select
                value={dnsProvider}
                onChange={(e) => setDnsProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="cloudflare">Cloudflare</option>
                <option value="route53">AWS Route53</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Hook Script (optional)</label>
            <textarea
              value={hookScript}
              onChange={(e) => setHookScript(e.target.value)}
              placeholder="#!/bin/bash&#10;# Deploy certificate to server"
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Available vars: $CERT_DOMAIN, $CERT_CERTIFICATE, $CERT_PRIVATE_KEY
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              Auto-renew
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={issueNow}
                onChange={(e) => setIssueNow(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              Issue immediately
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
