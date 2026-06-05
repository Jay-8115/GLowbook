import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_service.dart';
import '../../data/models/booking_model.dart';

class BookingState {
  final List<BookingModel> bookings;
  final bool isLoading;
  final String? errorMessage;

  BookingState({
    this.bookings = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  BookingState copyWith({
    List<BookingModel>? bookings,
    bool? isLoading,
    String? errorMessage,
  }) {
    return BookingState(
      bookings: bookings ?? this.bookings,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class BookingNotifier extends StateNotifier<BookingState> {
  final ApiService _apiService = ApiService();

  BookingNotifier() : super(BookingState()) {
    fetchBookings();
  }

  Future<void> fetchBookings() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.get('/bookings');
      if (res.statusCode == 200) {
        final list = (res.data['bookings'] as List)
            .map((b) => BookingModel.fromJson(b))
            .toList();
        state = state.copyWith(bookings: list, isLoading: false);
      } else {
        state = state.copyWith(errorMessage: 'Failed to fetch bookings', isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
    }
  }

  Future<bool> createBooking({
    required String salonId,
    required String serviceId,
    required String staffId,
    required DateTime date,
    required String startTime,
    required String endTime,
    String? notes,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/bookings', data: {
        'salonId': salonId,
        'serviceId': serviceId,
        'staffId': staffId,
        'bookingDate': date.toIso8601String(),
        'startTime': startTime,
        'endTime': endTime,
        'notes': notes,
      });

      if (res.statusCode == 201) {
        fetchBookings();
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to place booking',
          isLoading: false,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error', isLoading: false);
      return false;
    }
  }

  Future<bool> cancelBooking(String bookingId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.patch('/bookings/$bookingId/status', data: {
        'status': 'CANCELLED',
      });

      if (res.statusCode == 200) {
        fetchBookings();
        return true;
      } else {
        state = state.copyWith(
          errorMessage: res.data['error'] ?? 'Failed to cancel booking',
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

final bookingProvider = StateNotifierProvider<BookingNotifier, BookingState>((ref) {
  return BookingNotifier();
});
