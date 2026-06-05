'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from '@/src/utils/api';

interface Booking {
  id: string;
  user: { name: string; email: string; phone?: string };
  salon: { name: string };
  service: { name: string };
  staff: { name: string };
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalPrice: number;
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Bookings
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      try {
        const res = await fetch('https://g-lowbook.vercel.app/api/admin/bookings', {
          headers: {
            'Authorization': getAuthHeader(),
          }
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        return json.bookings;
      } catch (err) {
        // Fallback Mock Bookings
        return [
          {
            id: 'b-001',
            user: { name: 'Alice Customer', email: 'customer@glowbook.com', phone: '+15550102' },
            salon: { name: 'Luxe Hair & Nail Lounge' },
            service: { name: 'Gel Manicure & Polish' },
            staff: { name: 'Sarah Connor' },
            bookingDate: '2026-06-05T00:00:00.000Z',
            startTime: '10:30',
            endTime: '11:15',
            status: 'PENDING',
            totalPrice: 42.75,
          },
          {
            id: 'b-002',
            user: { name: 'Bob Smith', email: 'bob@example.com', phone: '+15550222' },
            salon: { name: 'Luxe Hair & Nail Lounge' },
            service: { name: 'Signature Men\'s Haircut' },
            staff: { name: 'David Beckham' },
            bookingDate: '2026-06-04T00:00:00.000Z',
            startTime: '14:00',
            endTime: '14:30',
            status: 'COMPLETED',
            totalPrice: 31.50,
          }
        ];
      }
    },
  });

  // 2. Mutation for status transition
  const editStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('https://g-lowbook.vercel.app/api/admin/bookings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(),
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to update booking status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: () => {
      alert('Error updating status. (Check if backend server is active)');
    }
  });

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      editStatusMutation.mutate({ id, status: 'CANCELLED' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Marketplace Bookings</h2>
        <p className="text-muted text-sm mt-1">Monitor scheduled salon visits, view payment status, and intervene in disputes.</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/30 text-xs font-bold text-muted uppercase tracking-wider">
              <th className="p-4">Booking ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Salon / Service</th>
              <th className="p-4">Staff Assigned</th>
              <th className="p-4">Scheduled Slot</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm text-gray-200">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  No bookings found in database logs.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-800/20 transition">
                  <td className="p-4 text-xs font-mono text-muted">#{booking.id.substring(0, 8)}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-white">{booking.user.name}</p>
                      <p className="text-xs text-muted">{booking.user.phone || booking.user.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{booking.salon.name}</p>
                      <p className="text-xs text-purple-400">{booking.service.name}</p>
                    </div>
                  </td>
                  <td className="p-4 text-muted">{booking.staff.name}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{new Date(booking.bookingDate).toLocaleDateString()}</p>
                      <p className="text-xs text-muted">{booking.startTime} - {booking.endTime}</p>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-white">${booking.totalPrice.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      booking.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/20' :
                      booking.status === 'ACCEPTED' ? 'bg-blue-950 text-blue-300 border border-blue-500/20' :
                      booking.status === 'IN_PROGRESS' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/20' :
                      booking.status === 'PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-500/20' :
                      'bg-rose-950 text-rose-300 border border-rose-500/20'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition"
                      >
                        Cancel Booking
                      </button>
                    )}
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
