import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/providers/owner_salon_provider.dart';
import '../../data/models/salon_model.dart';

class SalonManagementScreen extends ConsumerStatefulWidget {
  const SalonManagementScreen({super.key});

  @override
  ConsumerState<SalonManagementScreen> createState() => _SalonManagementScreenState();
}

class _SalonManagementScreenState extends ConsumerState<SalonManagementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _addrController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _phoneController = TextEditingController();
  final _imageController = TextEditingController();
  final _openTimeController = TextEditingController(text: '09:00');
  final _closeTimeController = TextEditingController(text: '20:00');
  final _seatsController = TextEditingController(text: '2');

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final success = await ref.read(ownerSalonProvider.notifier).createSalon(
            name: _nameController.text.trim(),
            description: _descController.text.trim(),
            address: _addrController.text.trim(),
            city: _cityController.text.trim(),
            stateVal: _stateController.text.trim(),
            lat: 41.8781, // simulated coordinates
            lng: -87.6298,
            phone: _phoneController.text.trim(),
            imageUrl: _imageController.text.trim().isNotEmpty
                ? _imageController.text.trim()
                : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600',
            openTime: _openTimeController.text.trim(),
            closeTime: _closeTimeController.text.trim(),
            seats: int.parse(_seatsController.text.trim()),
          );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Salon registered successfully!')),
        );
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _addrController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _phoneController.dispose();
    _imageController.dispose();
    _openTimeController.dispose();
    _closeTimeController.dispose();
    _seatsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ownerSalonProvider);

    if (state.isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF090D16),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6))),
      );
    }

    // Check if user has an existing salon
    if (state.salons.isNotEmpty) {
      final salon = state.salons.first;
      return _buildSalonProfileView(salon);
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Register Your Salon',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'Provide details to publish your salon profile on the GlowBook customer marketplace.',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                const SizedBox(height: 28),
                
                // Form Fields
                _buildField(_nameController, 'Salon Name', 'e.g. Luxe Hair Lounge'),
                const SizedBox(height: 16),
                _buildField(_descController, 'Description', 'Describe your services, specializations...', maxLines: 3),
                const SizedBox(height: 16),
                _buildField(_addrController, 'Street Address', 'e.g. 742 Evergreen Terrace'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildField(_cityController, 'City', 'Springfield')),
                    const SizedBox(width: 14),
                    Expanded(child: _buildField(_stateController, 'State', 'IL')),
                  ],
                ),
                const SizedBox(height: 16),
                _buildField(_phoneController, 'Business Contact Phone', '+15550100', keyboardType: TextInputType.phone),
                const SizedBox(height: 16),
                _buildField(_imageController, 'Cover Image URL', 'https://unsplash.com/...'),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildField(_openTimeController, 'Open Time', '09:00')),
                    const SizedBox(width: 10),
                    Expanded(child: _buildField(_closeTimeController, 'Close Time', '20:00')),
                    const SizedBox(width: 10),
                    Expanded(child: _buildField(_seatsController, 'Seats/Capacity', '3', keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 36),

                ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B5CF6),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Publish Salon Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController controller,
    String label,
    String hint, {
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13),
            filled: true,
            fillColor: const Color(0xFF111827),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          validator: (val) {
            if (val == null || val.isEmpty) return '$label is required';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildSalonProfileView(SalonModel salon) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text('My Salon Profile', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(
                salon.imageUrl.isNotEmpty ? salon.imageUrl : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600',
                height: 180,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.grey[800], height: 180),
              ),
            ),
            const SizedBox(height: 20),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    salon.name,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: salon.isVerified 
                        ? const Color(0xFF10B981).withOpacity(0.15) 
                        : Colors.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    salon.isVerified ? 'VERIFIED' : 'PENDING REVIEW',
                    style: TextStyle(
                      color: salon.isVerified ? const Color(0xFF10B981) : Colors.amber,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                )
              ],
            ),
            const SizedBox(height: 12),
            Text(salon.description, style: TextStyle(color: Colors.grey[400], fontSize: 13, height: 1.5)),
            const SizedBox(height: 20),

            const Divider(color: Color(0xFF1F2937)),
            const SizedBox(height: 16),
            
            _buildInfoRow(Icons.location_on_outlined, 'Address', '${salon.address}, ${salon.city}, ${salon.state}'),
            _buildInfoRow(Icons.phone_outlined, 'Contact Phone', salon.phone),
            _buildInfoRow(Icons.access_time_rounded, 'Working Hours', '${salon.openTime} - ${salon.closeTime}'),
            _buildInfoRow(Icons.chair_rounded, 'Seats Capacity', '${salon.totalSeats} chairs available'),
            _buildInfoRow(Icons.star_rounded, 'Average Rating', '★ ${salon.avgRating.toStringAsFixed(1)} (${salon.totalReviews} reviews)'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF8B5CF6), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: Colors.grey[500], fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 13)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
