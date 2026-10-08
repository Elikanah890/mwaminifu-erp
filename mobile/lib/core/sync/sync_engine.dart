import '../network/api_client.dart';
import '../offline/offline_queue.dart';
import 'local_sync_store.dart';

/// Coordinates two-way synchronization for one shop.
class SyncEngine {
  final ApiClient api;
  final LocalSyncStore store;

  SyncEngine(this.api, {LocalSyncStore? store}) : store = store ?? LocalSyncStore.instance;

  Future<String?> lastSyncTimestamp(String shopId) => store.lastSyncTimestamp(shopId);

  /// Downloads server changes newer than the last successful pull and merges
  /// every returned entity into the local store.
  Future<Map<String, dynamic>> pull({required String shopId, int limit = 500}) async {
    if (shopId.isEmpty) return {'pulled': 0, 'error': 'No shop available'};

    final since = await store.lastSyncTimestamp(shopId);
    try {
      final res = await api.get('/sync/pull', queryParameters: {
        'shopId': shopId,
        'since': ?since,
        'limit': '$limit',
      });
      final data = (res['data'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
      final changes = (data['changes'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
      final timestamp = (data['lastPullTimestamp'] ?? data['serverVersion'])?.toString();
      if (timestamp == null) return {'pulled': 0, 'error': 'Missing sync timestamp'};

      await store.merge(shopId, changes, timestamp);
      final pulled = changes.values.whereType<List>().fold<int>(0, (total, records) => total + records.length);
      return {'pulled': pulled, 'lastSyncTimestamp': timestamp, 'hasMore': data['hasMore'] == true};
    } catch (error) {
      return {'pulled': 0, 'error': error.toString()};
    }
  }

  /// Pushes local operations, then pulls server changes even when nothing was queued.
  Future<Map<String, dynamic>> flush({String? shopId, String? deviceId = 'mobile'}) async {
    if (shopId == null || shopId.isEmpty) {
      return {'pushed': 0, 'failed': 0, 'pulled': 0, 'error': 'No shop available'};
    }

    final allOps = await OfflineQueue.instance.all();
    final ops = allOps.where((operation) {
      final operationShopId = operation.data['shopId']?.toString();
      return operationShopId == null || operationShopId.isEmpty || operationShopId == shopId;
    }).toList();
    var pushed = 0;
    var failed = 0;
    if (ops.isNotEmpty) {
      final changes = <String, List<Map<String, dynamic>>>{};
      for (final op in ops) {
        changes.putIfAbsent(op.entity, () => []).add({
          'clientId': op.clientId,
          'data': op.data,
          'lastModified': op.lastModified,
        });
      }

      try {
        final res = await api.post('/sync/push', data: {
          'shopId': shopId,
          'deviceId': deviceId ?? 'mobile',
          'changes': changes,
        });
        final data = res['data'] ?? {};
        final processed = <String>{};
        (data['processed'] as Map?)?.values.forEach((list) {
          for (final id in (list as List)) {
            processed.add(id.toString());
          }
        });
        final kept = [
          ...allOps.where((operation) => !ops.contains(operation)),
          ...ops.where((operation) => !processed.contains(operation.clientId)),
        ];
        await OfflineQueue.instance.replaceAll(kept);
        pushed = ops.length - kept.length;
        failed = kept.length;
      } catch (error) {
        return {'pushed': 0, 'failed': ops.length, 'pulled': 0, 'error': error.toString()};
      }
    }

    final pulled = await pull(shopId: shopId);
    return {
      'pushed': pushed,
      'failed': failed,
      'pulled': pulled['pulled'] ?? 0,
      'lastSyncTimestamp': pulled['lastSyncTimestamp'],
      if (pulled['error'] != null) 'error': pulled['error'],
    };
  }

  Future<Map<String, dynamic>> sync({required String shopId, String? deviceId = 'mobile'}) {
    return flush(shopId: shopId, deviceId: deviceId);
  }
}