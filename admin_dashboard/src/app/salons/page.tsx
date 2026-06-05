'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  owner: { name: string; email: string };
  isVerified: boolean;
  isActive: boolean;
  avgRating: number;
}

export default function AdminSalonsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Salons
  const { data: salons = [], isLoading } = useQuery<Salon[]>({
    queryKey: ['admin-salons'],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/salons', {
          headers: {
            'Authorization': 'Bearer admin_token_placeholder',
          }
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        return json.salons;
      } catch (err) {
        // Fallback Mock Salons
        return [
          {
            id: '101',
            name: 'Luxe Hair & Nail Lounge',
            address: '742 Evergreen Terrace',
            city: 'Springfield',
            owner: { name: 'John Salon Owner', email: 'owner@glowbook.com' },
            isVerified: true,
            isActive: true,
            avgRating: 4.8,
          },
          {
            id: '102',
            name: 'Urban Beard Co.',
            address: '52B Broadway Ave',
            city: 'Springfield',
            owner: { name: 'Mark Barber', email: 'mark@barber.com' },
            isVerified: false,
            isActive: true,
            avgRating: 0.0,
          }
        ];
      }
    },
  });

  // 2. Mutation for status toggle
  const editSalonMutation = useMutation({
    mutationFn: async ({ id, isVerified, isActive }: { id: string; isVerified?: boolean; isActive?: boolean }) => {
      const res = await fetch('http://localhost:3000/api/admin/salons', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin_token_placeholder',
        },
        body: JSON.stringify({ id, isVerified, isActive }),
      });
      if (!res.ok) throw new Error('Failed to update salon');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-salons'] });
    },
    onError: () => {
      alert('Error updating salon. (Check if backend server is active)');
    }
  });

  const toggleVerify = (id: string, currentVal: boolean) => {
    editSalonMutation.mutate({ id, isVerified: !currentVal });
  };

  const toggleActive = (id: string, currentVal: boolean) => {
    editSalonMutation.mutate({ id, isActive: !currentVal });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Salon Management & Verification</h2>
        <p className="text-muted text-sm mt-1">Review new salon sign-ups, grant verification badges, or suspend accounts violating terms.</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/30 text-xs font-bold text-muted uppercase tracking-wider">
              <th className="p-4">Salon Name</th>
              <th className="p-4">Location</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Average Rating</th>
              <th className="p-4">Verification</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm text-gray-200">
            {salons.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted">
                  No salons registered yet.
                </td>
              </tr>
            ) : (
              salons.map((salon) => (
                <tr key={salon.id} className="hover:bg-gray-800/20 transition">
                  <td className="p-4 font-semibold text-white">{salon.name}</td>
                  <td className="p-4 text-muted">{salon.address}, {salon.city}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{salon.owner.name}</p>
                      <p className="text-xs text-muted">{salon.owner.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-amber-400 font-bold">★ {salon.avgRating.toFixed(1)}</span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      salon.isVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/20' : 'bg-amber-950 text-amber-300 border border-amber-500/20'
                    }`}>
                      {salon.isVerified ? 'Verified' : 'Pending Review'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      salon.isActive ? 'bg-gray-800 text-emerald-400' : 'bg-gray-800 text-rose-400'
                    }`}>
                      {salon.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => toggleVerify(salon.id, salon.isVerified)}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        salon.isVerified 
                          ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30' 
                          : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                      }`}
                    >
                      {salon.isVerified ? 'Revoke Verification' : 'Verify Salon'}
                    </button>
                    <button
                      onClick={() => toggleActive(salon.id, salon.isActive)}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        salon.isActive 
                          ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30' 
                          : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                      }`}
                    >
                      {salon.isActive ? 'Suspend' : 'Unsuspend'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
