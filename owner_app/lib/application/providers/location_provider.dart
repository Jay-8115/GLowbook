import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../data/repositories/location_repository.dart';
import 'permission_provider.dart';

final locationRepositoryProvider = Provider<LocationRepository>((ref) {
  return LocationRepository();
});

class LocationState {
  final double? latitude;
  final double? longitude;
  final bool isPermissionGranted;
  final bool isLoading;
  final String? errorMessage;

  LocationState({
    this.latitude,
    this.longitude,
    this.isPermissionGranted = false,
    this.isLoading = false,
    this.errorMessage,
  });

  LocationState copyWith({
    double? latitude,
    double? longitude,
    bool? isPermissionGranted,
    bool? isLoading,
    String? errorMessage,
  }) {
    return LocationState(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isPermissionGranted: isPermissionGranted ?? this.isPermissionGranted,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class LocationNotifier extends StateNotifier<LocationState> {
  final Ref _ref;
  final LocationRepository _repository;

  LocationNotifier(this._ref, this._repository) : super(LocationState()) {
    // Attempt fetch on load
    requestAndFetchLocation();

    // Listen to permission provider changes
    _ref.listen<PermissionState>(permissionProvider, (previous, next) {
      final wasLocationGranted = previous?.isLocationGranted ?? false;
      final isLocationGranted = next.isLocationGranted;
      if (!wasLocationGranted && isLocationGranted) {
        requestAndFetchLocation();
      }
    });
  }

  Future<void> requestAndFetchLocation() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final isServiceEnabled = await _repository.isLocationServiceEnabled();
      if (!isServiceEnabled) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Location services are disabled in device settings.',
        );
        return;
      }

      final isGranted = _ref.read(permissionProvider).isLocationGranted;
      if (!isGranted) {
        state = state.copyWith(
          isLoading: false,
          isPermissionGranted: false,
          errorMessage: 'Location permission not granted',
        );
        return;
      }

      final position = await _repository.getCurrentPosition();

      state = LocationState(
        latitude: position.latitude,
        longitude: position.longitude,
        isPermissionGranted: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to fetch GPS coordinates: $e',
      );
    }
  }

  Future<void> enableLocationFlow() async {
    final isServiceEnabled = await _repository.isLocationServiceEnabled();
    if (!isServiceEnabled) {
      await _repository.openLocationSettings();
      return;
    }

    final status = await _ref.read(permissionProvider.notifier).requestPermission(Permission.location);
    if (status.isGranted) {
      await requestAndFetchLocation();
    }
  }
}

final locationProvider = StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  final repository = ref.watch(locationRepositoryProvider);
  return LocationNotifier(ref, repository);
});
