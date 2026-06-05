import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/auth_provider.dart';
import '../../application/providers/owner_booking_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final bookingState = ref.watch(ownerBookingProvider);

    // Calculate metrics
    final pendingCount = bookingState.bookings.where((b) => b.status == 'PENDING').length;
    final activeCount = bookingState.bookings.where((b) => b.status == 'ACCEPTED' || b.status == 'IN_PROGRESS').length;
    final totalRevenue = bookingState.bookings
        .where((b) => b.status == 'COMPLETED')
        .fold(0.0, (sum, b) => sum + b.totalPrice);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.read(ownerBookingProvider.notifier).fetchOwnerBookings();
          },
          color: const Color(0xFF8B5CF6),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),
                
                // Welcome header & Log out
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome, ${authState.user?.name.split(" ").first ?? "Partner"}! 💼',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Your salon health dashboard overview',
                          style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                      onPressed: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) {
                          context.go('/login');
                        }
                      },
                    )
                  ],
                ),
                const SizedBox(height: 28),

                // Revenue card (Premium Gradient)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF8B5CF6).withOpacity(0.2),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      )
                    ]
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'SALON REVENUE (NET)',
                            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                          ),
                          const Icon(Icons.trending_up_rounded, color: Colors.white, size: 20),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '\$${totalRevenue.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '10% GlowBook service commission already deducted.',
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // KPI Small cards
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111827),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.04)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Pending Request', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            Text('$pendingCount orders', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.amber)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111827),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.04)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Active Stylists', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            Text('$activeCount booked', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.blue)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Today's appointments title
                const Text(
                  'Upcoming Scheduled Visits',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 14),

                if (bookingState.isLoading)
                  const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
                else if (bookingState.bookings.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Text('No bookings scheduled yet.', style: TextStyle(color: Colors.grey[500])),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: bookingState.bookings.length > 5 ? 5 : bookingState.bookings.length,
                    itemBuilder: (context, index) {
                      final booking = bookingState.bookings[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111827),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(booking.customerName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                const SizedBox(height: 4),
                                Text('${booking.serviceName} • Stylist: ${booking.staffName}', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(booking.startTime, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF8B5CF6))),
                                Text(booking.status, style: const TextStyle(fontSize: 9, color: Colors.grey, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
