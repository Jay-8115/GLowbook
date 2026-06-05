import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/providers/owner_booking_provider.dart';
import '../../data/models/booking_model.dart';

class BookingsManagementScreen extends ConsumerStatefulWidget {
  const BookingsManagementScreen({super.key});

  @override
  ConsumerState<BookingsManagementScreen> createState() => _BookingsManagementScreenState();
}

class _BookingsManagementScreenState extends ConsumerState<BookingsManagementScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(ownerBookingProvider.notifier).fetchOwnerBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ownerBookingProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text('Salon Appointments', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
          : RefreshIndicator(
              onRefresh: () async {
                ref.read(ownerBookingProvider.notifier).fetchOwnerBookings();
              },
              color: const Color(0xFF8B5CF6),
              child: state.bookings.isEmpty
                  ? const Center(
                      child: Text('No bookings found.', style: TextStyle(color: Colors.grey)),
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      itemCount: state.bookings.length,
                      itemBuilder: (context, index) {
                        final booking = state.bookings[index];
                        return _buildBookingActionCard(context, booking);
                      },
                    ),
            ),
    );
  }

  Widget _buildBookingActionCard(BuildContext context, BookingModel booking) {
    Color statusColor;
    switch (booking.status) {
      case 'COMPLETED':
        statusColor = const Color(0xFF10B981);
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                booking.customerName,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  booking.status,
                  style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Client Contact: ${booking.customerPhone}',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),
          const Divider(color: Color(0xFF1F2937), height: 24),
          
          Text('Service: ${booking.serviceName}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text('Stylist: ${booking.staffName}', style: TextStyle(color: Colors.grey[400], fontSize: 13)),
          const SizedBox(height: 6),
          Text(
            'Scheduled: ${booking.bookingDate.day}/${booking.bookingDate.month}/${booking.bookingDate.year} at ${booking.startTime}',
            style: TextStyle(color: Colors.grey[400], fontSize: 13),
          ),
          
          if (booking.notes != null && booking.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8),
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF090D16),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Notes: ${booking.notes}',
                style: TextStyle(color: Colors.grey[400], fontSize: 11, fontStyle: FontStyle.italic),
              ),
            ),
          ],
          
          const Divider(color: Color(0xFF1F2937), height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Payout: \$${booking.totalPrice.toStringAsFixed(2)}',
                style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 15),
              ),
              _buildActionButtons(booking),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BookingModel booking) {
    final notifier = ref.read(ownerBookingProvider.notifier);

    if (booking.status == 'PENDING') {
      return Row(
        children: [
          ElevatedButton(
            onPressed: () => notifier.updateBookingStatus(booking.id, 'ACCEPTED'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Accept', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: () => notifier.updateBookingStatus(booking.id, 'CANCELLED'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.redAccent,
              side: const BorderSide(color: Colors.redAccent),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      );
    } else if (booking.status == 'ACCEPTED') {
      return ElevatedButton(
        onPressed: () => notifier.updateBookingStatus(booking.id, 'IN_PROGRESS'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.indigo,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: const Text('Start Service', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      );
    } else if (booking.status == 'IN_PROGRESS') {
      return ElevatedButton(
        onPressed: () => notifier.updateBookingStatus(booking.id, 'COMPLETED'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF10B981),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: const Text('Complete Service', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      );
    }

    return const SizedBox();
  }
}
