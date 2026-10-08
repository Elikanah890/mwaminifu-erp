import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Persists pulled server records and the incremental sync cursor per shop.
///
/// The current mobile project does not yet contain a Drift database. Keeping
/// this storage behind a small API makes sync durable now and leaves the
/// merge contract independent from the eventual database implementation.
class LocalSyncStore {
  LocalSyncStore._();

  static final LocalSyncStore instance = LocalSyncStore._();
  Map<String, dynamic>? _state;

  Future<File> _file() async {
    final directory = await getApplicationSupportDirectory();
    return File('${directory.path}/sync_store.json');
  }

  Future<Map<String, dynamic>> _load() async {
    if (_state != null) return _state!;
    try {
      final file = await _file();
      if (await file.exists()) {
        final decoded = jsonDecode(await file.readAsString());
        if (decoded is Map) _state = decoded.cast<String, dynamic>();
      }
    } catch (_) {
      // A corrupt cache must not prevent the app from using the API.
    }
    return _state ??= <String, dynamic>{'shops': <String, dynamic>{}};
  }

  Future<void> _save() async {
    final file = await _file();
    await file.parent.create(recursive: true);
    await file.writeAsString(jsonEncode(_state));
  }

  Future<String?> lastSyncTimestamp(String shopId) async {
    final state = await _load();
    final shop = (state['shops'] as Map?)?[shopId] as Map?;
    return shop?['lastSyncTimestamp'] as String?;
  }

  Future<void> merge(String shopId, Map<String, dynamic> changes, String timestamp) async {
    final state = await _load();
    final shops = ((state['shops'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
    final shop = ((shops[shopId] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
    final records = ((shop['records'] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};

    for (final entry in changes.entries) {
      if (entry.value is! List) continue;
      final entity = ((records[entry.key] as Map?)?.cast<String, dynamic>()) ?? <String, dynamic>{};
      for (final rawRecord in entry.value as List) {
        if (rawRecord is! Map) continue;
        final record = rawRecord.cast<String, dynamic>();
        final id = (record['id'] ?? record['clientId'])?.toString();
        if (id != null && id.isNotEmpty) entity[id] = record;
      }
      records[entry.key] = entity;
    }

    shop['records'] = records;
    shop['lastSyncTimestamp'] = timestamp;
    shops[shopId] = shop;
    state['shops'] = shops;
    await _save();
  }

  Future<List<Map<String, dynamic>>> records(String shopId, String entity) async {
    final state = await _load();
    final shop = (state['shops'] as Map?)?[shopId] as Map?;
    final entityRecords = (shop?['records'] as Map?)?[entity] as Map?;
    return entityRecords == null
        ? const []
        : entityRecords.values.whereType<Map>().map((record) => record.cast<String, dynamic>()).toList();
  }
}