import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/auth_provider.dart';
import '../../application/providers/salon_provider.dart';
import '../../application/providers/location_provider.dart';
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
    final loc = ref.read(locationProvider);
    ref.read(salonProvider.notifier).fetchSalons(
          search: _searchController.text,
          categoryId: _selectedCategoryId,
          lat: loc.latitude,
          lng: loc.longitude,
          radius: loc.radius,
          city: loc.currentCity,
          sortBy: loc.sortBy,
        );
  }

  void _showCityPicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select Location / City',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.my_location_rounded, color: Color(0xFF8B5CF6)),
              title: const Text('Use Current GPS Location', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              onTap: () {
                ref.read(locationProvider.notifier).requestAndFetchLocation();
                Navigator.pop(ctx);
              },
            ),
            const Divider(color: Colors.white12),
            ...['Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Mumbai'].map(
              (city) => ListTile(
                title: Text(city, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.grey),
                onTap: () {
                  ref.read(locationProvider.notifier).selectManualCity(city);
                  Navigator.pop(ctx);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final salonState = ref.watch(salonProvider);
    final locationState = ref.watch(locationProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.read(salonProvider.notifier).fetchSalons(
              lat: locationState.latitude,
              lng: locationState.longitude,
              radius: locationState.radius,
              city: locationState.currentCity,
              sortBy: locationState.sortBy,
            );
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
                
                // Welcome User Header & Location
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${authState.user?.name ?? "Guest"}! 👋',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: () => _showCityPicker(context, ref),
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF8B5CF6)),
                              const SizedBox(width: 4),
                              Text(
                                '${locationState.currentCity} (Change)',
                                style: const TextStyle(
                                  color: Color(0xFF8B5CF6),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
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
                const SizedBox(height: 24),

                // Search Radius Filters
                const Text(
                  'Search Radius',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [2.0, 5.0, 10.0, 20.0].map((d) {
                      final isSelected = locationState.radius == d;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            'Within ${d.toInt()} KM',
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.grey[450],
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF8B5CF6),
                          backgroundColor: const Color(0xFF111827),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide.none,
                          ),
                          onSelected: (_) {
                            ref.read(locationProvider.notifier).setRadius(d);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 20),

                // Sorting drop-down selector
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Sort Salons By',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    DropdownButton<String>(
                      value: locationState.sortBy,
                      dropdownColor: const Color(0xFF111827),
                      underline: const SizedBox(),
                      style: const TextStyle(color: Color(0xFF8B5CF6), fontSize: 13, fontWeight: FontWeight.bold),
                      icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF8B5CF6)),
                      items: const [
                        DropdownMenuItem(value: 'nearest', child: Text('Nearest Distance')),
                        DropdownMenuItem(value: 'rating', child: Text('Highest Rated')),
                        DropdownMenuItem(value: 'popular', child: Text('Most Popular')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          ref.read(locationProvider.notifier).setSortBy(val);
                        }
                      },
                    ),
                  ],
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
                      if (salon.distance != null) ...[
                        const SizedBox(width: 12),
                        Text(
                          '${salon.distance} KM',
                          style: const TextStyle(fontSize: 11, color: Colors.greenAccent, fontWeight: FontWeight.bold),
                        ),
                      ],
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
