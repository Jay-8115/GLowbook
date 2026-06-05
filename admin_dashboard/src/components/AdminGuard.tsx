'use client';

import React, { useState, useEffect } from 'react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(localStorage.getItem('admin_token'));
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      if (data.user?.role !== 'ADMIN') {
        throw new Error('Access Denied: Only administrators can access this portal.');
      }

      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('admin_name', data.user.name);
      setToken(data.accessToken);
    } catch (err: any) {
      setError(err.message || 'Network error, please check if your backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-gray-400">
        Loading admin workspace...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#111827]/80 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <span className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-purple-500/20 mb-3">
              G
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Glow<span className="text-purple-500">Book</span> Admin
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1.5 font-bold">Secure Management Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 p-4 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username or Email</label>
              <input
                type="text"
                required
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#090D16] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#090D16] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-800/60 pt-6">
            <p className="text-[11px] text-gray-600 font-semibold tracking-wider uppercase">Default Seed Credentials</p>
            <div className="mt-2 inline-flex gap-4 text-[10px] text-gray-500 bg-[#090D16] border border-gray-800/40 px-3 py-1.5 rounded-lg">
              <span>User: <strong className="text-gray-400">admin</strong></span>
              <span>Pass: <strong className="text-gray-400">admin123</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
