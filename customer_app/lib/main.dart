import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/navigation/router.dart';
import 'application/providers/permission_provider.dart';
import 'application/providers/location_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: GlowBookCustomerApp(),
    ),
  );
}

class GlowBookCustomerApp extends ConsumerStatefulWidget {
  const GlowBookCustomerApp({super.key});

  @override
  ConsumerState<GlowBookCustomerApp> createState() => _GlowBookCustomerAppState();
}

class _GlowBookCustomerAppState extends ConsumerState<GlowBookCustomerApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-check all permission statuses immediately on app resume
      ref.read(permissionProvider.notifier).checkAllPermissions();
      // Recheck location service status & coordinates
      ref.read(locationProvider.notifier).requestAndFetchLocation();
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'GlowBook Customer',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF090D16),
        primaryColor: const Color(0xFF8B5CF6),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFF1F2937),
          surface: Color(0xFF111827),
          error: Color(0xFFFF4D4D),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Colors.white70),
        ),
      ),
      routerConfig: router,
    );
  }
}
