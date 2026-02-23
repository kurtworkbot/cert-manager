'use client';

import CertificateList from '@/components/CertificateList';
import LogViewer from '@/components/LogViewer';
import ProviderConfig from '@/components/ProviderConfig';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">CertManager Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <CertificateList />
            </section>
            
            <section>
              <LogViewer />
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-8">
            <section>
              <ProviderConfig />
            </section>
            
            {/* Health Status Widget (Bonus/Placeholder) */}
            <div className="bg-white dark:bg-zinc-900 shadow rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">System Health</h3>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Scheduler Running</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Database Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
