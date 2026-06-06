import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/providers/owner_service_provider.dart';

class ServicesManagementScreen extends ConsumerStatefulWidget {
  const ServicesManagementScreen({super.key});

  @override
  ConsumerState<ServicesManagementScreen> createState() => _ServicesManagementScreenState();
}

class _ServicesManagementScreenState extends ConsumerState<ServicesManagementScreen> {
  final List<String> _selectedIds = [];
  bool _isBulkMode = false;

  void _toggleSelect(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
      if (_selectedIds.isEmpty) {
        _isBulkMode = false;
      }
    });
  }

  void _toggleBulkMode() {
    setState(() {
      _isBulkMode = !_isBulkMode;
      if (!_isBulkMode) {
        _selectedIds.clear();
      }
    });
  }

  void _selectAll(List<ServiceModel> services) {
    setState(() {
      if (_selectedIds.length == services.length) {
        _selectedIds.clear();
      } else {
        _selectedIds.clear();
        _selectedIds.addAll(services.map((s) => s.id));
      }
    });
  }

  void _executeBulkAction(String action) async {
    if (_selectedIds.isEmpty) return;

    final notifier = ref.read(ownerServiceProvider.notifier);
    bool success = false;

    if (action == 'delete') {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF111827),
          title: const Text('Confirm Bulk Delete', style: TextStyle(color: Colors.white)),
          content: Text('Delete ${_selectedIds.length} selected services?', style: const TextStyle(color: Colors.white70)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        ),
      );
      if (confirm == true) {
        success = await notifier.bulkDelete(_selectedIds);
      } else {
        return;
      }
    } else if (action == 'enable') {
      success = await notifier.bulkToggleStatus(_selectedIds, true);
    } else if (action == 'disable') {
      success = await notifier.bulkToggleStatus(_selectedIds, false);
    }

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bulk action executed successfully!')),
      );
      setState(() {
        _selectedIds.clear();
        _isBulkMode = false;
      });
    }
  }

  void _showServiceForm([ServiceModel? service]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _ServiceFormDialog(service: service),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ownerServiceProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        title: const Text(
          'Services Catalog',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (state.services.isNotEmpty)
            IconButton(
              icon: Icon(
                _isBulkMode ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                color: _isBulkMode ? const Color(0xFF8B5CF6) : Colors.grey,
              ),
              onPressed: _toggleBulkMode,
              tooltip: 'Bulk Operations Mode',
            ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF8B5CF6)),
            onPressed: () => _showServiceForm(),
            tooltip: 'Add Service',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_isBulkMode && state.services.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: const Color(0xFF111827),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: () => _selectAll(state.services),
                      icon: Icon(
                        _selectedIds.length == state.services.length
                            ? Icons.select_all_rounded
                            : Icons.deselect_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                      label: Text(
                        _selectedIds.length == state.services.length ? 'Deselect All' : 'Select All',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.play_circle_outline_rounded, color: Colors.greenAccent, size: 22),
                          onPressed: () => _executeBulkAction('enable'),
                          tooltip: 'Bulk Enable',
                        ),
                        IconButton(
                          icon: const Icon(Icons.pause_circle_outline_rounded, color: Colors.amberAccent, size: 22),
                          onPressed: () => _executeBulkAction('disable'),
                          tooltip: 'Bulk Disable',
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_sweep_rounded, color: Colors.redAccent, size: 22),
                          onPressed: () => _executeBulkAction('delete'),
                          tooltip: 'Bulk Delete',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.read(ownerServiceProvider.notifier).refresh(),
                color: const Color(0xFF8B5CF6),
                child: state.isLoading && state.services.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
                    : state.services.isEmpty
                        ? _buildEmptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            itemCount: state.services.length,
                            itemBuilder: (context, index) {
                              final service = state.services[index];
                              final isSelected = _selectedIds.contains(service.id);
                              return _buildServiceCard(service, isSelected);
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.design_services_rounded, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No Services Registered',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Configure your catalog so clients can see your services.',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => _showServiceForm(),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Add First Service', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceCard(ServiceModel service, bool isSelected) {
    return GestureDetector(
      onTap: () {
        if (_isBulkMode) {
          _toggleSelect(service.id);
        } else {
          _showServiceForm(service);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF8B5CF6).withOpacity(0.5)
                : Colors.white.withOpacity(0.04),
          ),
        ),
        child: Row(
          children: [
            if (_isBulkMode) ...[
              Checkbox(
                value: isSelected,
                onChanged: (_) => _toggleSelect(service.id),
                activeColor: const Color(0xFF8B5CF6),
              ),
              const SizedBox(width: 8),
            ],
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                service.imageUrl.isNotEmpty
                    ? service.imageUrl
                    : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=150',
                width: 60,
                height: 60,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.grey[800],
                  width: 60,
                  height: 60,
                  child: const Icon(Icons.cut_rounded, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          service.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (service.isPopular)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'POPULAR',
                            style: TextStyle(color: Colors.amber, fontSize: 8, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${service.category} • ${service.durationMinutes} mins',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (service.discountPrice != null) ...[
                        Text(
                          '₹${service.discountPrice!.toStringAsFixed(0)}',
                          style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '₹${service.price.toStringAsFixed(0)}',
                          style: TextStyle(color: Colors.grey[600], decoration: TextDecoration.lineThrough, fontSize: 11),
                        ),
                      ] else ...[
                        Text(
                          '₹${service.price.toStringAsFixed(0)}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ]
                    ],
                  ),
                ],
              ),
            ),
            if (!_isBulkMode) ...[
              const SizedBox(width: 12),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Switch(
                    value: service.isActive,
                    activeColor: const Color(0xFF8B5CF6),
                    onChanged: (val) {
                      ref.read(ownerServiceProvider.notifier).toggleServiceStatus(service.id, val);
                    },
                  ),
                  Text(
                    service.isActive ? 'ACTIVE' : 'INACTIVE',
                    style: TextStyle(
                      color: service.isActive ? const Color(0xFF8B5CF6) : Colors.grey,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ServiceFormDialog extends ConsumerStatefulWidget {
  final ServiceModel? service;
  const _ServiceFormDialog({this.service});

  @override
  ConsumerState<_ServiceFormDialog> createState() => _ServiceFormDialogState();
}

class _ServiceFormDialogState extends ConsumerState<_ServiceFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _descController;
  late TextEditingController _categoryController;
  late TextEditingController _priceController;
  late TextEditingController _discountController;
  late TextEditingController _imageUrlController;
  late int _duration;
  late bool _isPopular;
  late bool _isActive;

  final List<int> _supportedDurations = [10, 15, 20, 30, 45, 60, 90, 120];

  @override
  void initState() {
    super.initState();
    final s = widget.service;
    _nameController = TextEditingController(text: s?.name ?? '');
    _descController = TextEditingController(text: s?.description ?? '');
    _categoryController = TextEditingController(text: s?.category ?? '');
    _priceController = TextEditingController(text: s != null ? s.price.toStringAsFixed(0) : '');
    _discountController = TextEditingController(
      text: (s != null && s.discountPrice != null) ? s.discountPrice!.toStringAsFixed(0) : '',
    );
    _imageUrlController = TextEditingController(text: s?.imageUrl ?? '');
    _duration = (s != null && _supportedDurations.contains(s.durationMinutes)) ? s.durationMinutes : 30;
    _isPopular = s?.isPopular ?? false;
    _isActive = s?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _categoryController.dispose();
    _priceController.dispose();
    _discountController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final notifier = ref.read(ownerServiceProvider.notifier);
      final price = double.parse(_priceController.text.trim());
      final discount = _discountController.text.trim().isNotEmpty
          ? double.parse(_discountController.text.trim())
          : null;

      bool success = false;
      if (widget.service != null) {
        success = await notifier.editService(
          id: widget.service!.id,
          name: _nameController.text.trim(),
          description: _descController.text.trim(),
          category: _categoryController.text.trim(),
          price: price,
          discountPrice: discount,
          durationMinutes: _duration,
          imageUrl: _imageUrlController.text.trim(),
          isPopular: _isPopular,
          isActive: _isActive,
        );
      } else {
        success = await notifier.addService(
          name: _nameController.text.trim(),
          description: _descController.text.trim(),
          category: _categoryController.text.trim(),
          price: price,
          discountPrice: discount,
          durationMinutes: _duration,
          imageUrl: _imageUrlController.text.trim(),
          isPopular: _isPopular,
          isActive: _isActive,
        );
      }

      if (success && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Service saved successfully!')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.service != null ? 'Edit Service Details' : 'Configure New Service',
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              _buildField(_nameController, 'Service Name', 'e.g. Precision Hair Cut'),
              const SizedBox(height: 14),
              _buildField(_descController, 'Description Details', 'e.g. Deep cleansing precison trim', maxLines: 2),
              const SizedBox(height: 14),
              _buildField(_categoryController, 'Category (e.g. Hair, Beard, Facial)', 'Nails, Spa, Makeup, Custom'),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: _buildField(_priceController, 'Standard Price (₹)', '100', keyboardType: TextInputType.number)),
                  const SizedBox(width: 14),
                  Expanded(child: _buildField(_discountController, 'Discount Price (₹)', 'Optional', keyboardType: TextInputType.number)),
                ],
              ),
              const SizedBox(height: 14),
              _buildField(_imageUrlController, 'Cover Image URL', 'https://unsplash.com/etc', isRequired: false),
              const SizedBox(height: 16),
              
              // Duration selector
              const Text('Service Slot Duration', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                value: _duration,
                dropdownColor: const Color(0xFF111827),
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF090D16),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                items: _supportedDurations
                    .map((d) => DropdownMenuItem<int>(
                          value: d,
                          child: Text('$d Minutes'),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _duration = val;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('Mark Popular', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      value: _isPopular,
                      activeColor: const Color(0xFF8B5CF6),
                      checkColor: Colors.white,
                      onChanged: (val) {
                        setState(() {
                          _isPopular = val ?? false;
                        });
                      },
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('Is Active', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      value: _isActive,
                      activeColor: const Color(0xFF8B5CF6),
                      checkColor: Colors.white,
                      onChanged: (val) {
                        setState(() {
                          _isActive = val ?? true;
                        });
                      },
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Save Service Details', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController controller,
    String label,
    String hint, {
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    bool isRequired = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13),
            filled: true,
            fillColor: const Color(0xFF090D16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          validator: (val) {
            if (isRequired && (val == null || val.isEmpty)) return '$label is required';
            return null;
          },
        ),
      ],
    );
  }
}
