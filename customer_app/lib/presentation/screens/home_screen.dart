import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/auth_provider.dart';
import '../../application/providers/salon_provider.dart';
import '../../data/models/salon_model.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();
  String? _selectedCategoryId;

  final List<Map<String, String>> _categories = const [
    {'name': 'All', 'icon': '💇'},
    {'name': 'Haircuts & Styling', 'icon': '✂️'},
    {'name': 'Nail Services', 'icon': '💅'},
    {'name': 'Facial & Skin Care', 'icon': '💆'},
    {'name': 'Massage Therapy', 'icon': '🧖'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    ref.read(salonProvider.notifier).fetchSalons(
          search: _searchController.text,
          categoryId: _selectedCategoryId,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final salonState = ref.watch(salonProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.read(salonProvider.notifier).fetchSalons();
            ref.read(salonProvider.notifier).fetchFeaturedSalons();
          },
          color: const Color(0xFF8B5CF6),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),
                
                // Welcome User Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${authState.user?.name ?? "Guest"}! 👋',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Find and book your next self-care session',
                          style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                        ),
                      ],
                    ),
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: const Color(0xFF111827),
                      backgroundImage: authState.user?.avatarUrl != null
                          ? NetworkImage(authState.user!.avatarUrl!)
                          : null,
                      child: authState.user?.avatarUrl == null
                          ? const Icon(Icons.person_rounded, color: Colors.grey)
                          : null,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Search Bar
                TextField(
                  controller: _searchController,
                  onChanged: (_) => _onSearchChanged(),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search salons, styling, nails...',
                    hintStyle: TextStyle(color: Colors.grey[600]),
                    prefixIcon: const Icon(Icons.search_rounded, color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF111827),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Categories Row
                const Text(
                  'Categories',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 44,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final cat = _categories[index];
                      final isSelected = index == 0 && _selectedCategoryId == null;
                      return Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: ChoiceChip(
                          label: Text(
                            '${cat['icon']} ${cat['name']}',
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.grey[400],
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF8B5CF6),
                          backgroundColor: const Color(0xFF111827),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide.none,
                          ),
                          onSelected: (selected) {
                            setState(() {
                              _selectedCategoryId = null; // simple mock toggle
                            });
                            _onSearchChanged();
                          },
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 28),

                // Featured Salons Carousel
                if (salonState.featuredSalons.isNotEmpty) ...[
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Featured Partners',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      Text(
                        'See All',
                        style: TextStyle(color: Color(0xFF8B5CF6), fontSize: 13, fontWeight: FontWeight.bold),
                      )
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 220,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: salonState.featuredSalons.length,
                      itemBuilder: (context, index) {
                        final salon = salonState.featuredSalons[index];
                        return _buildFeaturedCard(context, salon);
                      },
                    ),
                  ),
                  const SizedBox(height: 28),
                ],

                // General Salon Listing
                const Text(
                  'Popular Salons Nearby',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 14),
                
                if (salonState.isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 30),
                      child: CircularProgressIndicator(color: Color(0xFF8B5CF6)),
                    ),
                  )
                else if (salonState.salons.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Text('No salons match your search.', style: TextStyle(color: Colors.grey[500])),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: salonState.salons.length,
                    itemBuilder: (context, index) {
                      final salon = salonState.salons[index];
                      return _buildSalonRowItem(context, salon);
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

  Widget _buildFeaturedCard(BuildContext context, SalonModel salon) {
    return GestureDetector(
      onTap: () => context.push('/salon/${salon.id}'),
      child: Container(
        width: 260,
        margin: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Image.network(
                salon.imageUrl.isNotEmpty
                    ? salon.imageUrl
                    : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300',
                fit: BoxFit.cover,
                width: double.infinity,
                errorBuilder: (_, __, ___) => Container(color: Colors.grey[800]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    salon.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        salon.avgRating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        salon.city,
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSalonRowItem(BuildContext context, SalonModel salon) {
    return GestureDetector(
      onTap: () => context.push('/salon/${salon.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                salon.imageUrl.isNotEmpty ? salon.imageUrl : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=150',
                width: 76,
                height: 76,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.grey[800], width: 76, height: 76),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    salon.name,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    salon.address,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        salon.avgRating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${salon.openTime} - ${salon.closeTime}',
                        style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
