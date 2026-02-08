'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, Download, Copy, Eye, EyeOff, Clock, CheckCircle, XCircle,
  Globe, Key, Calendar, FileText
} from 'lucide-react';

interface Certificate {
  id: number;
  domain: string;
  status: string;
  issued_at: string | null;
  expires_at: string | null;
  certificate: string | null;
  private_key: string | null;
  challenge_type: string;
  dns_provider: string | null;
  auto_renew: boolean;
  hook_script: string | null;
  created_at: string;
  updated_at: string;
}

interface HookLog {
  id: number;
  certificate_id: number;
  executed_at: string;
  success: number;
  output: string;
}

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [hookLogs, setHookLogs] = useState<HookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  async function fetchData() {
    try {
      const [certRes, logsRes] = await Promise.all([
        fetch(`/api/certificates/${params.id}`),
        fetch(`/api/certificates/${params.id}/hooks`),
      ]);
      
      const certData = await certRes.json();
      const logsData = await logsRes.json();
      
      if (certData.success) setCert(certData.data);
      if (logsData.success) setHookLogs(logsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenew() {
    if (!cert) return;
    setRenewLoading(true);
    try {
      const res = await fetch(`/api/certificates/${cert.id}/renew`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(`Renewal failed: ${data.error}`);
      }
    } finally {
      setRenewLoading(false);
    }
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'valid': return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case 'expiring': return <ShieldAlert className="w-8 h-8 text-yellow-500" />;
      case 'expired': return <ShieldX className="w-8 h-8 text-red-500" />;
      default: return <Shield className="w-8 h-8 text-gray-400" />;
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-TW');
  }

  function getDaysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Certificate not found</div>
      </div>
    );
  }

  const daysLeft = getDaysUntilExpiry(cert.expires_at);
  const computedStatus = !cert.expires_at ? 'pending' 
    : daysLeft !== null && daysLeft < 0 ? 'expired'
    : daysLeft !== null && daysLeft < 30 ? 'expiring'
    : 'valid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <button
            onClick={handleRenew}
            disabled={renewLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${renewLoading ? 'animate-spin' : ''}`} />
            {renewLoading ? 'Renewing...' : 'Renew Certificate'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Certificate Info Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-start gap-4">
            {getStatusIcon(computedStatus)}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-slate-400" />
                {cert.domain}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Key className="w-4 h-4" />
                  {cert.challenge_type.toUpperCase()}
                  {cert.dns_provider && ` (${cert.dns_provider})`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Issued: {formatDate(cert.issued_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Expires: {formatDate(cert.expires_at)}
                  {daysLeft !== null && (
                    <span className={`ml-1 ${daysLeft < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                      ({daysLeft} days)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Content */}
        {cert.certificate && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Certificate (PEM)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(cert.certificate!, 'cert')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied === 'cert' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => downloadFile(cert.certificate!, `${cert.domain}.crt`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  .crt
                </button>
              </div>
            </div>
            <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono bg-slate-900/50 max-h-64 overflow-y-auto">
              {cert.certificate}
            </pre>
          </div>
        )}

        {/* Private Key */}
        {cert.private_key && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5" />
                Private Key (PEM)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors"
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPrivateKey ? 'Hide' : 'Show'}
                </button>
                {showPrivateKey && (
                  <>
                    <button
                      onClick={() => copyToClipboard(cert.private_key!, 'key')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {copied === 'key' ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => downloadFile(cert.private_key!, `${cert.domain}.key`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      .key
                    </button>
                  </>
                )}
              </div>
            </div>
            {showPrivateKey ? (
              <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono bg-slate-900/50 max-h-64 overflow-y-auto">
                {cert.private_key}
              </pre>
            ) : (
              <div className="p-4 text-center text-slate-500">
                Click "Show" to reveal the private key
              </div>
            )}
          </div>
        )}

        {/* Hook Logs */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Hook Execution History</h2>
          </div>
          {hookLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hook executions yet
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {hookLogs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {formatDate(log.executed_at)}
                    </span>
                  </div>
                  {log.output && (
                    <pre className="mt-2 p-2 text-xs text-slate-400 bg-slate-900/50 rounded overflow-x-auto">
                      {log.output}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
