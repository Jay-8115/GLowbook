import '@/src/app/globals.css';
import React from 'react';
import Providers from '@/src/components/Providers';
import Link from 'next/link';

export const metadata = {
  title: 'GlowBook Admin Dashboard',
  description: 'Enterprise control panel for GlowBook Salon Marketplace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-gray-100 min-h-screen">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-card border-r border-gray-800 flex flex-col justify-between shrink-0">
              <div>
                {/* Logo */}
                <div className="p-6 border-b border-gray-800">
                  <Link href="/" className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-purple-500/20">
                      G
                    </span>
                    <span className="font-extrabold text-xl tracking-tight text-white">
                      Glow<span className="text-primary">Book</span>
                    </span>
                  </Link>
                  <p className="text-[10px] text-muted uppercase tracking-widest mt-1 font-semibold">Admin Engine</p>
                </div>

                {/* Nav Links */}
                <nav className="p-4 space-y-1">
                  <Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition">
                    Dashboard Overview
                  </Link>
                  <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition">
                    User Management
                  </Link>
                  <Link href="/salons" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition">
                    Salon Verification
                  </Link>
                  <Link href="/bookings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition">
                    Bookings Tracking
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition">
                    Platform Settings
                  </Link>
                </nav>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500/30 flex items-center justify-center font-bold text-purple-200">
                    AD
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">GlowBook System</h4>
                    <p className="text-[10px] text-muted font-medium">Administrator</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <header className="h-16 border-b border-gray-800 bg-card/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
                <h1 className="font-bold text-lg text-white">GlowBook Central Administration</h1>
                <div className="flex items-center gap-4 text-xs font-medium text-muted">
                  <span>System status: <span className="text-green-400 font-bold">● Active</span></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
                  <span>Ver: 1.0.0</span>
                </div>
              </header>

              <div className="p-8 flex-1">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
