import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_service.dart';
import '../../data/models/salon_model.dart';

class SalonState {
  final List<SalonModel> salons;
  final List<SalonModel> featuredSalons;
  final List<SalonModel> favoriteSalons;
  final SalonModel? selectedSalon;
  final bool isLoading;
  final String? errorMessage;

  SalonState({
    this.salons = const [],
    this.featuredSalons = const [],
    this.favoriteSalons = const [],
    this.selectedSalon,
    this.isLoading = false,
    this.errorMessage,
  });

  SalonState copyWith({
    List<SalonModel>? salons,
    List<SalonModel>? featuredSalons,
    List<SalonModel>? favoriteSalons,
    SalonModel? selectedSalon,
    bool? isLoading,
    String? errorMessage,
  }) {
    return SalonState(
      salons: salons ?? this.salons,
      featuredSalons: featuredSalons ?? this.featuredSalons,
      favoriteSalons: favoriteSalons ?? this.favoriteSalons,
      selectedSalon: selectedSalon ?? this.selectedSalon,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class SalonNotifier extends StateNotifier<SalonState> {
  final ApiService _apiService = ApiService();

  SalonNotifier() : super(SalonState()) {
    fetchSalons();
    fetchFeaturedSalons();
    fetchFavorites();
  }

  Future<void> fetchSalons({
    String? search,
    String? categoryId,
    double? lat,
    double? lng,
    double? radius,
    String? city,
    String? sortBy,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final Map<String, dynamic> queryParams = {};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (categoryId != null && categoryId.isNotEmpty) queryParams['categoryId'] = categoryId;
      if (lat != null && lng != null) {
        queryParams['lat'] = lat.toString();
        queryParams['lng'] = lng.toString();
      }
      if (radius != null) {
        queryParams['radius'] = radius.toString();
      }
      if (city != null && city.isNotEmpty) {
        queryParams['city'] = city;
      }
      if (sortBy != null && sortBy.isNotEmpty) {
        queryParams['sortBy'] = sortBy;
      }

      final res = await _apiService.get('/salons', queryParameters: queryParams);
      if (res.statusCode == 200) {
        final list = (res.data['salons'] as List)
            .map((s) => SalonModel.fromJson(s))
            .toList();
        state = state.copyWith(salons: list, isLoading: false);
      } else {
        state = state.copyWith(errorMessage: 'Failed to fetch salons', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<void> fetchFeaturedSalons() async {
    try {
      final res = await _apiService.get('/salons/featured');
      if (res.statusCode == 200) {
        final list = (res.data['salons'] as List)
            .map((s) => SalonModel.fromJson(s))
            .toList();
        state = state.copyWith(featuredSalons: list);
      }
    } catch (_) {}
  }

  Future<void> fetchSalonDetails(String id) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.get('/salons/$id');
      if (res.statusCode == 200) {
        final salon = SalonModel.fromJson(res.data['salon']);
        state = state.copyWith(selectedSalon: salon, isLoading: false);
      } else {
        state = state.copyWith(errorMessage: 'Salon not found', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<void> fetchFavorites() async {
    try {
      final res = await _apiService.get('/users/favorites');
      if (res.statusCode == 200) {
        final list = (res.data['favorites'] as List)
            .map((s) => SalonModel.fromJson(s))
            .toList();
        state = state.copyWith(favoriteSalons: list);
      }
    } catch (_) {}
  }

  Future<bool> toggleFavorite(String salonId, bool isFav) async {
    try {
      if (isFav) {
        // Delete favorite
        final res = await _apiService.delete('/users/favorites/$salonId');
        if (res.statusCode == 200) {
          fetchFavorites();
          return true;
        }
      } else {
        // Add favorite
        final res = await _apiService.post('/users/favorites/$salonId');
        if (res.statusCode == 201 || res.statusCode == 200) {
          fetchFavorites();
          return true;
        }
      }
    } catch (_) {}
    return false;
  }
}

final salonProvider = StateNotifierProvider<SalonNotifier, SalonState>((ref) {
  return SalonNotifier();
});
