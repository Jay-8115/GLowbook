import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/screens/login_screen.dart';
import '../../presentation/screens/register_screen.dart';
import '../../presentation/screens/dashboard_screen.dart';
import '../../presentation/screens/bookings_management_screen.dart';
import '../../presentation/screens/salon_management_screen.dart';
import '../../presentation/screens/services_management_screen.dart';
import '../../application/providers/auth_provider.dart';

class MainNavigationShell extends StatefulWidget {
  final Widget child;
  const MainNavigationShell({super.key, required this.child});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  void _onTabTapped(BuildContext context, int index) {
    setState(() {
      _currentIndex = index;
    });
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/bookings');
        break;
      case 2:
        context.go('/services');
        break;
      case 3:
        context.go('/salon');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => _onTabTapped(context, index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF090D16),
        selectedItemColor: const Color(0xFF8B5CF6),
        unselectedItemColor: Colors.grey[500],
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_rounded),
            label: 'Appointments',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.design_services_rounded),
            label: 'Services',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.store_rounded),
            label: 'My Salon',
          ),
        ],
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: authState.user == null ? '/login' : '/dashboard',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainNavigationShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/bookings',
            builder: (context, state) => const BookingsManagementScreen(),
          ),
          GoRoute(
            path: '/services',
            builder: (context, state) => const ServicesManagementScreen(),
          ),
          GoRoute(
            path: '/salon',
            builder: (context, state) => const SalonManagementScreen(),
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      final loggedIn = ref.read(authProvider).user != null;
      final goingToAuth = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!loggedIn && !goingToAuth) return '/login';
      if (loggedIn && goingToAuth) return '/dashboard';
      return null;
    },
  );
});
