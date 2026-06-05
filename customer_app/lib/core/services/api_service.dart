import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  // Connect to backend server. For Android emulator use http://10.0.2.2:3000/api
  static const String baseUrl = 'http://localhost:3000/api';

  ApiService()
      : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        )) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Fetch token from secure storage
          final token = await _storage.read(key: 'accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          // Silent automatic refresh token handling can be injected here
          return handler.next(e);
        },
      ),
    );
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return dio.post(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return dio.patch(path, data: data);
  }

  Future<Response> delete(String path) async {
    return dio.delete(path);
  }
}
