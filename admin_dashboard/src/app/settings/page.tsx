'use client';

import React, { useState } from 'react';

export default function AdminSettingsPage() {
  const [commission, setCommission] = useState(10.0);
  const [minPayout, setMinPayout] = useState(20.0);
  const [sandbox, setSandbox] = useState(true);
  const [fcmKey, setFcmKey] = useState('glowbook-fcm-project-server-auth-mock-id');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings updated successfully. (Note: These configurations are applied to runtime payouts).');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Platform Configuration</h2>
        <p className="text-muted text-sm mt-1">Configure commission rules, notification keys, and runtime parameters.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-gray-800 rounded-xl p-6 space-y-6 shadow-2xl">
        {/* Commission Settings */}
        <div>
          <h3 className="font-bold text-white text-base border-b border-gray-800 pb-2 mb-4">Financial & Commission splits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Marketplace Commission Fee (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commission}
                onChange={(e) => setCommission(parseFloat(e.target.value))}
                className="w-full bg-background border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-muted mt-1">Percentage split kept by GlowBook platform on booking checkout.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Minimum Payout threshold ($)</label>
              <input
                type="number"
                min="1"
                value={minPayout}
                onChange={(e) => setMinPayout(parseFloat(e.target.value))}
                className="w-full bg-background border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-muted mt-1">Minimum wallet balance needed before owners can request withdrawal.</p>
            </div>
          </div>
        </div>

        {/* Security / System modes */}
        <div>
          <h3 className="font-bold text-white text-base border-b border-gray-800 pb-2 mb-4">Integrations & Messaging</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Firebase Cloud Messaging Key</label>
              <input
                type="text"
                value={fcmKey}
                onChange={(e) => setFcmKey(e.target.value)}
                className="w-full bg-background border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="sandbox"
                checked={sandbox}
                onChange={(e) => setSandbox(e.target.checked)}
                className="w-4 h-4 rounded border-gray-800 bg-background text-primary focus:ring-primary"
              />
              <label htmlFor="sandbox" className="text-sm font-semibold text-gray-200">Enable Sandbox Gateway Simulation (Stripe & Razorpay)</label>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-gray-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-purple-500/20 transition-all"
          >
            Save Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
