import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { Colors } from '../../theme/colors';
import {
  getOfflineQueue,
  removeOfflineItem,
  syncOfflineQueue,
  OfflineVerificationItem,
} from '../../services/offlineStorage';

interface OfflineQueueScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const OfflineQueueScreen: React.FC<OfflineQueueScreenProps> = ({
  navigation,
  onSwitchRole,
}) => {
  const [queue, setQueue] = useState<OfflineVerificationItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = () => {
    setQueue(getOfflineQueue());
  };

  useEffect(() => {
    loadQueue();
    const unsub = navigation.addListener('focus', loadQueue);
    return unsub;
  }, [navigation]);

  const pendingCount = queue.length;

  const handleSyncAll = async () => {
    if (pendingCount === 0) {
      Alert.alert('All Synced', 'There are no pending offline records to synchronize.');
      return;
    }

    setSyncing(true);
    const result = await syncOfflineQueue();
    setSyncing(false);
    loadQueue();

    if (result.success) {
      Alert.alert(
        'Synchronization Complete',
        `Successfully uploaded ${result.syncedCount} verification(s) to MySQL database. Instruments marked VERIFIED and certificates generated.`,
        [
          {
            text: 'View Schedule',
            onPress: () => navigation.navigate('OfficerSchedule'),
          },
          { text: 'OK' },
        ]
      );
    } else {
      Alert.alert('Sync Incomplete', result.error || 'Could not connect to server to complete sync.');
    }
  };

  const handleRemoveItem = (item: OfflineVerificationItem) => {
    Alert.alert(
      'Remove from Offline Queue?',
      `Remove this unsynchronized verification for ${item.instrumentId} from the local offline queue? This only deletes the local draft and does not affect the central database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeOfflineItem(item.localId);
            loadQueue();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Offline Verification Queue"
        subtitle="Field Storage & Central Ledger Sync"
        roleLabel="Officer Sync"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Sync Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <Text style={styles.summaryIcon}>📡</Text>
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryTitle}>Offline Storage Cache</Text>
              <Text style={styles.summarySub}>
                {pendingCount > 0
                  ? `${pendingCount} record(s) awaiting MySQL database synchronization`
                  : 'All field records synchronized with central MySQL registry'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncBtn, (syncing || pendingCount === 0) && styles.syncBtnDisabled]}
            onPress={handleSyncAll}
            disabled={syncing || pendingCount === 0}
            activeOpacity={0.85}
          >
            {syncing ? (
              <View style={styles.syncingRow}>
                <ActivityIndicator size="small" color={Colors.textWhite} />
                <Text style={styles.syncBtnText}>Uploading to Database...</Text>
              </View>
            ) : (
              <Text style={styles.syncBtnText}>
                {pendingCount > 0 ? `Sync Now (${pendingCount} Records)` : 'All Records Synced ✓'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeader}>Cached Field Records ({queue.length})</Text>
          <TouchableOpacity onPress={loadQueue}>
            <Text style={styles.refreshText}>↻ Reload</Text>
          </TouchableOpacity>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>Queue Is Empty</Text>
            <Text style={styles.emptySubtitle}>
              When performing field verifications without internet connectivity, saved records will
              accumulate here safely in local storage until synced.
            </Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {queue.map((item) => (
              <View key={item.localId} style={styles.queueCard}>
                <View style={styles.queueTopRow}>
                  <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>ID: {item.instrumentId}</Text>
                  </View>
                  <View
                    style={[
                      styles.resultBadge,
                      item.result === 'PASS' ? styles.resultPass : styles.resultFail,
                    ]}
                  >
                    <Text style={styles.resultBadgeText}>{item.result}</Text>
                  </View>
                </View>

                <Text style={styles.cardModel}>{item.instrumentModel || 'Weighing Scale'}</Text>
                <Text style={styles.cardOwner}>🏢 {item.ownerName}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  📍 {item.ownerAddress}
                </Text>

                <View style={styles.evidenceSummaryRow}>
                  <Text style={styles.evidenceTag}>
                    {item.photoReference ? '📷 Photo ✓' : '📷 No Photo'}
                  </Text>
                  <Text style={styles.evidenceTag}>
                    {item.latitude ? '📍 GPS Tagged ✓' : '📍 No GPS'}
                  </Text>
                  <Text style={styles.timeTag}>
                    {new Date(item.queuedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveItem(item)}
                  >
                    <Text style={styles.removeBtnText}>🗑 Remove Instrument</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryIcon: {
    fontSize: 22,
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summarySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryNavy,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#10B981',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  queueList: {
    marginTop: 4,
  },
  queueCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  queueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  idBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultPass: {
    backgroundColor: '#DCFCE7',
  },
  resultFail: {
    backgroundColor: '#FEE2E2',
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardModel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardOwner: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  cardAddress: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  evidenceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  evidenceTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  timeTag: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  cardActionsRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
