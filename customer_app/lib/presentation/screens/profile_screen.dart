import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../application/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 10),
            
            // Profile Card Header
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 46,
                    backgroundColor: const Color(0xFF111827),
                    backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
                    child: user?.avatarUrl == null
                        ? const Icon(Icons.person_rounded, size: 46, color: Colors.grey)
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?.name ?? 'User Guest',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? 'guest@glowbook.com',
                    style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 36),

            // Wallet & Loyalty cards
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111827),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.04)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Wallet Balance', style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        const Text('\$100.00', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111827),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.04)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Loyalty Points', style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        const Text('50 pts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 36),

            // Action list buttons
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.settings_rounded, color: Colors.grey),
                    title: const Text('Account Settings', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey, size: 14),
                    onTap: () {},
                  ),
                  const Divider(color: Color(0xFF1F2937), height: 1),
                  ListTile(
                    leading: const Icon(Icons.history_rounded, color: Colors.grey),
                    title: const Text('Payment Transactions', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey, size: 14),
                    onTap: () {},
                  ),
                  const Divider(color: Color(0xFF1F2937), height: 1),
                  ListTile(
                    leading: const Icon(Icons.security_rounded, color: Colors.grey),
                    title: const Text('Privacy Policy', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey, size: 14),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            ElevatedButton(
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go('/login');
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF4D4D).withOpacity(0.1),
                foregroundColor: const Color(0xFFFF4D4D),
                side: const BorderSide(color: Color(0xFFFF4D4D), width: 1),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }
}
