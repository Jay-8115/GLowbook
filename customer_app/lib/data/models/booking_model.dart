import 'salon_model.dart';

class BookingModel {
  final String id;
  final String userId;
  final String salonId;
  final String serviceId;
  final String staffId;
  final DateTime bookingDate;
  final String startTime;
  final String endTime;
  final String status;
  final double totalPrice;
  final String? notes;
  final SalonModel? salon;
  final ServiceModel? service;
  final StaffModel? staff;

  BookingModel({
    required this.id,
    required this.userId,
    required this.salonId,
    required this.serviceId,
    required this.staffId,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.totalPrice,
    this.notes,
    this.salon,
    this.service,
    this.staff,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      salonId: json['salonId'] ?? '',
      serviceId: json['serviceId'] ?? '',
      staffId: json['staffId'] ?? '',
      bookingDate: json['bookingDate'] != null 
          ? DateTime.parse(json['bookingDate']) 
          : DateTime.now(),
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      status: json['status'] ?? 'PENDING',
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'],
      salon: json['salon'] != null ? SalonModel.fromJson(json['salon']) : null,
      service: json['service'] != null ? ServiceModel.fromJson(json['service']) : null,
      staff: json['staff'] != null ? StaffModel.fromJson(json['staff']) : null,
    );
  }
}
