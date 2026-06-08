'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeader } from '@/src/utils/api';
import { io, Socket } from 'socket.io-client';
import {
  LayoutDashboard,
  CalendarDays,
  FileClock,
  CirclePercent,
  Users,
  BrainCircuit,
  Package,
  Bell,
  CheckCircle,
  TrendingUp,
  XCircle,
  Clock,
  DollarSign,
  Star,
  Users2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Filter,
  Check
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface Service {
  id: string;
  salonId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  isPopular?: boolean;
  durationMinutes: number;
  categoryId: string;
  category?: { name: string };
  imageUrl: string | null;
  isActive: boolean;
}

interface Booking {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  notes: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  staffName: string;
  staffRole?: string;
}

interface Salon {
  id: string;
  name: string;
  imageUrl: string;
  city: string;
}

interface OwnerNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function SalonDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'bookings' | 'history' | 'revenue' | 'customers' | 'insights' | 'notifications' | 'staff'>('overview');
  
  // Salon Outlet Selector
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

  // History Filter tab
  const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'last_7' | 'last_30' | 'this_month'>('this_month');

  // Modals state
  const [serviceModal, setServiceModal] = useState<{
    type: 'add' | 'edit';
    service?: Service;
  } | null>(null);

  // Form Fields for Services
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formPrice, setFormPrice] = useState(100);
  const [formDiscountPrice, setFormDiscountPrice] = useState<number | ''>('');
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Bulk operation lists
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Socket Connection for Real-time Updates
  useEffect(() => {
    let socket: Socket | null = null;

    const initSocket = async () => {
      try {
        await fetch(`${API_URL}/api/socket`);

        socket = io(API_URL, {
          path: '/api/socket',
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          console.log('[Socket] Joined owner room...');
          // Join both salon specific and general owner rooms
          if (selectedSalonId) {
            socket?.emit('join_room', `salon:${selectedSalonId}`);
          }
        });

        const handleRealtimeBooking = (booking: any) => {
          console.log('[Socket] Booking update received!');
          queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['owner-bookings-history'] });
          queryClient.invalidateQueries({ queryKey: ['owner-insights'] });
          queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
        };

        const handleRealtimeApproval = (payload: any) => {
          console.log('[Socket] Salon approved event!');
          queryClient.invalidateQueries({ queryKey: ['owner-profile'] });
          alert(`Congratulations! Your salon "${payload.salonName}" has been approved by the admin!`);
        };

        socket.on('booking_created', handleRealtimeBooking);
        socket.on('booking_confirmed', handleRealtimeBooking);
        socket.on('booking_rejected', handleRealtimeBooking);
        socket.on('booking_cancelled', handleRealtimeBooking);
        socket.on('booking_completed', handleRealtimeBooking);
        socket.on('review_added', handleRealtimeBooking);
        socket.on('review_received', handleRealtimeBooking);
        socket.on('salon_approved', handleRealtimeApproval);

      } catch (err) {
        console.error('Socket init error:', err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedSalonId]);

  // 1. Fetch Owner Profile Status
  const { data: profile } = useQuery({
    queryKey: ['owner-profile'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/profile`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });

  // 2. Fetch Owner Salons (Outlets)
  const { data: salonsData, isLoading: salonsLoading } = useQuery<{ salons: Salon[] }>({
    queryKey: ['my-salons'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/salons/my`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });
  const salons = salonsData?.salons || [];

  // Set first salon as active automatically
  useEffect(() => {
    if (salons.length > 0 && !selectedSalonId) {
      setSelectedSalonId(salons[0].id);
    }
  }, [salons]);

  // 3. Fetch Dashboard Aggregate Metrics
  const { data: dashboardData } = useQuery({
    queryKey: ['owner-dashboard', selectedSalonId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/dashboard`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });
  const metrics = dashboardData?.metrics || {};

  // 4. Fetch Services list
  const { data: servicesData, isLoading: servicesLoading } = useQuery<{ services: Service[] }>({
    queryKey: ['salon-services', selectedSalonId],
    queryFn: async () => {
      if (!selectedSalonId) return { services: [] };
      const res = await fetch(`${API_URL}/api/salons/${selectedSalonId}/services`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId,
  });
  const services = servicesData?.services || [];

  // 5. Fetch Active Bookings
  const { data: activeBookingsData, isLoading: activeBookingsLoading } = useQuery<{ bookings: Booking[] }>({
    queryKey: ['owner-bookings', selectedSalonId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/bookings`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });
  const activeBookings = activeBookingsData?.bookings || [];

  // 6. Fetch Booking History
  const { data: historyBookingsData } = useQuery<{ bookings: Booking[], statistics: any }>({
    queryKey: ['owner-bookings-history', selectedSalonId, historyFilter],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/bookings/history?filter=${historyFilter}`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });
  const historyBookings = historyBookingsData?.bookings || [];
  const historyStats = historyBookingsData?.statistics || {};

  // 7. Fetch Revenue Detailed Analytics
  const { data: revenueData } = useQuery({
    queryKey: ['owner-revenue', selectedSalonId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/revenue`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });

  // 8. Fetch Customer Details
  const { data: customersData } = useQuery<{ customers: any[] }>({
    queryKey: ['owner-customers', selectedSalonId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/customers`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });
  const customers = customersData?.customers || [];

  // 9. Fetch Insights
  const { data: insights } = useQuery({
    queryKey: ['owner-insights', selectedSalonId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/insights`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId
  });

  // 10. Fetch Notifications
  const { data: notificationsData } = useQuery<{ notifications: OwnerNotification[], unreadCount: number }>({
    queryKey: ['owner-notifications'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/owner/notifications`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // --- MUTATIONS ---

  // Update Booking Status mutation
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_URL}/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-bookings', selectedSalonId] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard', selectedSalonId] });
    }
  });

  // Save Service (Add / Update)
  const saveServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = serviceModal?.type === 'edit';
      const endpoint = isEdit
        ? `${API_URL}/api/salon/services/${serviceModal?.service?.id}`
        : `${API_URL}/api/salon/services`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', selectedSalonId] });
      setServiceModal(null);
    }
  });

  // Delete Service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/salon/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', selectedSalonId] });
    }
  });

  // Service Status Toggle mutation
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`${API_URL}/api/salon/services/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', selectedSalonId] });
    }
  });

  // Bulk Operations mutation
  const bulkOperationsMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: 'delete' | 'enable' | 'disable'; ids: string[] }) => {
      // Execute sequentially or in batch endpoint
      for (const id of ids) {
        if (action === 'delete') {
          await fetch(`${API_URL}/api/salon/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': getAuthHeader() }
          });
        } else {
          await fetch(`${API_URL}/api/salon/services/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify({ isActive: action === 'enable' }),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-services', selectedSalonId] });
      setSelectedServiceIds([]);
      alert('Bulk operation executed successfully!');
    }
  });

  // Mark Read notifications
  const markNotificationsReadMutation = useMutation({
    mutationFn: async (payload?: { id?: string; markAllAsRead?: boolean }) => {
      const id = payload?.id;
      const markAllAsRead = payload?.markAllAsRead;
      const res = await fetch(`${API_URL}/api/owner/notifications/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify(id ? { id } : { markAllAsRead: true })
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
    }
  });

  // --- STAFF STATE, QUERIES & MUTATIONS ---
  const [staffModal, setStaffModal] = useState<{
    type: 'add' | 'edit';
    staff?: any;
  } | null>(null);

  const [assignServicesModal, setAssignServicesModal] = useState<{
    staff: any;
  } | null>(null);

  const [selectedStaffServices, setSelectedStaffServices] = useState<string[]>([]);
  const [selectedStaffForPerformance, setSelectedStaffForPerformance] = useState<string | null>(null);

  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffSpecialization, setStaffSpecialization] = useState('');
  const [staffAvatarUrl, setStaffAvatarUrl] = useState('');
  const [staffWorkingDays, setStaffWorkingDays] = useState<string[]>([]);
  const [staffWorkingHours, setStaffWorkingHours] = useState('09:00-18:00');
  const [staffExperience, setStaffExperience] = useState(2);
  const [staffLanguages, setStaffLanguages] = useState<string[]>([]);
  const [staffIsActive, setStaffIsActive] = useState(true);

  const { data: staffData, isLoading: staffLoading } = useQuery<{ staff: any[] }>({
    queryKey: ['salon-staff', selectedSalonId],
    queryFn: async () => {
      if (!selectedSalonId) return { staff: [] };
      const res = await fetch(`${API_URL}/api/owner/staff`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedSalonId,
  });
  const staffList = staffData?.staff || [];

  const { data: staffPerformanceData, isLoading: staffPerformanceLoading } = useQuery({
    queryKey: ['staff-performance', selectedStaffForPerformance],
    queryFn: async () => {
      if (!selectedStaffForPerformance) return null;
      const res = await fetch(`${API_URL}/api/owner/staff/${selectedStaffForPerformance}/bookings`, {
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedStaffForPerformance,
  });

  const saveStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = !!payload.id;
      const endpoint = isEdit
        ? `${API_URL}/api/owner/staff/${payload.id}`
        : `${API_URL}/api/owner/staff`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-staff', selectedSalonId] });
      setStaffModal(null);
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/owner/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-staff', selectedSalonId] });
    }
  });

  const assignStaffServicesMutation = useMutation({
    mutationFn: async ({ staffId, serviceIds }: { staffId: string; serviceIds: string[] }) => {
      const res = await fetch(`${API_URL}/api/owner/staff/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ staffId, serviceIds }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-staff', selectedSalonId] });
      setAssignServicesModal(null);
      alert('Services assigned successfully!');
    }
  });

  const handleOpenAddStaff = () => {
    setStaffName('');
    setStaffPhone('');
    setStaffEmail('');
    setStaffRole('');
    setStaffSpecialization('');
    setStaffAvatarUrl('');
    setStaffWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setStaffWorkingHours('09:00-18:00');
    setStaffExperience(2);
    setStaffLanguages(['English']);
    setStaffIsActive(true);
    setStaffModal({ type: 'add' });
  };

  const handleOpenEditStaff = (staff: any) => {
    setStaffName(staff.name);
    setStaffPhone(staff.phone || '');
    setStaffEmail(staff.email || '');
    setStaffRole(staff.role);
    setStaffSpecialization(staff.specialization);
    setStaffAvatarUrl(staff.avatarUrl || '');
    setStaffWorkingDays(staff.workingDays || []);
    setStaffWorkingHours(staff.workingHours || '09:00-18:00');
    setStaffExperience(staff.experience || 0);
    setStaffLanguages(staff.languages || []);
    setStaffIsActive(staff.isActive);
    setStaffModal({ type: 'edit', staff });
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: staffModal?.staff?.id,
      salonId: selectedSalonId,
      name: staffName,
      phone: staffPhone || null,
      email: staffEmail || null,
      role: staffRole,
      specialization: staffSpecialization,
      avatarUrl: staffAvatarUrl || null,
      workingDays: staffWorkingDays,
      workingHours: staffWorkingHours,
      experience: Number(staffExperience),
      languages: staffLanguages,
      isActive: staffIsActive
    };
    saveStaffMutation.mutate(payload);
  };

  // --- SERVICE FORM ACTIONS ---

  const handleOpenAddService = () => {
    setFormName('');
    setFormDesc('');
    setFormCategory('');
    setFormDuration(30);
    setFormPrice(100);
    setFormDiscountPrice('');
    setFormIsPopular(false);
    setFormImageUrl('');
    setFormIsActive(true);
    setServiceModal({ type: 'add' });
  };

  const handleOpenEditService = (s: Service) => {
    setFormName(s.name);
    setFormDesc(s.description);
    setFormCategory(s.category?.name || '');
    setFormDuration(s.durationMinutes);
    setFormPrice(s.price);
    setFormDiscountPrice(s.discountPrice || '');
    setFormIsPopular(s.isPopular || false);
    setFormImageUrl(s.imageUrl || '');
    setFormIsActive(s.isActive);
    setServiceModal({ type: 'edit', service: s });
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      salonId: selectedSalonId,
      name: formName,
      description: formDesc,
      category: formCategory,
      durationMinutes: formDuration,
      price: Number(formPrice),
      discountPrice: formDiscountPrice !== '' ? Number(formDiscountPrice) : null,
      isPopular: formIsPopular,
      imageUrl: formImageUrl || null,
      isActive: formIsActive
    };
    saveServiceMutation.mutate(payload);
  };

  const handleBulkAction = (action: 'delete' | 'enable' | 'disable') => {
    if (selectedServiceIds.length === 0) return;
    if (confirm(`Are you sure you want to ${action} ${selectedServiceIds.length} services?`)) {
      bulkOperationsMutation.mutate({ action, ids: selectedServiceIds });
    }
  };

  const toggleSelectService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllServices = () => {
    if (selectedServiceIds.length === services.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(services.map(s => s.id));
    }
  };

  return (
    <div className="flex h-screen bg-[#090D16] text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#111827]/70 border-r border-gray-800/80 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-gray-800 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-purple-500/20">
              G
            </span>
            <div>
              <h1 className="font-extrabold text-white text-md tracking-wide">GlowBook</h1>
              <p className="text-[9px] font-bold text-purple-400 tracking-widest uppercase">Owner Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'services', label: 'Services Manager', icon: Package },
              { id: 'bookings', label: 'Active Bookings', icon: CalendarDays },
              { id: 'history', label: 'Booking History', icon: FileClock },
              { id: 'revenue', label: 'Revenue Analytics', icon: CirclePercent },
              { id: 'customers', label: 'Client Directory', icon: Users },
              { id: 'staff', label: 'Staff Management', icon: Users2 },
              { id: 'insights', label: 'Business Insights', icon: BrainCircuit },
              { id: 'notifications', label: 'Notification logs', icon: Bell, badge: unreadCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800/60">
          <div className="flex items-center gap-3 p-2 bg-gray-900/40 rounded-xl border border-gray-800/40">
            <div className="w-8 h-8 rounded-full bg-purple-950 flex items-center justify-center font-bold text-purple-400 text-xs border border-purple-500/20">
              {profile?.isApproved ? '✓' : '!'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Salon Owner</p>
              <p className="text-[10px] text-gray-500 truncate">{profile?.salonStatus === 'approved' ? 'Verified Partner' : 'Pending Verification'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header Toolbar */}
        <header className="bg-[#090D16] border-b border-gray-800/60 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-purple-400 tracking-wider">Dashboard Navigation</span>
            <h2 className="text-xl font-extrabold text-white mt-0.5 tracking-tight capitalize">
              {activeTab === 'overview' ? 'Outlets Overview' : activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-400 font-bold">Active Branch:</span>
              <select
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold transition w-56 cursor-pointer"
              >
                {salonsLoading ? (
                  <option>Loading branches...</option>
                ) : salons.length === 0 ? (
                  <option>No branches registered</option>
                ) : (
                  salons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 transition"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-gray-900" />
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-8 space-y-8">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Aggregate KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Today\'s Revenue', val: `₹${metrics.todayRevenue || 0}`, icon: DollarSign, desc: 'Realized completed revenue', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { title: 'Monthly Revenue', val: `₹${metrics.monthlyRevenue || 0}`, icon: TrendingUp, desc: 'Net billing over 30 days', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                  { title: 'Active Bookings', val: metrics.confirmedBookingsCount || 0, icon: CalendarDays, desc: 'Confirmed appointments queue', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { title: 'Total Customers', val: metrics.totalCustomers || 0, icon: Users2, desc: 'CLV visitor directories', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' }
                ].map((kpi, i) => (
                  <div key={i} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-start justify-between shadow-xl">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
                      <p className="text-2xl font-black text-white">{kpi.val}</p>
                      <p className="text-[10px] text-gray-400">{kpi.desc}</p>
                    </div>
                    <span className={`p-3 rounded-xl border ${kpi.color}`}>
                      <kpi.icon className="w-5 h-5" />
                    </span>
                  </div>
                ))}
              </div>

              {/* Advanced metrics overview cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Insights Summary */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-sm">Dashboard Insights</h3>
                  <div className="divide-y divide-gray-800/60">
                    <div className="py-3.5 flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Most Booked Service</span>
                      <span className="text-purple-400 font-bold">{metrics.mostBookedService || 'N/A'}</span>
                    </div>
                    <div className="py-3.5 flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Top Performing Service</span>
                      <span className="text-purple-400 font-bold">{metrics.topPerformingService || 'N/A'}</span>
                    </div>
                    <div className="py-3.5 flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Most Active Client</span>
                      <span className="text-purple-400 font-bold">{metrics.mostActiveCustomer || 'N/A'}</span>
                    </div>
                    <div className="py-3.5 flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Average Review Score</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        ★ {metrics.averageRating || '0.0'} ({metrics.totalReviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub KPI Stats */}
                <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                  <h3 className="font-extrabold text-white text-sm">Outlets Health & Repeat Bookings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                    <div className="p-4 bg-gray-950/40 border border-gray-800/40 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Pending Review</span>
                      <p className="text-xl font-bold text-amber-500 mt-1">{metrics.pendingBookingsCount || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-950/40 border border-gray-800/40 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Repeat Clients</span>
                      <p className="text-xl font-bold text-indigo-400 mt-1">{metrics.repeatCustomers || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-950/40 border border-gray-800/40 rounded-xl col-span-2 md:col-span-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Total Bookings</span>
                      <p className="text-xl font-bold text-purple-500 mt-1">
                        {(metrics.completedBookingsCount || 0) + (metrics.confirmedBookingsCount || 0)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Upcoming bookings log */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-white text-sm">Upcoming Bookings Queue</h3>
                  <button onClick={() => setActiveTab('bookings')} className="text-purple-400 hover:text-purple-300 text-xs font-semibold transition">
                    View full schedule →
                  </button>
                </div>

                {activeBookings.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">No upcoming client sessions booked.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-850 text-gray-500 font-bold">
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Service</th>
                          <th className="pb-3">Staff</th>
                          <th className="pb-3">Scheduled Date</th>
                          <th className="pb-3">Slot Time</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {activeBookings.slice(0, 5).map((b) => (
                          <tr key={b.id} className="text-gray-300">
                            <td className="py-3.5 font-bold text-white">{b.customerName}</td>
                            <td className="py-3.5 text-purple-400 font-bold">{b.serviceName}</td>
                            <td className="py-3.5">{b.staffName}</td>
                            <td className="py-3.5">{new Date(b.date).toLocaleDateString()}</td>
                            <td className="py-3.5 font-mono">{b.time}</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                b.status === 'PENDING' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20' : 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-white text-lg">Salon Catalog</h3>
                  <p className="text-xs text-gray-400">Add, edit, deactivate, or bulk manage services for this salon outlet.</p>
                </div>
                <button
                  onClick={handleOpenAddService}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-purple-500/10 flex items-center gap-2"
                >
                  <span>+</span> Add New Service
                </button>
              </div>

              {/* Bulk Actions Header */}
              {selectedServiceIds.length > 0 && (
                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between text-xs transition">
                  <span className="font-bold text-purple-300">
                    {selectedServiceIds.length} services selected
                  </span>
                  <div className="flex gap-3 font-bold text-[10px] uppercase">
                    <button
                      onClick={() => handleBulkAction('enable')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg transition"
                    >
                      Enable Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('disable')}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3.5 py-2 rounded-lg transition border border-gray-700"
                    >
                      Disable Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="bg-rose-950/40 hover:bg-rose-950 text-rose-400 px-3.5 py-2 rounded-lg border border-rose-900/30 transition"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}

              {servicesLoading ? (
                <div className="text-gray-500 text-center py-12">Loading salon services...</div>
              ) : services.length === 0 ? (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
                  No services configured. Add a service to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {services.map((s) => (
                    <div key={s.id} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-gray-700/80 transition space-y-4">
                      
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedServiceIds.includes(s.id)}
                              onChange={() => toggleSelectService(s.id)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800 cursor-pointer"
                            />
                            <div className="w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 overflow-hidden shrink-0">
                              {s.imageUrl ? (
                                <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-gray-700 text-sm">S</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-white text-xs truncate flex items-center gap-1.5">
                                {s.name}
                                {s.isPopular && (
                                  <span className="bg-amber-500/10 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">POPULAR</span>
                                )}
                              </h4>
                              <span className="inline-block bg-gray-950 text-gray-400 text-[8px] font-bold uppercase px-2 py-0.5 rounded border border-gray-800 mt-1">
                                {s.category?.name || 'General'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 line-clamp-2">{s.description}</p>
                        
                        <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-gray-850">
                          <div>
                            <span className="text-gray-500 text-[9px] uppercase tracking-wider">Price</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {s.discountPrice ? (
                                <>
                                  <span className="text-white text-xs">₹{s.discountPrice}</span>
                                  <span className="text-gray-500 line-through text-[10px]">₹{s.price}</span>
                                </>
                              ) : (
                                <span className="text-white text-xs">₹{s.price}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 text-[9px] uppercase tracking-wider">Duration</span>
                            <p className="text-white text-xs mt-0.5">{s.durationMinutes} mins</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3.5 border-t border-gray-850 gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleServiceMutation.mutate({ id: s.id, isActive: !s.isActive })}
                            className="text-gray-400 hover:text-white transition"
                          >
                            {s.isActive ? (
                              <ToggleRight className="w-8 h-8 text-purple-500 cursor-pointer" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-gray-600 cursor-pointer" />
                            )}
                          </button>
                          <span className={`text-[9px] font-extrabold uppercase ${s.isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex gap-2 text-[10px] font-bold uppercase">
                          <button
                            onClick={() => handleOpenEditService(s)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition border border-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this service?')) {
                                deleteServiceMutation.mutate(s.id);
                              }
                            }}
                            className="bg-rose-950/40 hover:bg-rose-950 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-900/30 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVE APPOINTMENTS */}
          {activeTab === 'bookings' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="font-extrabold text-white text-lg">Active Bookings Log</h3>
                <p className="text-xs text-gray-400">Accept, reject, start, and complete ongoing or upcoming salon bookings.</p>
              </div>

              {activeBookingsLoading ? (
                <div className="text-gray-500 text-center py-12">Loading active schedule...</div>
              ) : activeBookings.length === 0 ? (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
                  No active or pending appointments scheduled.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map((b) => (
                    <div key={b.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-gray-750 transition">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            b.status === 'PENDING' ? 'bg-amber-400 animate-pulse' : b.status === 'CONFIRMED' ? 'bg-purple-500' : 'bg-blue-400'
                          }`} />
                          <h4 className="font-bold text-white text-xs">
                            Customer: {b.customerName} &bull; <span className="font-mono text-gray-400">{b.mobileNumber}</span> &bull; <span className="text-gray-500">{b.email}</span>
                          </h4>
                        </div>
                        <div className="text-[11px] text-gray-450 space-y-1.5 pl-5">
                          <p className="font-bold text-white">
                            Booking ID: <span className="font-mono text-purple-400 select-all">{b.id}</span>
                          </p>
                          <p className="font-bold text-white">Service: <span className="text-purple-400">{b.serviceName} (₹{b.price})</span></p>
                          <p>Scheduled: <span className="text-white font-semibold">{new Date(b.date).toLocaleDateString()} at {b.time}</span></p>
                          <p>Stylist: <span className="text-white">{b.staffName}</span></p>
                          <p>Payment: <span className="bg-purple-950/50 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">PENDING</span></p>
                          {b.notes && <p className="italic text-gray-500">Note: &ldquo;{b.notes}&rdquo;</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 text-[10px] font-bold uppercase pl-5 md:pl-0 shrink-0">
                        {b.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'confirmed' })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg transition shadow"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'rejected' })}
                              className="bg-rose-950/40 hover:bg-rose-950 text-rose-450 px-3.5 py-2 rounded-lg border border-rose-900/30 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(b.status === 'CONFIRMED' || b.status === 'ACCEPTED') && (
                          <button
                            onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'in_progress' })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition"
                          >
                            Start Service
                          </button>
                        )}
                        {b.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'completed' })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg transition"
                          >
                            Complete Service
                          </button>
                        )}
                        {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED' && (
                          <button
                            onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'cancelled' })}
                            className="bg-gray-800 hover:bg-gray-750 text-rose-400 px-3 py-2 rounded-lg transition border border-gray-700 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: BOOKING HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-lg">Appointment History</h3>
                  <p className="text-xs text-gray-400">Search and filter historical appointments and output aggregated metrics.</p>
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 bg-gray-950/40 p-1.5 rounded-xl border border-gray-800 text-[10px] font-bold uppercase tracking-wider">
                  {[
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_30', label: 'Last 30 Days' },
                    { id: 'last_7', label: 'Last 7 Days' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'today', label: 'Today' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setHistoryFilter(f.id as any)}
                      className={`px-3.5 py-2 rounded-lg transition ${
                        historyFilter === f.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statistics Card */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Bookings', val: historyStats.total || 0, color: 'text-white' },
                  { label: 'Completed', val: historyStats.completed || 0, color: 'text-emerald-400' },
                  { label: 'Pending', val: historyStats.pending || 0, color: 'text-amber-455' },
                  { label: 'Cancelled', val: historyStats.cancelled || 0, color: 'text-rose-455' },
                  { label: 'Revenue Generated', val: `₹${historyStats.revenue || 0}`, color: 'text-purple-400' }
                ].map((s, i) => (
                  <div key={i} className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-4 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</span>
                    <p className={`text-lg font-black mt-1 ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Bookings Table */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl">
                {historyBookings.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No historical records found for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-850 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="pb-3">Client</th>
                          <th className="pb-3">Service</th>
                          <th className="pb-3">Slot Time</th>
                          <th className="pb-3">Price</th>
                          <th className="pb-3">Stylist</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {historyBookings.map((b) => (
                          <tr key={b.id} className="text-gray-300">
                            <td className="py-3.5 font-semibold text-white">
                              <p>{b.customerName}</p>
                              <p className="text-[9px] text-gray-500 font-mono mt-0.5">{b.mobileNumber}</p>
                              <p className="text-[9px] text-gray-500 font-mono mt-0.5">{b.id.substring(0, 8)}...</p>
                            </td>
                            <td className="py-3.5 text-purple-400 font-bold">{b.serviceName}</td>
                            <td className="py-3.5 font-mono">{new Date(b.date).toLocaleDateString()} &bull; {b.time}</td>
                            <td className="py-3.5 font-bold">₹{b.price}</td>
                            <td className="py-3.5">{b.staffName}</td>
                            <td className="py-3.5 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  b.status === 'COMPLETED'
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                                    : b.status === 'PENDING'
                                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-950/60 text-rose-455 border border-rose-500/20'
                                }`}>
                                  {b.status}
                                </span>
                                <span className="bg-purple-950/40 text-purple-300 border border-purple-500/10 px-1 py-0.5 rounded text-[8px] font-bold uppercase">Paid</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REVENUE */}
          {activeTab === 'revenue' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Detailed metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lifetime Gross Earnings</span>
                  <p className="text-3xl font-black text-white">₹{revenueData?.lifetimeRevenue || 0}</p>
                  <p className="text-[10px] text-gray-400">Total accumulated invoices</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Revenue Growth Rate</span>
                  <p className="text-3xl font-black text-emerald-400">
                    {revenueData?.growthPercent >= 0 ? '+' : ''}{revenueData?.growthPercent || 0}%
                  </p>
                  <p className="text-[10px] text-gray-400">Compared to last calendar month</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Commission Deductions</span>
                  <p className="text-3xl font-black text-purple-400">10.0%</p>
                  <p className="text-[10px] text-gray-400">Platform billing commission fee</p>
                </div>
              </div>

              {/* Recharts Area and Breakdown Bars */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-sm">Monthly Revenue Trend</h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData?.charts || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" opacity={0.4} />
                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#FFF', fontSize: 11 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Service Contributions */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                  <h3 className="font-extrabold text-white text-sm">Earnings by Category</h3>
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {(revenueData?.revenueByCategory || []).slice(0, 5).map((cat: any, i: number) => (
                      <div key={i} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold text-gray-300">
                          <span>{cat.name}</span>
                          <span>₹{cat.value}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${revenueData.lifetimeRevenue > 0 ? (cat.value / revenueData.lifetimeRevenue) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="font-extrabold text-white text-lg">Client Directory</h3>
                <p className="text-xs text-gray-400">Manage client directory, review lifetimes spend values, and tracking salon visits.</p>
              </div>

              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl">
                {customers.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No customer records logged.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-850 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="pb-3">Client Name</th>
                          <th className="pb-3">Contact</th>
                          <th className="pb-3">Completed Visits</th>
                          <th className="pb-3">Total Spend</th>
                          <th className="pb-3">Favourite Service</th>
                          <th className="pb-3">Segment</th>
                          <th className="pb-3 text-right">Last Visit Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {customers.map((c, i) => (
                          <tr key={i} className="text-gray-300">
                            <td className="py-3.5 font-semibold text-white">{c.customerName}</td>
                            <td className="py-3.5">
                              <p>{c.email}</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.phone}</p>
                            </td>
                            <td className="py-3.5 font-bold text-center">{c.totalVisits}</td>
                            <td className="py-3.5 font-bold text-purple-400">₹{c.totalSpend}</td>
                            <td className="py-3.5 font-medium">{c.favouriteService}</td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                c.segment === 'Top Customer'
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/20'
                                  : 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {c.segment}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">{c.lastVisit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Core analytics indexes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Customer Retention', val: `${insights?.customerRetentionRate || 0}%`, desc: 'Repeat customers vs total' },
                  { label: 'Average Ticket Size', val: `₹${insights?.averageOrderValue || 0}`, desc: 'Avg bill per service' },
                  { label: 'Cancellation Rate', val: `${insights?.cancellationRate || 0}%`, desc: 'Cancelled vs total requests' },
                  { label: 'Monthly Growth', val: `+${insights?.customerGrowth || 0}`, desc: 'New clients registered' }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.label}</span>
                    <p className="text-2xl font-black text-white mt-1">{item.val}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Staff Analytics Grid */}
              <div>
                <h4 className="font-extrabold text-white text-sm mb-4">Staff Directory Insights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Staff', val: insights?.staffMetrics?.totalStaff || 0, desc: 'Registered stylists' },
                    { label: 'Active Staff', val: insights?.staffMetrics?.activeStaff || 0, desc: 'Currently working' },
                    { label: 'Staff Utilization', val: `${insights?.staffMetrics?.staffUtilization || 0}%`, desc: 'Average busy capacity ratio' },
                    { label: 'Revenue Per Staff', val: `₹${insights?.staffMetrics?.revenuePerStaff || 0}`, desc: 'Avg revenue contribution' }
                  ].map((item, i) => (
                    <div key={i} className="bg-purple-950/10 border border-purple-500/10 rounded-2xl p-5 text-center">
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">{item.label}</span>
                      <p className="text-2xl font-black text-white mt-1">{item.val}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performing Staff Lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">Top Staff By Revenue</h4>
                  <div className="space-y-2">
                    {(insights?.staffMetrics?.topStaffByRevenue || []).map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-850">
                        <span className="text-gray-300 font-semibold">{s.name}</span>
                        <span className="text-white font-bold">₹{s.revenue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">Top Staff By Bookings</h4>
                  <div className="space-y-2">
                    {(insights?.staffMetrics?.topStaffByBookings || []).map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-850">
                        <span className="text-gray-300 font-semibold">{s.name}</span>
                        <span className="text-white font-bold">{s.bookingsCount} visits</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">Top Staff By Ratings</h4>
                  <div className="space-y-2">
                    {(insights?.staffMetrics?.topStaffByRatings || []).map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-850">
                        <span className="text-gray-300 font-semibold">{s.name}</span>
                        <span className="text-amber-450 font-bold">★ {s.avgRating}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hour & day peak analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Peak booking indicators */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-sm">Peak Hours & Booking Days</h3>
                  <div className="divide-y divide-gray-800/60">
                    <div className="py-4 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">Peak Hour of Day</p>
                        <p className="text-[10px] text-gray-500">Most busy hour for slots</p>
                      </div>
                      <span className="bg-purple-950 text-purple-400 font-extrabold px-3 py-1 rounded-xl border border-purple-500/20 uppercase">
                        {insights?.peakBookingHours || 'N/A'}
                      </span>
                    </div>
                    <div className="py-4 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">Peak Day of Week</p>
                        <p className="text-[10px] text-gray-500">Most active scheduled day</p>
                      </div>
                      <span className="bg-purple-950 text-purple-400 font-extrabold px-3 py-1 rounded-xl border border-purple-500/20 uppercase">
                        {insights?.peakBookingDays || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Popular Services lists */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-sm">Service Popularity Index</h3>
                  <div className="space-y-3">
                    <div className="text-xs">
                      <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Top Popular Services</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {(insights?.mostPopularServices || []).map((s: string, idx: number) => (
                          <span key={idx} className="bg-emerald-950/60 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs pt-2">
                      <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Least Booked Services</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {(insights?.leastPopularServices || []).map((s: string, idx: number) => (
                          <span key={idx} className="bg-rose-950/60 text-rose-455 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-rose-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-white text-lg">System Notifications</h3>
                  <p className="text-xs text-gray-400">Log entries for bookings status, reviews, and salon updates.</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markNotificationsReadMutation.mutate({ markAllAsRead: true })}
                    className="bg-purple-950 hover:bg-purple-900 text-purple-400 font-bold px-4 py-2 rounded-xl text-xs border border-purple-500/20 transition"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6 animate-pulse">No notifications received.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.isRead && markNotificationsReadMutation.mutate({ id: notif.id })}
                        className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition ${
                          notif.isRead
                            ? 'bg-gray-950/20 border-gray-850'
                            : 'bg-purple-950/10 border-purple-500/20 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            {!notif.isRead && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                            <h4 className="font-extrabold text-white">{notif.title}</h4>
                          </div>
                          <p className="text-gray-450">{notif.body}</p>
                          <p className="text-[10px] text-gray-500">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>

                        {!notif.isRead && (
                          <span className="text-[9px] font-bold uppercase text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20">
                            Unread
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-white text-lg">Staff Directory</h3>
                  <p className="text-xs text-gray-400">Add staff, customize shifts, assign eligible service categories, and monitor stylist bookings.</p>
                </div>
                <button
                  onClick={handleOpenAddStaff}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-purple-500/10 flex items-center gap-2"
                >
                  <span>+</span> Add New Staff
                </button>
              </div>

              {staffLoading ? (
                <div className="text-gray-500 text-center py-12">Loading staff database...</div>
              ) : staffList.length === 0 ? (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
                  No staff members registered. Click "+ Add New Staff" to configure.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {staffList.map((s: any) => (
                    <div key={s.id} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-gray-700/80 transition space-y-4">
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-500/20 overflow-hidden shrink-0">
                            {s.avatarUrl ? (
                              <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-purple-400 text-sm">
                                {s.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-white text-xs truncate flex items-center gap-1.5">
                              {s.name}
                              {!s.isActive && (
                                <span className="bg-rose-500/10 text-rose-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-500/20 uppercase">INACTIVE</span>
                              )}
                            </h4>
                            <p className="text-[10px] text-gray-400 truncate">{s.role} &bull; {s.specialization}</p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-850">
                          {s.phone && <p>📞 Phone: <span className="text-white font-mono">{s.phone}</span></p>}
                          {s.email && <p>📧 Email: <span className="text-white">{s.email}</span></p>}
                          <p>📅 Schedule: <span className="text-white">{(s.workingDays || []).slice(0, 3).join(', ')}{(s.workingDays || []).length > 3 ? '...' : ''} ({s.workingHours || 'N/A'})</span></p>
                          <p>💼 Experience: <span className="text-white">{s.experience} Years</span></p>
                          <p>🗣️ Languages: <span className="text-white">{(s.languages || []).join(', ')}</span></p>
                        </div>

                        {/* Assigned Services */}
                        <div className="pt-2 border-t border-gray-850">
                          <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Assigned Services</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.services && s.services.length > 0 ? (
                              s.services.map((mapping: any) => (
                                <span key={mapping.id} className="bg-purple-950/40 text-purple-300 text-[9px] px-2 py-0.5 rounded border border-purple-900/20">
                                  {mapping.service.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-600 text-[10px] italic">No services assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-3 border-t border-gray-850">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaffServices((s.services || []).map((m: any) => m.serviceId));
                              setAssignServicesModal({ staff: s });
                            }}
                            className="flex-1 bg-purple-950/60 hover:bg-purple-900 text-purple-400 py-1.5 rounded-lg border border-purple-500/20 text-[10px] font-bold uppercase transition"
                          >
                            Assign Services
                          </button>
                          <button
                            onClick={() => setSelectedStaffForPerformance(s.id)}
                            className="flex-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-400 py-1.5 rounded-lg border border-indigo-500/20 text-[10px] font-bold uppercase transition"
                          >
                            Analytics & Bookings
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEditStaff(s)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded-lg border border-gray-700 text-[10px] font-bold uppercase transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this staff member? All their booking assignments will be preserved but they will be removed.')) {
                                deleteStaffMutation.mutate(s.id);
                              }
                            }}
                            className="flex-1 bg-rose-950/40 hover:bg-rose-950 text-rose-455 py-1.5 rounded-lg border border-rose-900/30 text-[10px] font-bold uppercase transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* STAFF DETAILS PERFORMANCE & BOOKINGS MODAL */}
      {selectedStaffForPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#111827] border border-gray-850 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-950 border border-purple-500/20 overflow-hidden shrink-0">
                  {staffPerformanceData?.staffInfo?.avatarUrl ? (
                    <img src={staffPerformanceData.staffInfo.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-purple-400 text-lg">
                      {staffPerformanceData?.staffInfo?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{staffPerformanceData?.staffInfo?.name}</h3>
                  <p className="text-xs text-purple-400">{staffPerformanceData?.staffInfo?.role} &bull; {staffPerformanceData?.staffInfo?.specialization}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForPerformance(null)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {staffPerformanceLoading ? (
              <p className="text-xs text-gray-500 py-6 text-center animate-pulse">Loading analytics data...</p>
            ) : (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-950/40 p-4 rounded-xl text-center border border-gray-850">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Total Bookings</span>
                    <p className="text-xl font-bold text-white mt-1">{staffPerformanceData?.statistics?.totalBookings || 0}</p>
                  </div>
                  <div className="bg-gray-950/40 p-4 rounded-xl text-center border border-gray-850">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Revenue Generated</span>
                    <p className="text-xl font-bold text-emerald-400 mt-1">₹{staffPerformanceData?.statistics?.totalRevenue || 0}</p>
                  </div>
                  <div className="bg-gray-950/40 p-4 rounded-xl text-center border border-gray-850">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Average Rating</span>
                    <p className="text-xl font-bold text-amber-500 mt-1">★ {staffPerformanceData?.statistics?.averageRating || '5.0'}</p>
                  </div>
                  <div className="bg-gray-950/40 p-4 rounded-xl text-center border border-gray-850">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Completed vs Cancelled</span>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{staffPerformanceData?.statistics?.completedCount || 0} / {staffPerformanceData?.statistics?.cancelledCount || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Today's Schedule */}
                  <div className="bg-gray-950/20 border border-gray-850 rounded-xl p-4 space-y-3">
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wide">Today's Schedule</h4>
                    {staffPerformanceData?.bookings?.today?.length === 0 ? (
                      <p className="text-[11px] text-gray-500 py-4">No appointments scheduled today.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {staffPerformanceData?.bookings?.today?.map((b: any) => (
                          <div key={b.id} className="p-3 bg-gray-900/40 rounded-lg border border-gray-800 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-white">{b.customerName} &bull; <span className="text-purple-400">{b.serviceName}</span></p>
                              <p className="text-[10px] text-gray-500">{b.time}</p>
                            </div>
                            <span className="bg-purple-950 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{b.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Schedule */}
                  <div className="bg-gray-955/20 border border-gray-855 rounded-xl p-4 space-y-3">
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wide">Upcoming Appointments</h4>
                    {staffPerformanceData?.bookings?.upcoming?.length === 0 ? (
                      <p className="text-[11px] text-gray-500 py-4">No upcoming client appointments.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {staffPerformanceData?.bookings?.upcoming?.map((b: any) => (
                          <div key={b.id} className="p-3 bg-gray-900/40 rounded-lg border border-gray-800 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-white">{b.customerName} &bull; <span className="text-purple-400">{b.serviceName}</span></p>
                              <p className="text-[10px] text-gray-400">{new Date(b.date).toLocaleDateString()} at {b.time}</p>
                            </div>
                            <span className="bg-purple-950 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{b.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews and Ratings */}
                <div className="bg-gray-955/20 border border-gray-855 rounded-xl p-4 space-y-3">
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wide">Stylist Reviews</h4>
                  {staffPerformanceData?.reviews?.length === 0 ? (
                    <p className="text-[11px] text-gray-500 py-4">No reviews logged for this stylist.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-56 overflow-y-auto">
                      {staffPerformanceData?.reviews?.map((r: any) => (
                        <div key={r.id} className="p-3.5 bg-gray-900/40 rounded-lg border border-gray-800 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{r.customerName}</span>
                            <span className="text-amber-500 font-bold">★ {r.rating}</span>
                          </div>
                          <p className="text-gray-400 italic font-medium">&ldquo;{r.comment}&rdquo;</p>
                          <p className="text-[9px] text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STYLIST SERVICE ASSIGNMENT DIALOG */}
      {assignServicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-gray-855 rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div>
              <h3 className="text-md font-bold text-white">Assign Services</h3>
              <p className="text-xs text-gray-400 mt-1">Select services that {assignServicesModal.staff.name} is certified/eligible to perform.</p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-800/80 rounded-xl p-3 bg-gray-950/20">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-900/40 rounded-lg cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedStaffServices.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStaffServices(prev => [...prev, s.id]);
                      } else {
                        setSelectedStaffServices(prev => prev.filter(id => id !== s.id));
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800"
                  />
                  <div>
                    <p className="font-bold text-white">{s.name}</p>
                    <p className="text-[10px] text-gray-550">{s.category?.name || 'General'} &bull; {s.durationMinutes} mins &bull; ₹{s.price}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 text-[10px] font-bold uppercase pt-4 border-t border-gray-850">
              <button
                type="button"
                onClick={() => setAssignServicesModal(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => assignStaffServicesMutation.mutate({
                  staffId: assignServicesModal.staff.id,
                  serviceIds: selectedStaffServices
                })}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg transition"
              >
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF DIALOG MODAL (ADD / EDIT) */}
      {staffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#111827] border border-gray-855 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white">
              {staffModal.type === 'add' ? 'Add Salon Stylist / Staff' : 'Edit Staff Details'}
            </h3>

            <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Stylist Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Rahul Sharma"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Staff Role</label>
                  <input
                    type="text"
                    required
                    placeholder="Senior Hair Stylist"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Contact Email</label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+919876543210"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="Balayage, Fades"
                    value={staffSpecialization}
                    onChange={(e) => setStaffSpecialization(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Years Experience</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={staffExperience}
                    onChange={(e) => setStaffExperience(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Shift Working Hours</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00-18:00"
                    value={staffWorkingHours}
                    onChange={(e) => setStaffWorkingHours(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Working Days (Shift Schedule)</label>
                <div className="grid grid-cols-4 gap-2 border border-gray-850 p-3.5 rounded-xl bg-gray-950/20">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer font-bold text-[10px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={staffWorkingDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStaffWorkingDays(prev => [...prev, day]);
                          } else {
                            setStaffWorkingDays(prev => prev.filter(d => d !== day));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800"
                      />
                      {day.substring(0, 3)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Profile Avatar Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={staffAvatarUrl}
                    onChange={(e) => setStaffAvatarUrl(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Languages (comma separated)</label>
                  <input
                    type="text"
                    placeholder="English, Hindi"
                    value={staffLanguages.join(', ')}
                    onChange={(e) => setStaffLanguages(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold uppercase text-[9px] tracking-wide text-gray-300">
                  <input
                    type="checkbox"
                    checked={staffIsActive}
                    onChange={(e) => setStaffIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800"
                  />
                  Mark as Active
                </label>
              </div>

              <div className="flex justify-end gap-3 text-[10px] font-bold uppercase pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setStaffModal(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg transition"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE DIALOG MODAL (ADD / EDIT) */}
      {serviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-gray-850 rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <h3 className="text-md font-bold text-white">
              {serviceModal.type === 'add' ? 'Add Service Offered' : 'Edit Service Settings'}
            </h3>

            <form onSubmit={handleServiceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Signature Haircut"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Haircuts & Styling"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Description Details</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Deep cleansing precison style cut..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Discount Price (₹)</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={formDiscountPrice}
                    onChange={(e) => setFormDiscountPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-2 uppercase text-[9px] tracking-wider">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold uppercase text-[9px] tracking-wide text-gray-300">
                  <input
                    type="checkbox"
                    checked={formIsPopular}
                    onChange={(e) => setFormIsPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800"
                  />
                  Mark as Popular
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold uppercase text-[9px] tracking-wide text-gray-300">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-800"
                  />
                  Activate Instantly
                </label>
              </div>

              <div className="flex justify-end gap-3 text-[10px] font-bold uppercase pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setServiceModal(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg transition"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
