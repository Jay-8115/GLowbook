'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/src/utils/api';
import { generateSlots } from '@/src/app/customer/search/slotsSim'; // local copy for convenience

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

interface Salon {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  phone: string;
  imageUrl: string;
  avgRating: number;
  totalReviews: number;
  totalBookings: number;
  openTime: string;
  closeTime: string;
  distance: number;
  services: Service[];
}

const MOCK_CITIES = [
  { name: 'Current GPS / Custom', lat: 39.7817, lng: -89.6501 },
  { name: 'Springfield, IL', lat: 39.7817, lng: -89.6501 },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
];

export default function CustomerNearbySearchPage() {
  const [lat, setLat] = useState<number>(39.7817);
  const [lng, setLng] = useState<number>(-89.6501);
  const [city, setCity] = useState<string>('Springfield, IL');
  const [radius, setRadius] = useState<string>('10'); // 2, 5, 10, 20 KM
  const [sort, setSort] = useState<string>('nearest'); // nearest, rating, popularity

  // Booking simulation state
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generatedSlots, setGeneratedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingPlaced, setBookingPlaced] = useState<boolean>(false);

  // Load from localstorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLat = localStorage.getItem('customer_lat');
      const savedLng = localStorage.getItem('customer_lng');
      const savedCity = localStorage.getItem('customer_city');
      if (savedLat && savedLng) {
        setLat(parseFloat(savedLat));
        setLng(parseFloat(savedLng));
      }
      if (savedCity) {
        setCity(savedCity);
      }
    }
  }, []);

  // Use Browser GPS
  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const uLat = position.coords.latitude;
          const uLng = position.coords.longitude;
          setLat(uLat);
          setLng(uLng);
          setCity('Browser GPS location');
          localStorage.setItem('customer_lat', uLat.toString());
          localStorage.setItem('customer_lng', uLng.toString());
          localStorage.setItem('customer_city', 'Browser GPS location');
        },
        (error) => {
          alert(`GPS error: ${error.message}. Mocking coordinates instead.`);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Change mock city
  const handleCityChange = (cityName: string) => {
    const matched = MOCK_CITIES.find((c) => c.name === cityName);
    if (matched) {
      setLat(matched.lat);
      setLng(matched.lng);
      setCity(matched.name);
      localStorage.setItem('customer_lat', matched.lat.toString());
      localStorage.setItem('customer_lng', matched.lng.toString());
      localStorage.setItem('customer_city', matched.name);
      setSelectedSalon(null);
      setSelectedService(null);
    }
  };

  // Query nearby salons
  const { data: salons = [], isLoading, refetch } = useQuery<Salon[]>({
    queryKey: ['nearby-salons', lat, lng, radius, sort],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/salons/nearby?lat=${lat}&lng=${lng}&radius=${radius}&sort=${sort}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!lat && !!lng,
  });

  // Handle slot generation simulation when a service is selected
  useEffect(() => {
    if (selectedSalon && selectedService) {
      // Simulate booking date check. Here we generate slots using our simulator utility
      // and pass some mock existing bookings for testing.
      const mockExistingBookings = [
        { startTime: '10:00', endTime: '10:30' },
        { startTime: '14:00', endTime: '14:30' },
        { startTime: '16:00', endTime: '16:30' },
      ];

      const slots = generateSlots(
        selectedSalon.openTime || '09:00',
        selectedSalon.closeTime || '21:00',
        selectedService.durationMinutes || 30,
        mockExistingBookings
      );

      setGeneratedSlots(slots);
      if (slots.length > 0) {
        setSelectedSlot(slots[0]);
      } else {
        setSelectedSlot('');
      }
    }
  }, [selectedSalon, selectedService, bookingDate]);

  const handlePlaceBooking = async () => {
    if (!selectedSalon || !selectedService || !selectedSlot) return;
    
    // Call POST /api/bookings
    try {
      const mockUserId = 'customer-dev-placeholder-id'; // using mock user
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin_token_placeholder', // simulate authenticate
        },
        body: JSON.stringify({
          salonId: selectedSalon.id,
          serviceId: selectedService.id,
          staffId: '11111111-2222-3333-4444-555555555555', // mock staff
          bookingDate: new Date(bookingDate).toISOString(),
          startTime: selectedSlot,
          endTime: selectedSlot, // simplified for simulator
          notes: 'Simulator test booking',
        }),
      });

      if (!res.ok) {
        throw new Error('Booking placement failed');
      }

      setBookingPlaced(true);
      setTimeout(() => {
        setBookingPlaced(false);
        setSelectedService(null);
        setSelectedSlot('');
      }, 3000);

    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Geolocation Search Bar */}
      <div className="bg-[#111827]/80 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">Geolocation Client Context</span>
          <h2 className="text-xl font-bold text-white">GlowBook Location Engine</h2>
          <p className="text-xs text-gray-400 font-medium">
            Active Coordinate: <span className="font-mono text-white font-bold">{lat.toFixed(4)}, {lng.toFixed(4)}</span> &bull; Area: <span className="text-blue-400 font-bold">{city}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <button
            onClick={handleUseGPS}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/10"
          >
            🛰️ Use Current Location (GPS)
          </button>

          <select
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            className="bg-[#090D16] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
          >
            {MOCK_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                City: {c.name}
              </option>
            ))}
          </select>

          {/* Radius Filter */}
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="bg-[#090D16] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="2">Radius: 2 KM</option>
            <option value="5">Radius: 5 KM</option>
            <option value="10">Radius: 10 KM</option>
            <option value="20">Radius: 20 KM</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-[#090D16] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="nearest">Sort: Nearest First</option>
            <option value="rating">Sort: Highest Rated</option>
            <option value="popularity">Sort: Most Popular</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Listings vs Slots Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Salon Listings */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-md">Nearby Salons Found</h3>

          {isLoading ? (
            <div className="text-gray-500 text-center py-12">Querying nearby outlets...</div>
          ) : salons.length === 0 ? (
            <div className="bg-[#111827]/80 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-sm">
              No salons found matching the distance and radius. Try selecting another city or increasing the radius.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {salons.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSalon(s);
                    setSelectedService(null);
                  }}
                  className={`bg-[#111827]/80 border rounded-2xl p-5 shadow-xl cursor-pointer transition flex flex-col justify-between space-y-4 hover:border-blue-500 ${
                    selectedSalon?.id === s.id ? 'border-blue-500 shadow-blue-500/5 bg-blue-950/5' : 'border-gray-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="relative h-36 rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
                      <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                      <span className="absolute top-3 right-3 bg-blue-600/90 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow border border-blue-400/20">
                        {s.distance.toFixed(1)} KM
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{s.name}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{s.description}</p>
                    </div>

                    <div className="flex gap-4 text-xs font-bold text-gray-400">
                      <span>★ {s.avgRating.toFixed(1)} ({s.totalReviews} reviews)</span>
                      <span>📅 {s.totalBookings} Bookings</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800 text-[10px] text-gray-500 flex justify-between font-bold uppercase tracking-wider">
                    <span>{s.city}, {s.state}</span>
                    <span>Hrs: {s.openTime} - {s.closeTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot Generator and booking simulator */}
        <div className="bg-[#111827]/80 border border-gray-800 rounded-2xl p-6 shadow-xl h-[600px] flex flex-col justify-between overflow-y-auto">
          {selectedSalon ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">Selected Salon Info</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedSalon.name}</h3>
                  <p className="text-xs text-gray-400">{selectedSalon.address}, {selectedSalon.city}</p>
                </div>

                {/* Services offered selector */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Service</h4>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {selectedSalon.services && selectedSalon.services.length > 0 ? (
                      selectedSalon.services.map((ser) => (
                        <div
                          key={ser.id}
                          onClick={() => {
                            setSelectedService(ser);
                            setBookingPlaced(false);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition ${
                            selectedService?.id === ser.id
                              ? 'bg-blue-900/20 border-blue-500 text-white font-bold'
                              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{ser.name}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{ser.durationMinutes} mins</p>
                          </div>
                          <span className="font-semibold text-emerald-400">₹{ser.price}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">No active services offered at this time.</p>
                    )}
                  </div>
                </div>

                {/* Date Selection */}
                {selectedService && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Date</h4>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="bg-[#090D16] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full"
                    />
                  </div>
                )}

                {/* Dynamic Slot Generator Dropdown */}
                {selectedService && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Auto Slot Generation</h4>
                      <span className="text-[9px] bg-blue-950 text-blue-300 font-extrabold uppercase px-2 py-0.5 rounded border border-blue-500/20">
                        {generatedSlots.length} Slots Free
                      </span>
                    </div>

                    {generatedSlots.length === 0 ? (
                      <p className="text-xs text-rose-400 italic">No free appointment slots available.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {generatedSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2 rounded-lg border text-[10px] font-mono font-bold transition text-center ${
                              selectedSlot === slot
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Booking Action Button */}
              {selectedService && selectedSlot && (
                <div className="pt-4 border-t border-gray-800 shrink-0">
                  {bookingPlaced ? (
                    <div className="bg-emerald-950/30 border border-emerald-900/40 p-3.5 rounded-xl text-center text-xs font-bold text-emerald-400 animate-pulse">
                      🎉 Booking Request Placed Successfully! (Dispatched Real-Time socket & FCM alert)
                    </div>
                  ) : (
                    <button
                      onClick={handlePlaceBooking}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-blue-500/25"
                    >
                      Book Appointment at {selectedSlot}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-sm">
              Select a salon from the list to view its services, trigger the slot generator, and test the booking pipeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
