import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../data/repositories/permission_repository.dart';

final permissionRepositoryProvider = Provider<PermissionRepository>((ref) {
  return PermissionRepository();
});

class PermissionState {
  final PermissionStatus location;
  final PermissionStatus notification;
  final PermissionStatus camera;
  final PermissionStatus photos;
  final PermissionStatus storage;
  final PermissionStatus microphone;
  final PermissionStatus contacts;
  final PermissionStatus sms;
  final DateTime lastChecked;
  final bool hasChecked;

  PermissionState({
    this.location = PermissionStatus.denied,
    this.notification = PermissionStatus.denied,
    this.camera = PermissionStatus.denied,
    this.photos = PermissionStatus.denied,
    this.storage = PermissionStatus.denied,
    this.microphone = PermissionStatus.denied,
    this.contacts = PermissionStatus.denied,
    this.sms = PermissionStatus.denied,
    required this.lastChecked,
    this.hasChecked = false,
  });

  bool get isLocationGranted => location.isGranted;
  bool get isNotificationGranted => notification.isGranted;
  bool get isCameraGranted => camera.isGranted;
  bool get isStorageGranted => photos.isGranted || storage.isGranted;
  bool get isContactsGranted => contacts.isGranted;
  bool get isSmsGranted => sms.isGranted;
  bool get isMicrophoneGranted => microphone.isGranted;

  bool get areMandatoryGranted => isLocationGranted && isNotificationGranted;

  PermissionState copyWith({
    PermissionStatus? location,
    PermissionStatus? notification,
    PermissionStatus? camera,
    PermissionStatus? photos,
    PermissionStatus? storage,
    PermissionStatus? microphone,
    PermissionStatus? contacts,
    PermissionStatus? sms,
    DateTime? lastChecked,
    bool? hasChecked,
  }) {
    return PermissionState(
      location: location ?? this.location,
      notification: notification ?? this.notification,
      camera: camera ?? this.camera,
      photos: photos ?? this.photos,
      storage: storage ?? this.storage,
      microphone: microphone ?? this.microphone,
      contacts: contacts ?? this.contacts,
      sms: sms ?? this.sms,
      lastChecked: lastChecked ?? this.lastChecked,
      hasChecked: hasChecked ?? this.hasChecked,
    );
  }
}

class PermissionNotifier extends StateNotifier<PermissionState> {
  final PermissionRepository _repository;

  PermissionNotifier(this._repository) : super(PermissionState(lastChecked: DateTime.now())) {
    checkAllPermissions();
  }

  Future<void> checkAllPermissions() async {
    final location = await _repository.checkStatus(Permission.location);
    final notification = await _repository.checkStatus(Permission.notification);
    final camera = await _repository.checkStatus(Permission.camera);
    final photos = await _repository.checkStatus(Permission.photos);
    final storage = await _repository.checkStatus(Permission.storage);
    final microphone = await _repository.checkStatus(Permission.microphone);
    final contacts = await _repository.checkStatus(Permission.contacts);
    final sms = await _repository.checkStatus(Permission.sms);

    state = PermissionState(
      location: location,
      notification: notification,
      camera: camera,
      photos: photos,
      storage: storage,
      microphone: microphone,
      contacts: contacts,
      sms: sms,
      lastChecked: DateTime.now(),
      hasChecked: true,
    );
  }

  Future<PermissionStatus> requestPermission(Permission permission) async {
    final status = await _repository.requestPermission(permission);
    await checkAllPermissions();
    return status;
  }

  Future<void> requestMandatory() async {
    await requestPermission(Permission.location);
    await requestPermission(Permission.notification);
    await checkAllPermissions();
  }

  Future<void> openAppSettings() async {
    await _repository.openSettings();
  }
}

final permissionProvider = StateNotifierProvider<PermissionNotifier, PermissionState>((ref) {
  final repository = ref.watch(permissionRepositoryProvider);
  return PermissionNotifier(repository);
});
