import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_service.dart';
import '../../data/models/salon_model.dart';

class OwnerSalonState {
  final List<SalonModel> salons;
  final bool isLoading;
  final String? errorMessage;

  OwnerSalonState({
    this.salons = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  OwnerSalonState copyWith({
    List<SalonModel>? salons,
    bool? isLoading,
    String? errorMessage,
  }) {
    return OwnerSalonState(
      salons: salons ?? this.salons,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class OwnerSalonNotifier extends StateNotifier<OwnerSalonState> {
  final ApiService _apiService = ApiService();

  OwnerSalonNotifier() : super(OwnerSalonState()) {
    fetchMySalons();
  }

  Future<void> fetchMySalons() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.get('/salons/my');
      if (res.statusCode == 200) {
        final list = (res.data['salons'] as List)
            .map((s) => SalonModel.fromJson(s))
            .toList();
        state = OwnerSalonState(salons: list);
      } else {
        state = state.copyWith(errorMessage: 'Failed to fetch salons', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<bool> createSalon({
    required String name,
    required String description,
    required String address,
    required String city,
    required String stateVal,
    required double lat,
    required double lng,
    required String phone,
    required String imageUrl,
    required String openTime,
    required String closeTime,
    required int seats,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/salons', data: {
        'name': name,
        'description': description,
        'address': address,
        'city': city,
        'state': stateVal,
        'lat': lat,
        'lng': lng,
        'phone': phone,
        'imageUrl': imageUrl,
        'openTime': openTime,
        'closeTime': closeTime,
        'totalSeats': seats,
      });

      if (res.statusCode == 201) {
        fetchMySalons();
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to create salon',
          isLoading: false,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
      return false;
    }
  }
}

final ownerSalonProvider = StateNotifierProvider<OwnerSalonNotifier, OwnerSalonState>((ref) {
  return OwnerSalonNotifier();
});
