import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

class PendingOperation {
  final String clientId;
  final String entity;
  final Map<String, dynamic> data;
  final String lastModified;

  PendingOperation({
    required this.clientId,
    required this.entity,
    required this.data,
    required this.lastModified,
  });

  Map<String, dynamic> toJson() => {
        'clientId': clientId,
        'entity': entity,
        'data': data,
        'lastModified': lastModified,
      };

  factory PendingOperation.fromJson(Map<String, dynamic> json) => PendingOperation(
        clientId: json['clientId'] as String,
        entity: json['entity'] as String,
        data: (json['data'] as Map).cast<String, dynamic>(),
        lastModified: json['lastModified'] as String? ?? DateTime.now().toIso8601String(),
      );
}

/// Lightweight local persistence for operations captured while offline.
/// Stored as a JSON file in the app documents directory (no extra deps).
class OfflineQueue {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  List<PendingOperation> _ops = [];
  bool _loaded = false;

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/offline_queue.json');
  }

  Future<void> _ensureLoaded() async {
    if (_loaded) return;
    try {
      final f = await _file();
      if (await f.exists()) {
        final raw = jsonDecode(await f.readAsString()) as List? ?? [];
        _ops = raw.map((e) => PendingOperation.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      _ops = [];
    }
    _loaded = true;
  }

  Future<void> add(String entity, Map<String, dynamic> data) async {
    await _ensureLoaded();
    _ops.add(PendingOperation(
      clientId: '${DateTime.now().microsecondsSinceEpoch}-$entity',
      entity: entity,
      data: data,
      lastModified: DateTime.now().toIso8601String(),
    ));
    await _persist();
  }

  Future<List<PendingOperation>> all() async {
    await _ensureLoaded();
    return List.from(_ops);
  }

  Future<int> count() async {
    await _ensureLoaded();
    return _ops.length;
  }

  Future<void> replaceAll(List<PendingOperation> ops) async {
    await _ensureLoaded();
    _ops = ops;
    await _persist();
  }

  Future<void> clear() async {
    await _ensureLoaded();
    _ops = [];
    await _persist();
  }

  Future<void> _persist() async {
    final f = await _file();
    await f.writeAsString(jsonEncode(_ops.map((o) => o.toJson()).toList()));
  }
}