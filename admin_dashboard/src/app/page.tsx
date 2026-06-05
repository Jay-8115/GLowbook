'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface Stats {
  totalUsers: number;
  totalOwners: number;
  totalSalons: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Fetch stats from local backend API or fall back to mock data
      try {
        const res = await fetch('http://localhost:3000/api/admin/stats', {
          headers: {
            'Authorization': 'Bearer admin_token_placeholder', // mock/developer testing
          }
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        return json.stats;
      } catch (err) {
        // Fallback mock stats for visual demonstration if backend isn't up
        return {
          totalUsers: 1250,
          totalOwners: 84,
          totalSalons: 92,
          totalBookings: 8432,
          pendingBookings: 43,
          completedBookings: 8120,
          cancelledBookings: 269,
          totalRevenue: 295120.5,
        };
      }
    },
    initialData: {
      totalUsers: 1250,
      totalOwners: 84,
      totalSalons: 92,
      totalBookings: 8432,
      pendingBookings: 43,
      completedBookings: 8120,
      cancelledBookings: 269,
      totalRevenue: 295120.5,
    }
  });

  return (
    <div className="space-y-8">
      {/* Welcome Block */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Platform Overview</h2>
        <p className="text-muted text-sm mt-1">Real-time business health monitoring and marketplace activities.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="glow-card p-6 rounded-2xl bg-card">
          <p className="text-muted text-xs font-semibold uppercase tracking-wider">Total GMV Revenue</p>
          <h3 className="text-3xl font-extrabold text-white mt-2">${stats.totalRevenue.toLocaleString()}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400">
            <span>+18.4%</span>
            <span className="text-muted font-normal text-[10px]">from last month</span>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="glow-card p-6 rounded-2xl bg-card">
          <p className="text-muted text-xs font-semibold uppercase tracking-wider">Total Appointments</p>
          <h3 className="text-3xl font-extrabold text-white mt-2">{stats.totalBookings.toLocaleString()}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400">
            <span>+12.1%</span>
            <span className="text-muted font-normal text-[10px]">from last week</span>
          </div>
        </div>

        {/* Total Salons */}
        <div className="glow-card p-6 rounded-2xl bg-card">
          <p className="text-muted text-xs font-semibold uppercase tracking-wider">Registered Vendors</p>
          <h3 className="text-3xl font-extrabold text-white mt-2">{stats.totalSalons}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400">
            <span>+4 new</span>
            <span className="text-muted font-normal text-[10px]">this week</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="glow-card p-6 rounded-2xl bg-card">
          <p className="text-muted text-xs font-semibold uppercase tracking-wider">Active Customers</p>
          <h3 className="text-3xl font-extrabold text-white mt-2">{stats.totalUsers.toLocaleString()}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-purple-400">
            <span>{stats.totalOwners} Salon Owners</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glow-card p-6 rounded-2xl bg-card flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="font-bold text-white text-base">Monthly Volume Chart</h4>
            <p className="text-xs text-muted">Booking order distributions and commission earnings.</p>
          </div>
          {/* Custom responsive CSS chart bars (extremely safe and robust fallback for charts) */}
          <div className="h-44 flex items-end gap-3 pt-6">
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-purple-950/40 rounded-t-lg h-24 relative overflow-hidden group">
                <div className="absolute bottom-0 w-full bg-primary h-12 rounded-t-lg transition-all group-hover:bg-primary-hover"></div>
              </div>
              <span className="text-[10px] text-muted font-semibold">Jan</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-purple-950/40 rounded-t-lg h-28 relative overflow-hidden group">
                <div className="absolute bottom-0 w-full bg-primary h-16 rounded-t-lg transition-all group-hover:bg-primary-hover"></div>
              </div>
              <span className="text-[10px] text-muted font-semibold">Feb</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-purple-950/40 rounded-t-lg h-32 relative overflow-hidden group">
                <div className="absolute bottom-0 w-full bg-primary h-24 rounded-t-lg transition-all group-hover:bg-primary-hover"></div>
              </div>
              <span className="text-[10px] text-muted font-semibold">Mar</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-purple-950/40 rounded-t-lg h-36 relative overflow-hidden group">
                <div className="absolute bottom-0 w-full bg-primary h-30 rounded-t-lg transition-all group-hover:bg-primary-hover"></div>
              </div>
              <span className="text-[10px] text-muted font-semibold">Apr</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-purple-950/40 rounded-t-lg h-40 relative overflow-hidden group">
                <div className="absolute bottom-0 w-full bg-primary h-36 rounded-t-lg transition-all group-hover:bg-primary-hover"></div>
              </div>
              <span className="text-[10px] text-muted font-semibold">May</span>
            </div>
          </div>
        </div>

        {/* Appointment Status Pie list */}
        <div className="glow-card p-6 rounded-2xl bg-card flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-base">Booking Funnel</h4>
            <p className="text-xs text-muted">Analysis of booking statuses across the platform.</p>
          </div>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Completed Appointments</span>
                <span className="text-emerald-400">{stats.completedBookings}</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Active/Pending requests</span>
                <span className="text-amber-400">{stats.pendingBookings}</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Cancelled / Rejected</span>
                <span className="text-rose-400">{stats.cancelledBookings}</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '3%' }}></div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted leading-relaxed font-medium">
            Booking fulfillment rate: <span className="text-emerald-400 font-bold">96.3%</span>. Average vendor payout takes 24 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
