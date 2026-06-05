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
  final bool isVerified;
  final String openTime;
  final String closeTime;
  final int totalSeats;

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
    required this.isVerified,
    required this.openTime,
    required this.closeTime,
    required this.totalSeats,
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
      isVerified: json['isVerified'] ?? false,
      openTime: json['openTime'] ?? '',
      closeTime: json['closeTime'] ?? '',
      totalSeats: json['totalSeats'] ?? 1,
    );
  }
}
