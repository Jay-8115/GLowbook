class SalonModel {
  final String id;
  final String name;
  final String description;
  final String address;
  final String city;
  final String state;
  final double lat;
  final double lng;
  final String phone;
  final String imageUrl;
  final List<String> images;
  final double avgRating;
  final int totalReviews;
  final int totalBookings;
  final String openTime;
  final String closeTime;
  final int totalSeats;
  final List<ServiceModel> services;
  final List<StaffModel> staff;
  final double? distance;

  SalonModel({
    required this.id,
    required this.name,
    required this.description,
    required this.address,
    required this.city,
    required this.state,
    required this.lat,
    required this.lng,
    required this.phone,
    required this.imageUrl,
    required this.images,
    required this.avgRating,
    required this.totalReviews,
    required this.totalBookings,
    required this.openTime,
    required this.closeTime,
    required this.totalSeats,
    required this.services,
    required this.staff,
    this.distance,
  });

  factory SalonModel.fromJson(Map<String, dynamic> json) {
    return SalonModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      phone: json['phone'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      images: List<String>.from(json['images'] ?? []),
      avgRating: (json['avgRating'] as num?)?.toDouble() ?? 0.0,
      totalReviews: json['totalReviews'] ?? 0,
      totalBookings: json['totalBookings'] ?? 0,
      openTime: json['openTime'] ?? '',
      closeTime: json['closeTime'] ?? '',
      totalSeats: json['totalSeats'] ?? 1,
      services: (json['services'] as List?)
              ?.map((s) => ServiceModel.fromJson(s))
              .toList() ??
          [],
      staff: (json['staff'] as List?)
              ?.map((s) => StaffModel.fromJson(s))
              .toList() ??
          [],
      distance: (json['distance'] as num?)?.toDouble(),
    );
  }
}

class ServiceModel {
  final String id;
  final String name;
  final String description;
  final double price;
  final int durationMinutes;
  final String categoryId;
  final String? imageUrl;
  final double discountPercent;

  ServiceModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.durationMinutes,
    required this.categoryId,
    this.imageUrl,
    required this.discountPercent,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    return ServiceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      durationMinutes: json['durationMinutes'] ?? 0,
      categoryId: json['categoryId'] ?? '',
      imageUrl: json['imageUrl'],
      discountPercent: (json['discountPercent'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class StaffModel {
  final String id;
  final String name;
  final String role;
  final String specialization;
  final String? avatarUrl;
  final bool isAvailable;

  StaffModel({
    required this.id,
    required this.name,
    required this.role,
    required this.specialization,
    this.avatarUrl,
    required this.isAvailable,
  });

  factory StaffModel.fromJson(Map<String, dynamic> json) {
    return StaffModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? '',
      specialization: json['specialization'] ?? '',
      avatarUrl: json['avatarUrl'],
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}
