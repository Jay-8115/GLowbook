import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/services/api_service.dart';
import '../../data/models/salon_model.dart';
import 'owner_salon_provider.dart';

class ServiceModel {
  final String id;
  final String name;
  final String description;
  final String category;
  final double price;
  final double? discountPrice;
  final int durationMinutes;
  final String imageUrl;
  final bool isPopular;
  final bool isActive;

  ServiceModel({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.price,
    this.discountPrice,
    required this.durationMinutes,
    required this.imageUrl,
    required this.isPopular,
    required this.isActive,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    return ServiceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category']?['name'] ?? json['category'] ?? 'General',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      discountPrice: (json['discountPrice'] as num?)?.toDouble(),
      durationMinutes: json['durationMinutes'] ?? 30,
      imageUrl: json['imageUrl'] ?? '',
      isPopular: json['isPopular'] ?? false,
      isActive: json['isActive'] ?? true,
    );
  }
}

class OwnerServiceState {
  final List<ServiceModel> services;
  final bool isLoading;
  final String? errorMessage;

  OwnerServiceState({
    this.services = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  OwnerServiceState copyWith({
    List<ServiceModel>? services,
    bool? isLoading,
    String? errorMessage,
  }) {
    return OwnerServiceState(
      services: services ?? this.services,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class OwnerServiceNotifier extends StateNotifier<OwnerServiceState> {
  final ApiService _apiService = ApiService();
  final Ref _ref;

  OwnerServiceNotifier(this._ref) : super(OwnerServiceState()) {
    // Listen for owner salon changes to fetch services
    _ref.listen(ownerSalonProvider, (previous, next) {
      if (next.salons.isNotEmpty) {
        fetchServices(next.salons.first.id);
      }
    });

    final salonsState = _ref.read(ownerSalonProvider);
    if (salonsState.salons.isNotEmpty) {
      fetchServices(salonsState.salons.first.id);
    }
  }

  String? get _activeSalonId {
    final salons = _ref.read(ownerSalonProvider).salons;
    return salons.isNotEmpty ? salons.first.id : null;
  }

  Future<void> fetchServices(String salonId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.get('/salons/$salonId/services');
      if (res.statusCode == 200) {
        final list = (res.data['services'] as List)
            .map((s) => ServiceModel.fromJson(s))
            .toList();
        state = OwnerServiceState(services: list);
      } else {
        state = state.copyWith(errorMessage: 'Failed to fetch services', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<void> refresh() async {
    final sId = _activeSalonId;
    if (sId != null) {
      await fetchServices(sId);
    }
  }

  Future<bool> addService({
    required String name,
    required String description,
    required String category,
    required double price,
    double? discountPrice,
    required int durationMinutes,
    required String imageUrl,
    required bool isPopular,
    required bool isActive,
  }) async {
    final salonId = _activeSalonId;
    if (salonId == null) {
      state = state.copyWith(errorMessage: 'No active salon selected');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/salon/services', data: {
        'salonId': salonId,
        'name': name,
        'description': description,
        'category': category,
        'price': price,
        'discountPrice': discountPrice,
        'durationMinutes': durationMinutes,
        'imageUrl': imageUrl.isEmpty ? null : imageUrl,
        'isPopular': isPopular,
        'isActive': isActive,
      });

      if (res.statusCode == 201 || res.statusCode == 200) {
        await fetchServices(salonId);
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to add service',
          isLoading: false,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
      return false;
    }
  }

  Future<bool> editService({
    required String id,
    required String name,
    required String description,
    required String category,
    required double price,
    double? discountPrice,
    required int durationMinutes,
    required String imageUrl,
    required bool isPopular,
    required bool isActive,
  }) async {
    final salonId = _activeSalonId;
    if (salonId == null) return false;

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/salon/services/$id', data: {
        'salonId': salonId,
        'name': name,
        'description': description,
        'category': category,
        'price': price,
        'discountPrice': discountPrice,
        'durationMinutes': durationMinutes,
        'imageUrl': imageUrl.isEmpty ? null : imageUrl,
        'isPopular': isPopular,
        'isActive': isActive,
      });

      if (res.statusCode == 200) {
        await fetchServices(salonId);
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to edit service',
          isLoading: false,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
      return false;
    }
  }

  Future<bool> deleteService(String id) async {
    final salonId = _activeSalonId;
    if (salonId == null) return false;

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.delete('/salon/services/$id');
      if (res.statusCode == 200) {
        await fetchServices(salonId);
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to delete service',
          isLoading: false,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
      return false;
    }
  }

  Future<bool> toggleServiceStatus(String id, bool isActive) async {
    final salonId = _activeSalonId;
    if (salonId == null) return false;

    try {
      final res = await _apiService.patch('/salon/services/$id/status', data: {
        'isActive': isActive,
      });
      if (res.statusCode == 200) {
        // Optimistically update status
        state = state.copyWith(
          services: state.services.map((s) => s.id == id ? ServiceModel(
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            price: s.price,
            discountPrice: s.discountPrice,
            durationMinutes: s.durationMinutes,
            imageUrl: s.imageUrl,
            isPopular: s.isPopular,
            isActive: isActive,
          ) : s).toList()
        );
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Bulk Operations
  Future<bool> bulkDelete(List<String> ids) async {
    final salonId = _activeSalonId;
    if (salonId == null) return false;

    state = state.copyWith(isLoading: true);
    try {
      for (final id in ids) {
        await _apiService.delete('/salon/services/$id');
      }
      await fetchServices(salonId);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed during bulk delete', isLoading: false);
      return false;
    }
  }

  Future<bool> bulkToggleStatus(List<String> ids, bool isActive) async {
    final salonId = _activeSalonId;
    if (salonId == null) return false;

    state = state.copyWith(isLoading: true);
    try {
      for (final id in ids) {
        await _apiService.patch('/salon/services/$id/status', data: {
          'isActive': isActive,
        });
      }
      await fetchServices(salonId);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed during bulk status toggle', isLoading: false);
      return false;
    }
  }
}

final ownerServiceProvider = StateNotifierProvider<OwnerServiceNotifier, OwnerServiceState>((ref) {
  return OwnerServiceNotifier(ref);
});
