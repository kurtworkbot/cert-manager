import { useState, useEffect } from 'react';

type Log = {
  id: string;
  event: string;
  details: string;
  timestamp: string;
};

// Mock Data
const MOCK_LOGS: Log[] = [
  { id: '1', event: 'renew_success', details: 'Renewed example.com', timestamp: '2026-02-10T10:00:00Z' },
  { id: '2', event: 'renew_fail', details: 'Failed to renew test.com: DNS challenge failed', timestamp: '2026-02-09T14:30:00Z' },
  { id: '3', event: 'config_change', details: 'Added new provider: Cloudflare', timestamp: '2026-02-08T09:15:00Z' },
  { id: '4', event: 'deploy_success', details: 'Deployed example.com to Nginx', timestamp: '2026-02-10T10:05:00Z' },
];

export default function LogViewer() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    // Simulate fetching logs
    setLogs(MOCK_LOGS);
    
    // Simulate real-time logs
    const interval = setInterval(() => {
        const newLog = {
            id: Date.now().toString(),
            event: 'system_check',
            details: 'Routine health check completed',
            timestamp: new Date().toISOString()
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 shadow rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 h-96 flex flex-col">
      <div className="px-4 py-5 sm:px-6 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg leading-6 font-medium text-zinc-900 dark:text-zinc-100">Audit Logs</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {logs.map((log) => (
          <div key={log.id} className="border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span className={`uppercase font-bold ${
                log.event.includes('fail') || log.event.includes('error') ? 'text-red-500' : 
                log.event.includes('success') ? 'text-green-500' : 'text-blue-500'
              }`}>{log.event}</span>
              <span>{new Date(log.timestamp).toLocaleString()}</span>
            </div>
            <div className="text-zinc-700 dark:text-zinc-300 break-words">
              {log.details}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-center text-zinc-400 py-4">No logs available.</p>}
      </div>
    </div>
  );
}
