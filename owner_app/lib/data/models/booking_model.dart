class BookingModel {
  final String id;
  final String customerName;
  final String customerPhone;
  final String serviceName;
  final String staffName;
  final DateTime bookingDate;
  final String startTime;
  final String status;
  final double totalPrice;
  final String? notes;

  BookingModel({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.serviceName,
    required this.staffName,
    required this.bookingDate,
    required this.startTime,
    required this.status,
    required this.totalPrice,
    this.notes,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'] as Map<String, dynamic>?;
    final svcJson = json['service'] as Map<String, dynamic>?;
    final staffJson = json['staff'] as Map<String, dynamic>?;

    return BookingModel(
      id: json['id'] ?? '',
      customerName: userJson?['name'] ?? 'Customer',
      customerPhone: userJson?['phone'] ?? 'N/A',
      serviceName: svcJson?['name'] ?? 'Service',
      staffName: staffJson?['name'] ?? 'Stylist',
      bookingDate: json['bookingDate'] != null 
          ? DateTime.parse(json['bookingDate']) 
          : DateTime.now(),
      startTime: json['startTime'] ?? '',
      status: json['status'] ?? 'PENDING',
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'],
    );
  }
}
