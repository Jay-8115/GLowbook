'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader, API_URL } from '@/src/utils/api';

interface SalonRegistration {
  id: string;
  ownerName: string;
  email: string;
  phone: string;
  salonName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  coverImage: string;
  galleryImages: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
}

export default function SalonRequestsWorkflowPage() {
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState<SalonRegistration | null>(null);
  const [rejectingReq, setRejectingReq] = useState<SalonRegistration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [credentialsModal, setCredentialsModal] = useState<{
    ownerName: string;
    email: string;
    pass: string;
  } | null>(null);

  // 1. Query salon requests
  const { data: requests = [], isLoading, error } = useQuery<SalonRegistration[]>({
    queryKey: ['admin-salon-requests'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/salon-requests`, {
        headers: {
          'Authorization': getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error('Failed to load salon requests');
      const json = await res.json();
      return json.requests;
    },
  });

  // 2. Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/admin/salon-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve request');
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-salon-requests'] });
      // Find the approved request to show name
      const reqRecord = requests.find((r) => r.id === variables);
      setCredentialsModal({
        ownerName: reqRecord?.ownerName || 'Owner',
        email: data.credentials.username,
        pass: data.credentials.temporaryPassword,
      });
      setSelectedReq(null);
    },
    onError: (err: any) => {
      alert(`Approval error: ${err.message}`);
    },
  });

  // 3. Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`${API_URL}/api/admin/salon-requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(),
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-salon-requests'] });
      setRejectingReq(null);
      setRejectionReason('');
      setSelectedReq(null);
    },
    onError: (err: any) => {
      alert(`Rejection error: ${err.message}`);
    },
  });

  const handleApprove = (id: string) => {
    if (confirm('Are you sure you want to approve this salon request? This will create an owner account and a salon record.')) {
      approveMutation.mutate(id);
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    if (rejectingReq) {
      rejectMutation.mutate({ id: rejectingReq.id, reason: rejectionReason });
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Salon Approval Workflow</h2>
        <p className="text-gray-400 text-sm mt-1">
          Review salon registration applications, check coordinates, verify cover images, and approve or reject submissions.
        </p>
      </div>

      {/* Main Grid: Requests List vs Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Requests List */}
        <div className="lg:col-span-2 bg-[#111827]/80 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[600px]">
          <div className="p-5 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
            <h3 className="font-bold text-white text-md">Registration Queue</h3>
            <span className="bg-purple-950 text-purple-300 text-xs px-2.5 py-1 rounded-full font-bold border border-purple-500/20">
              {requests.filter(r => r.status === 'pending').length} Pending
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading registrations...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-400">Failed to load registration queue.</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No applications registered yet.</div>
            ) : (
              requests.map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => setSelectedReq(reg)}
                  className={`p-5 flex justify-between items-center cursor-pointer transition ${
                    selectedReq?.id === reg.id ? 'bg-purple-900/20 border-l-4 border-purple-500' : 'hover:bg-gray-800/20'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">{reg.salonName}</h4>
                    <p className="text-xs text-gray-400">Owner: {reg.ownerName} &bull; {reg.email}</p>
                    <p className="text-xs text-gray-500">{reg.city}, {reg.state} &bull; {new Date(reg.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      reg.status === 'pending'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                        : reg.status === 'approved'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                    }`}>
                      {reg.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="bg-[#111827]/80 border border-gray-800 rounded-2xl p-6 shadow-xl h-[600px] flex flex-col justify-between overflow-y-auto">
          {selectedReq ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Selected Salon Application</span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedReq.salonName}</h3>
                  <p className="text-xs text-gray-400 italic mt-1">&ldquo;{selectedReq.description}&rdquo;</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Details</h4>
                  <div className="grid grid-cols-2 gap-3 bg-gray-900/30 p-3.5 rounded-xl border border-gray-800 text-xs">
                    <div>
                      <p className="text-gray-500 font-medium">Owner</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Phone</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 font-medium">Email Address</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 font-medium">Address</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.address}, {selectedReq.city}, {selectedReq.state}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Latitude</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.latitude}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Longitude</p>
                      <p className="font-bold text-white mt-0.5">{selectedReq.longitude}</p>
                    </div>
                  </div>
                </div>

                {/* Documents / Images Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gallery & Documents</h4>
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    <a href={selectedReq.coverImage} target="_blank" rel="noreferrer" className="relative w-16 h-16 rounded-lg overflow-hidden border border-purple-500/30 shrink-0 group">
                      <img src={selectedReq.coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-110 transition" />
                      <span className="absolute bottom-0 inset-x-0 bg-purple-950/80 text-[8px] text-center font-bold text-purple-200 py-0.5">Cover</span>
                    </a>
                    {selectedReq.galleryImages.map((imgUrl, i) => (
                      <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-800 shrink-0 group">
                        <img src={imgUrl} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition" />
                        <span className="absolute bottom-0 inset-x-0 bg-gray-950/80 text-[8px] text-center font-bold text-gray-200 py-0.5">Doc {i+1}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Map Location Link */}
                <div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedReq.latitude},${selectedReq.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    📍 Open coordinates in Google Maps
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedReq.status === 'pending' ? (
                <div className="flex gap-3 pt-6 border-t border-gray-800 shrink-0">
                  <button
                    onClick={() => handleApprove(selectedReq.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/10"
                  >
                    Approve Application
                  </button>
                  <button
                    onClick={() => setRejectingReq(selectedReq)}
                    className="flex-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white py-2.5 rounded-xl text-xs font-bold border border-rose-500/20 transition"
                  >
                    Reject Application
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-800 text-xs text-gray-400 shrink-0">
                  {selectedReq.status === 'approved' ? (
                    <div className="bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl text-emerald-400 font-bold">
                      ✓ This salon was approved. User account & salon records are active.
                    </div>
                  ) : (
                    <div className="bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl text-rose-400 font-bold">
                      ✗ This salon was rejected. Reason: {selectedReq.rejectionReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-sm">
              Select an application from the queue to view documents, coordinates, and execute decisions.
            </div>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Salon Application</h3>
            <p className="text-xs text-gray-400">Specify why the registration request for &quot;{rejectingReq.salonName}&quot; is rejected. An email will be dispatched to the owner.</p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Reason (e.g. Invalid document scans, invalid phone number)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 transition"
              />
              <div className="flex justify-end gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111827] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <span className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center text-xl font-bold mx-auto border border-emerald-500/20">
              ✓
            </span>
            <h3 className="text-lg font-bold text-white">Salon Approved Successfully!</h3>
            <p className="text-xs text-gray-400">Account credentials generated for owner <strong>{credentialsModal.ownerName}</strong>.</p>

            <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 text-left space-y-2.5 text-xs">
              <div>
                <span className="text-gray-500">Username/Email</span>
                <p className="font-mono font-bold text-white mt-0.5 select-all">{credentialsModal.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Temporary Password</span>
                <p className="font-mono font-bold text-emerald-400 mt-0.5 select-all">{credentialsModal.pass}</p>
              </div>
            </div>

            <p className="text-[10px] text-gray-500">An email notification has been dispatched to the owner. You can copy these credentials for verification.</p>

            <button
              onClick={() => setCredentialsModal(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
