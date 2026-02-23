import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For now, check if logged in by looking for cookie (simplified)
  // In production, use proper auth check
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">CertManager</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-800">
            📊 Dashboard
          </Link>
          <Link href="/domains" className="block px-4 py-2 rounded hover:bg-gray-800">
            📁 Domains
          </Link>
          <Link href="/certificates" className="block px-4 py-2 rounded hover:bg-gray-800">
            📜 Certificates
          </Link>
          <Link href="/dns-providers" className="block px-4 py-2 rounded hover:bg-gray-800">
            🌐 DNS Providers
          </Link>
          <Link href="/users" className="block px-4 py-2 rounded hover:bg-gray-800">
            👥 Users
          </Link>
          <Link href="/settings" className="block px-4 py-2 rounded hover:bg-gray-800">
            ⚙️ Settings
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
          <Link href="/api/v1/auth/logout" className="block px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-center">
            🚪 Logout
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
