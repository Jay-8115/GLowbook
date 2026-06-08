import 'package:permission_handler/permission_handler.dart';

class PermissionRepository {
  Future<PermissionStatus> checkStatus(Permission permission) async {
    return await permission.status;
  }

  Future<PermissionStatus> requestPermission(Permission permission) async {
    return await permission.request();
  }

  Future<bool> openSettings() async {
    return await openAppSettings();
  }
}
