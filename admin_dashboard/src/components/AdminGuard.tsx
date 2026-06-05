'use client';

import React, { useState, useEffect } from 'react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#090D16] border border-gray-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
