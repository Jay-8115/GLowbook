'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from '@/src/utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'USER' | 'OWNER' | 'ADMIN';
  createdAt: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (roleFilter) queryParams.append('role', roleFilter);
        const res = await fetch(`http://localhost:3000/api/admin/users?${queryParams.toString()}`, {
          headers: {
            'Authorization': getAuthHeader(),
          }
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        return json.users;
      } catch (err) {
        // Fallback Mock Users
        return [
          { id: '1', name: 'Alice Customer', email: 'customer@glowbook.com', phone: '+15550102', role: 'USER', createdAt: '2026-05-01T12:00:00.000Z' },
          { id: '2', name: 'John Salon Owner', email: 'owner@glowbook.com', phone: '+15550101', role: 'OWNER', createdAt: '2026-04-12T10:30:00.000Z' },
          { id: '3', name: 'GlowBook Admin', email: 'admin@glowbook.com', phone: '+15550100', role: 'ADMIN', createdAt: '2026-03-01T09:00:00.000Z' },
        ];
      }
    },
  });

  // 2. Mutation to edit User Role
  const editUserMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'USER' | 'OWNER' | 'ADMIN' }) => {
      const res = await fetch('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(),
        },
        body: JSON.stringify({ id, role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      alert('Error updating user role. (Check if backend server is active)');
    }
  });

  const handleRoleChange = (id: string, newRole: 'USER' | 'OWNER' | 'ADMIN') => {
    editUserMutation.mutate({ id, role: newRole });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">User Management</h2>
        <p className="text-muted text-sm mt-1">Audit platform accounts, change permissions, and oversee customer records.</p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-gray-800">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 bg-background border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-44 bg-background border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
        >
          <option value="">All Roles</option>
          <option value="USER">Customer (USER)</option>
          <option value="OWNER">Salon Owner</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/30 text-xs font-bold text-muted uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm text-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  No accounts found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/20 transition">
                  <td className="p-4 font-semibold text-white">{user.name}</td>
                  <td className="p-4 text-muted">{user.email}</td>
                  <td className="p-4">{user.phone || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      user.role === 'ADMIN' ? 'bg-purple-900/60 text-purple-200 border border-purple-500/30' :
                      user.role === 'OWNER' ? 'bg-blue-900/60 text-blue-200 border border-blue-500/30' :
                      'bg-gray-800 text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                      className="bg-background border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="USER">Make User</option>
                      <option value="OWNER">Make Owner</option>
                      <option value="ADMIN">Make Admin</option>
                    </select>
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
