import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/services/api_service.dart';
import '../../data/models/user_model.dart';

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;

  AuthState({this.user, this.isLoading = false, this.errorMessage});

  AuthState copyWith({UserModel? user, bool? isLoading, String? errorMessage}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthNotifier() : super(AuthState()) {
    tryAutoLogin();
  }

  Future<void> tryAutoLogin() async {
    state = state.copyWith(isLoading: true);
    final token = await _storage.read(key: 'ownerAccessToken');
    if (token == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    try {
      final res = await _apiService.get('/auth/me');
      if (res.statusCode == 200) {
        state = AuthState(user: UserModel.fromJson(res.data['user']));
      } else {
        await logout();
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Network error');
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (res.statusCode == 200) {
        final role = res.data['user']['role'];
        if (role != 'OWNER' && role != 'ADMIN') {
          state = AuthState(errorMessage: 'Access denied: You must be a Salon Owner');
          return false;
        }

        final accessToken = res.data['accessToken'];
        final refreshToken = res.data['refreshToken'];

        await _storage.write(key: 'ownerAccessToken', value: accessToken);
        await _storage.write(key: 'ownerRefreshToken', value: refreshToken);

        state = AuthState(user: UserModel.fromJson(res.data['user']));
        return true;
      } else {
        state = AuthState(errorMessage: res.data['error'] ?? 'Login failed');
        return false;
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Connection failed');
      return false;
    }
  }

  Future<bool> register(String name, String email, String password, String? phone) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiService.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
        'role': 'OWNER',
      });

      if (res.statusCode == 201) {
        final accessToken = res.data['accessToken'];
        final refreshToken = res.data['refreshToken'];

        await _storage.write(key: 'ownerAccessToken', value: accessToken);
        await _storage.write(key: 'ownerRefreshToken', value: refreshToken);

        state = AuthState(user: UserModel.fromJson(res.data['user']));
        return true;
      } else {
        state = AuthState(errorMessage: res.data['error'] ?? 'Registration failed');
        return false;
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Connection failed');
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await _apiService.post('/auth/logout');
    } catch (_) {}
    await _storage.delete(key: 'ownerAccessToken');
    await _storage.delete(key: 'ownerRefreshToken');
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
