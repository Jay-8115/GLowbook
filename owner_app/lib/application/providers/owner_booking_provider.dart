import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_service.dart';
import '../../data/models/booking_model.dart';

class OwnerBookingState {
  final List<BookingModel> bookings;
  final bool isLoading;
  final String? errorMessage;

  OwnerBookingState({
    this.bookings = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  OwnerBookingState copyWith({
    List<BookingModel>? bookings,
    bool? isLoading,
    String? errorMessage,
  }) {
    return OwnerBookingState(
      bookings: bookings ?? this.bookings,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class OwnerBookingNotifier extends StateNotifier<OwnerBookingState> {
  final ApiService _apiService = ApiService();

  OwnerBookingNotifier() : super(OwnerBookingState()) {
    fetchOwnerBookings();
  }

  Future<void> fetchOwnerBookings() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.get('/bookings');
      if (res.statusCode == 200) {
        final list = (res.data['bookings'] as List)
            .map((b) => BookingModel.fromJson(b))
            .toList();
        state = OwnerBookingState(bookings: list);
      } else {
        state = state.copyWith(errorMessage: 'Failed to fetch bookings', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<bool> updateBookingStatus(String bookingId, String newStatus) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.patch('/bookings/$bookingId/status', data: {
        'status': newStatus,
      });

      if (res.statusCode == 200) {
        fetchOwnerBookings();
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to update status',
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

final ownerBookingProvider = StateNotifierProvider<OwnerBookingNotifier, OwnerBookingState>((ref) {
  return OwnerBookingNotifier();
});
