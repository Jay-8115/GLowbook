import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/salon_provider.dart';
import '../../data/models/salon_model.dart';

class SalonDetailScreen extends ConsumerStatefulWidget {
  final String salonId;
  const SalonDetailScreen({super.key, required this.salonId});

  @override
  ConsumerState<SalonDetailScreen> createState() => _SalonDetailScreenState();
}

class _SalonDetailScreenState extends ConsumerState<SalonDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(salonProvider.notifier).fetchSalonDetails(widget.salonId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final salonState = ref.watch(salonProvider);
    final salon = salonState.selectedSalon;

    if (salonState.isLoading || salon == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF090D16),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6))),
      );
    }

    final isFav = salonState.favoriteSalons.any((s) => s.id == salon.id);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: CustomScrollView(
        slivers: [
          // Banner Image Header
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: const Color(0xFF090D16),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            actions: [
              IconButton(
                icon: Icon(
                  isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  color: isFav ? Colors.red : Colors.white,
                ),
                onPressed: () {
                  ref.read(salonProvider.notifier).toggleFavorite(salon.id, isFav);
                },
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Image.network(
                salon.imageUrl.isNotEmpty ? salon.imageUrl : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.grey[800]),
              ),
            ),
          ),
          
          // Salon Details
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    salon.name,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                      const SizedBox(width: 4),
                      Text(
                        salon.avgRating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '(${salon.totalReviews} reviews)',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    salon.description,
                    style: TextStyle(fontSize: 13, color: Colors.grey[400], height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  
                  // Location and phone
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, color: Color(0xFF8B5CF6), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${salon.address}, ${salon.city}',
                          style: const TextStyle(fontSize: 13, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.phone_outlined, color: Color(0xFF8B5CF6), size: 18),
                      const SizedBox(width: 8),
                      Text(
                        salon.phone,
                        style: const TextStyle(fontSize: 13, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Staff list
                  if (salon.staff.isNotEmpty) ...[
                    const Text(
                      'Our Stylists & Staff',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 80,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: salon.staff.length,
                        itemBuilder: (context, index) {
                          final member = salon.staff[index];
                          return Container(
                            margin: const EdgeInsets.only(right: 14),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF111827),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 18,
                                  backgroundImage: member.avatarUrl != null 
                                      ? NetworkImage(member.avatarUrl!) 
                                      : null,
                                  child: member.avatarUrl == null 
                                      ? const Icon(Icons.person, size: 18) 
                                      : null,
                                ),
                                const SizedBox(width: 10),
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(member.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                                    Text(member.role, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Services Listing
                  const Text(
                    'Available Services',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  
                  if (salon.services.isEmpty)
                    Text('No services currently available.', style: TextStyle(color: Colors.grey[500]))
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: salon.services.length,
                      itemBuilder: (context, index) {
                        final svc = salon.services[index];
                        return _buildServiceItem(context, salon, svc);
                      },
                    ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildServiceItem(BuildContext context, SalonModel salon, ServiceModel service) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service.name,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  service.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      '\$${service.price.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Icon(Icons.access_time_rounded, size: 14, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      '${service.durationMinutes} mins',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          ElevatedButton(
            onPressed: () {
              context.push('/book', extra: {
                'salon': salon,
                'service': service,
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Book', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
