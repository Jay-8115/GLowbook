import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/providers/booking_provider.dart';
import '../../data/models/booking_model.dart';

class BookingsListScreen extends ConsumerStatefulWidget {
  const BookingsListScreen({super.key});

  @override
  ConsumerState<BookingsListScreen> createState() => _BookingsListScreenState();
}

class _BookingsListScreenState extends ConsumerState<BookingsListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(bookingProvider.notifier).fetchBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text('My Appointments', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
          : RefreshIndicator(
              onRefresh: () async {
                ref.read(bookingProvider.notifier).fetchBookings();
              },
              color: const Color(0xFF8B5CF6),
              child: state.bookings.isEmpty
                  ? const Center(
                      child: Text(
                        'No appointments scheduled yet.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      itemCount: state.bookings.length,
                      itemBuilder: (context, index) {
                        final booking = state.bookings[index];
                        return _buildBookingCard(context, booking);
                      },
                    ),
            ),
    );
  }

  Widget _buildBookingCard(BuildContext context, BookingModel booking) {
    Color statusColor;
    switch (booking.status) {
      case 'COMPLETED':
        statusColor = Colors.green;
        break;
      case 'ACCEPTED':
        statusColor = Colors.blue;
        break;
      case 'IN_PROGRESS':
        statusColor = Colors.indigo;
        break;
      case 'PENDING':
        statusColor = Colors.amber;
        break;
      default:
        statusColor = Colors.red;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Salon & Status badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  booking.salon?.name ?? 'Premium Salon',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withOpacity(0.3), width: 1),
                ),
                child: Text(
                  booking.status,
                  style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const Divider(color: Color(0xFF1F2937), height: 24),

          // Service and styling details
          Row(
            children: [
              const Icon(Icons.spa_rounded, color: Colors.grey, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  booking.service?.name ?? 'Styling Service',
                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person_rounded, color: Colors.grey, size: 16),
              const SizedBox(width: 8),
              Text(
                'Stylist: ${booking.staff?.name ?? "Any available"}',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded, color: Colors.grey, size: 16),
              const SizedBox(width: 8),
              Text(
                '${booking.bookingDate.day}/${booking.bookingDate.month}/${booking.bookingDate.year} at ${booking.startTime}',
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Cost and actions row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total: \$${booking.totalPrice.toStringAsFixed(2)}',
                style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 15),
              ),
              if (booking.status == 'PENDING' || booking.status == 'ACCEPTED')
                TextButton(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: const Color(0xFF111827),
                        title: const Text('Cancel Booking', style: TextStyle(color: Colors.white)),
                        content: const Text('Are you sure you want to cancel this booking?', style: TextStyle(color: Colors.grey)),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(ctx).pop(false),
                            child: const Text('No', style: TextStyle(color: Colors.grey)),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(ctx).pop(true),
                            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
                          ),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      ref.read(bookingProvider.notifier).cancelBooking(booking.id);
                    }
                  },
                  child: const Text('Cancel Visit', style: TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
