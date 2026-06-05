import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/screens/login_screen.dart';
import '../../presentation/screens/register_screen.dart';
import '../../presentation/screens/home_screen.dart';
import '../../presentation/screens/salon_detail_screen.dart';
import '../../presentation/screens/booking_flow_screen.dart';
import '../../presentation/screens/bookings_list_screen.dart';
import '../../presentation/screens/favorites_screen.dart';
import '../../presentation/screens/profile_screen.dart';
import '../../application/providers/auth_provider.dart';

// Main navigation tab shell
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
        context.go('/home');
        break;
      case 1:
        context.go('/bookings');
        break;
      case 2:
        context.go('/favorites');
        break;
      case 3:
        context.go('/profile');
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
            icon: Icon(Icons.search_rounded),
            label: 'Explore',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_rounded),
            label: 'Bookings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite_rounded),
            label: 'Favorites',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: authState.user == null ? '/login' : '/home',
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
            path: '/home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/bookings',
            builder: (context, state) => const BookingsListScreen(),
          ),
          GoRoute(
            path: '/favorites',
            builder: (context, state) => const FavoritesScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/salon/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return SalonDetailScreen(salonId: id);
        },
      ),
      GoRoute(
        path: '/book',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>;
          return BookingFlowScreen(
            salon: extra['salon'],
            service: extra['service'],
          );
        },
      ),
    ],
    redirect: (context, state) {
      final loggedIn = ref.read(authProvider).user != null;
      final goingToAuth = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!loggedIn && !goingToAuth) return '/login';
      if (loggedIn && goingToAuth) return '/home';
      return null;
    },
  );
});
