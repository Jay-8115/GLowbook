import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';
import '../../application/providers/permission_provider.dart';
import '../../application/providers/location_provider.dart';

class PermissionScreen extends ConsumerWidget {
  const PermissionScreen({super.key});

  String _getStatusText(PermissionStatus status) {
    switch (status) {
      case PermissionStatus.granted:
        return 'Granted';
      case PermissionStatus.denied:
        return 'Denied';
      case PermissionStatus.permanentlyDenied:
        return 'Permanently Denied';
      case PermissionStatus.restricted:
        return 'Restricted';
      case PermissionStatus.limited:
        return 'Limited Access';
      default:
        return 'Unknown';
    }
  }

  Color _getStatusColor(PermissionStatus status) {
    switch (status) {
      case PermissionStatus.granted:
      case PermissionStatus.limited:
        return const Color(0xFF10B981); // Green
      case PermissionStatus.denied:
        return const Color(0xFFF59E0B); // Amber
      case PermissionStatus.permanentlyDenied:
        return const Color(0xFFEF4444); // Red
      case PermissionStatus.restricted:
        return const Color(0xFF6B7280); // Grey
      default:
        return Colors.grey;
    }
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    final second = dt.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final permissionState = ref.watch(permissionProvider);
    final notifier = ref.read(permissionProvider.notifier);
    final locationState = ref.watch(locationProvider);
    final locationNotifier = ref.read(locationProvider.notifier);

    final lastCheckedStr = _formatTime(permissionState.lastChecked);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF090D16),
              Color(0xFF0F172A),
              Color(0xFF1E1B4B),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Glassmorphic background blur elements
            Positioned(
              top: -50,
              right: -50,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF8B5CF6).withOpacity(0.15),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
                  child: Container(),
                ),
              ),
            ),
            Positioned(
              bottom: -50,
              left: -50,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFEC4899).withOpacity(0.1),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
                  child: Container(),
                ),
              ),
            ),
            SafeArea(
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 20),
                          // Premium Logo / Header Icon
                          Center(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFF8B5CF6).withOpacity(0.1),
                                border: Border.all(
                                  color: const Color(0xFF8B5CF6).withOpacity(0.25),
                                  width: 1.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.verified_user_rounded,
                                size: 44,
                                color: Color(0xFFC084FC),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Partner Permission Center',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Last Checked: $lastCheckedStr',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[400],
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'To manage bookings and receive notifications in real-time, please grant required permissions.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.white70,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Mandatory Section
                          _buildSectionHeader('MANDATORY PERMISSIONS', Icons.star_rounded, const Color(0xFFFBBF24)),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Location Services',
                            description: 'Required to map your salon location correctly.\nGPS Status: ${locationState.errorMessage ?? "Active"}',
                            status: permissionState.location,
                            lastChecked: lastCheckedStr,
                            onEnable: () async {
                              await locationNotifier.enableLocationFlow();
                            },
                            onManage: () async {
                              final serviceEnabled = await Geolocator.isLocationServiceEnabled();
                              if (!serviceEnabled) {
                                await Geolocator.openLocationSettings();
                              } else {
                                await notifier.openAppSettings();
                              }
                            },
                            icon: Icons.location_on_rounded,
                          ),
                          if (!permissionState.isLocationGranted)
                            Padding(
                              padding: const EdgeInsets.only(top: 6, left: 4),
                              child: Text(
                                '* Nearby salons and routing unavailable without location permission.',
                                style: TextStyle(color: Colors.red[300], fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Push Notifications',
                            description: 'Mandatory to alert you of new bookings, cancellations, and status updates.',
                            status: permissionState.notification,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.notification),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.notifications_active_rounded,
                          ),
                          if (!permissionState.isNotificationGranted)
                            Padding(
                              padding: const EdgeInsets.only(top: 6, left: 4),
                              child: Text(
                                '* Booking alerts and real-time updates unavailable without notification permission.',
                                style: TextStyle(color: Colors.red[300], fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),

                          const SizedBox(height: 24),

                          // Optional Section
                          _buildSectionHeader('OPTIONAL PERMISSIONS', Icons.check_circle_outline_rounded, Colors.grey),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Camera Access',
                            description: 'Allows photographing styles and scanning QR passes.',
                            status: permissionState.camera,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.camera),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.camera_alt_rounded,
                          ),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Photo Gallery',
                            description: 'Used for uploading salon pictures and service banners.',
                            status: permissionState.photos,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.photos),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.photo_library_rounded,
                          ),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Storage / Files',
                            description: 'Write salon reports and temporary layout pictures.',
                            status: permissionState.storage,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.storage),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.folder_rounded,
                          ),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'Microphone Access',
                            description: 'Record descriptions or chat voice memos.',
                            status: permissionState.microphone,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.microphone),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.mic_rounded,
                          ),
                          const SizedBox(height: 12),
                          _buildPermissionCard(
                            title: 'SMS Autofill / Verification',
                            description: 'Validate salon registration details automatically.',
                            status: permissionState.sms,
                            lastChecked: lastCheckedStr,
                            onEnable: () => notifier.requestPermission(Permission.sms),
                            onManage: () => notifier.openAppSettings(),
                            icon: Icons.sms_rounded,
                          ),
                          const SizedBox(height: 30),

                          // Action Button
                          Container(
                            decoration: BoxDecoration(
                              boxShadow: permissionState.areMandatoryGranted
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF8B5CF6).withOpacity(0.3),
                                        blurRadius: 20,
                                        offset: const Offset(0, 4),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: ElevatedButton(
                              onPressed: permissionState.areMandatoryGranted
                                  ? () => context.go('/dashboard')
                                  : () async {
                                      await notifier.requestMandatory();
                                      if (ref.read(permissionProvider).areMandatoryGranted) {
                                        if (context.mounted) {
                                          context.go('/dashboard');
                                        }
                                      } else {
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Please grant all mandatory permissions (Location & Notifications) to proceed.'),
                                              backgroundColor: Color(0xFFEF4444),
                                            ),
                                          );
                                        }
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                backgroundColor: permissionState.areMandatoryGranted
                                    ? const Color(0xFF8B5CF6)
                                    : const Color(0xFF1E293B),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(
                                    color: permissionState.areMandatoryGranted
                                        ? Colors.transparent
                                        : const Color(0xFF334155),
                                    width: 1,
                                  ),
                                ),
                                elevation: 0,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    permissionState.areMandatoryGranted
                                        ? 'Continue to Dashboard'
                                        : 'Grant Mandatory Permissions',
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward_rounded, size: 20),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: color.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildPermissionCard({
    required String title,
    required String description,
    required PermissionStatus status,
    required String lastChecked,
    required VoidCallback onEnable,
    required VoidCallback onManage,
    required IconData icon,
  }) {
    final isGranted = status.isGranted || status.isLimited;
    final statusColor = _getStatusColor(status);
    final statusText = _getStatusText(status);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isGranted
              ? const Color(0xFF10B981).withOpacity(0.4)
              : const Color(0xFF334155).withOpacity(0.5),
          width: 1.5,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isGranted
                          ? const Color(0xFF10B981).withOpacity(0.1)
                          : const Color(0xFF8B5CF6).withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      color: isGranted ? const Color(0xFF34D399) : const Color(0xFFC084FC),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[400],
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(color: Color(0xFF334155), height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: statusColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            statusText,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Checked: $lastChecked',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      if (!isGranted)
                        TextButton(
                          onPressed: onEnable,
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.white,
                            backgroundColor: const Color(0xFF8B5CF6).withOpacity(0.8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('Enable', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: onManage,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.grey[300],
                          side: const BorderSide(color: Color(0xFF475569)),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(isGranted ? 'Disable' : 'Manage', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
