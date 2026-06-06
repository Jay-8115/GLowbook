import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'salon_provider.dart';

class LocationState {
  final String currentCity;
  final double? latitude;
  final double? longitude;
  final double radius; // in km: 2, 5, 10, 20
  final String sortBy; // nearest, rating, popular
  final bool isPermissionGranted;
  final bool isLoading;
  final String? errorMessage;

  LocationState({
    this.currentCity = 'Rajkot',
    this.latitude,
    this.longitude,
    this.radius = 10.0,
    this.sortBy = 'rating',
    this.isPermissionGranted = false,
    this.isLoading = false,
    this.errorMessage,
  });

  LocationState copyWith({
    String? currentCity,
    double? latitude,
    double? longitude,
    double? radius,
    String? sortBy,
    bool? isPermissionGranted,
    bool? isLoading,
    String? errorMessage,
  }) {
    return LocationState(
      currentCity: currentCity ?? this.currentCity,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      radius: radius ?? this.radius,
      sortBy: sortBy ?? this.sortBy,
      isPermissionGranted: isPermissionGranted ?? this.isPermissionGranted,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class LocationNotifier extends StateNotifier<LocationState> {
  final Ref _ref;

  LocationNotifier(this._ref) : super(LocationState()) {
    // Attempt auto fetch GPS location on load
    requestAndFetchLocation();
  }

  Future<void> requestAndFetchLocation() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          state = state.copyWith(
            isLoading: false,
            isPermissionGranted: false,
            errorMessage: 'Location permission denied',
          );
          _triggerFetch();
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        state = state.copyWith(
          isLoading: false,
          isPermissionGranted: false,
          errorMessage: 'Location permission permanently denied',
        );
        _triggerFetch();
        return;
      }

      // Fetch Position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Fetch City via Reverse Geocoding
      String city = state.currentCity;
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(
          position.latitude,
          position.longitude,
        );
        if (placemarks.isNotEmpty) {
          city = placemarks.first.locality ?? placemarks.first.subAdministrativeArea ?? state.currentCity;
        }
      } catch (geocodingErr) {
        print('Reverse geocoding error: $geocodingErr');
      }

      state = LocationState(
        currentCity: city,
        latitude: position.latitude,
        longitude: position.longitude,
        isPermissionGranted: true,
        radius: state.radius,
        sortBy: state.sortBy,
      );

      _triggerFetch();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to fetch GPS coordinates',
      );
      _triggerFetch();
    }
  }

  void selectManualCity(String city) {
    // If user changes city manually, we clear the lat/lng coordinates (so backend queries by city name rather than GPS radius)
    // Unless they explicitly select "Use Current Location" again
    state = state.copyWith(
      currentCity: city,
      latitude: null,
      longitude: null,
    );
    _triggerFetch();
  }

  void setRadius(double km) {
    state = state.copyWith(radius: km);
    _triggerFetch();
  }

  void setSortBy(String sort) {
    state = state.copyWith(sortBy: sort);
    _triggerFetch();
  }

  void _triggerFetch() {
    // Inform salonProvider to query backend with new coordinates/filters
    _ref.read(salonProvider.notifier).fetchSalons(
      lat: state.latitude,
      lng: state.longitude,
      radius: state.radius,
      city: state.currentCity,
      sortBy: state.sortBy,
    );
  }
}

final locationProvider = StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier(ref);
});
