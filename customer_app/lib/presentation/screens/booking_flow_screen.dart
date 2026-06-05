import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/booking_provider.dart';
import '../../data/models/salon_model.dart';

class BookingFlowScreen extends ConsumerStatefulWidget {
  final SalonModel salon;
  final ServiceModel service;

  const BookingFlowScreen({
    super.key,
    required this.salon,
    required this.service,
  });

  @override
  ConsumerState<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends ConsumerState<BookingFlowScreen> {
  StaffModel? _selectedStaff;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String? _selectedTime;
  final _notesController = TextEditingController();

  final List<String> _timeSlots = const [
    '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00'
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_selectedStaff == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a stylist/staff member.')),
      );
      return;
    }
    if (_selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a time slot.')),
      );
      return;
    }

    final success = await ref.read(bookingProvider.notifier).createBooking(
          salonId: widget.salon.id,
          serviceId: widget.service.id,
          staffId: _selectedStaff!.id,
          date: _selectedDate,
          startTime: _selectedTime!,
          endTime: _selectedTime!, // mock simplified slot duration
          notes: _notesController.text.trim(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking placed successfully!')),
      );
      context.go('/bookings');
    } else {
      final state = ref.read(bookingProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.errorMessage ?? 'Failed to place booking')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = ref.watch(bookingProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text('Book Appointment', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Selected Service summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Icon(Icons.spa_rounded, color: Colors.purple[300], size: 24),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.service.name, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
                        const SizedBox(height: 2),
                        Text(widget.salon.name, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                      ],
                    ),
                  ),
                  Text(
                    '\$${widget.service.price.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 16),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Select Staff member
            const Text('Select Stylist / Staff', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
            const SizedBox(height: 12),
            SizedBox(
              height: 90,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: widget.salon.staff.length,
                itemBuilder: (context, index) {
                  final staff = widget.salon.staff[index];
                  final isSelected = _selectedStaff?.id == staff.id;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedStaff = staff),
                    child: Container(
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF8B5CF6) : const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundImage: staff.avatarUrl != null ? NetworkImage(staff.avatarUrl!) : null,
                            child: staff.avatarUrl == null ? const Icon(Icons.person, size: 20) : null,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            staff.name,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : Colors.grey[300],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // Date picker field
            const Text('Select Date', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                  builder: (context, child) {
                    return Theme(
                      data: Theme.of(context).copyWith(
                        colorScheme: const ColorScheme.dark(
                          primary: Color(0xFF8B5CF6),
                          surface: Color(0xFF111827),
                          onSurface: Colors.white,
                        ),
                      ),
                      child: child!,
                    );
                  },
                );
                if (date != null) {
                  setState(() => _selectedDate = date);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    const Icon(Icons.calendar_today_rounded, color: Colors.grey, size: 18),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Time Slots Grid
            const Text('Select Time Slot', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.2,
              ),
              itemCount: _timeSlots.length,
              itemBuilder: (context, index) {
                final time = _timeSlots[index];
                final isSelected = _selectedTime == time;
                return GestureDetector(
                  onTap: () => setState(() => _selectedTime = time),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF8B5CF6) : const Color(0xFF111827),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        time,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey[400],
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // Notes field
            const Text('Special Instructions', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15)),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesController,
              style: const TextStyle(color: Colors.white),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Any specific styles, allergies, or requirements...',
                hintStyle: TextStyle(color: Colors.grey[600]),
                filled: true,
                fillColor: const Color(0xFF111827),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 40),

            // Action Button
            ElevatedButton(
              onPressed: bookingState.isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B5CF6),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                minimumSize: const Size(double.infinity, 50),
              ),
              child: bookingState.isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Confirm Appointment Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}
