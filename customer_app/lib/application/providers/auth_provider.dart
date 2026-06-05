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
    final token = await _storage.read(key: 'accessToken');
    if (token == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    try {
      final res = await _apiService.get('/auth/me');
      if (res.statusCode == 200) {
        final userData = res.data['user'];
        state = AuthState(user: UserModel.fromJson(userData));
      } else {
        await logout();
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Network error during autologin');
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
        final accessToken = res.data['accessToken'];
        final refreshToken = res.data['refreshToken'];
        final userData = res.data['user'];

        await _storage.write(key: 'accessToken', value: accessToken);
        await _storage.write(key: 'refreshToken', value: refreshToken);

        state = AuthState(user: UserModel.fromJson(userData));
        return true;
      } else {
        state = AuthState(errorMessage: res.data['error'] ?? 'Login failed');
        return false;
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Connection failed. Please check internet.');
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
        'role': 'USER',
      });

      if (res.statusCode == 201) {
        final accessToken = res.data['accessToken'];
        final refreshToken = res.data['refreshToken'];
        final userData = res.data['user'];

        await _storage.write(key: 'accessToken', value: accessToken);
        await _storage.write(key: 'refreshToken', value: refreshToken);

        state = AuthState(user: UserModel.fromJson(userData));
        return true;
      } else {
        state = AuthState(errorMessage: res.data['error'] ?? 'Registration failed');
        return false;
      }
    } catch (e) {
      state = AuthState(errorMessage: 'Connection failed. Please check internet.');
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await _apiService.post('/auth/logout');
    } catch (_) {}
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
