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
    backgroundColor: '#F6F9FC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 18,
    marginBottom: 20,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.2)',
  },
  summaryIcon: {
    fontSize: 22,
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540',
  },
  summarySub: {
    fontSize: 12,
    color: '#425466',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#635BFF',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  syncBtnDisabled: {
    backgroundColor: '#E3E8EE',
    shadowOpacity: 0,
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  refreshText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#635BFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#00D4FF',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#425466',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 360,
  },
  queueList: {
    gap: 14,
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    shadowColor: 'rgba(50, 50, 93, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  queueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.2)',
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#635BFF',
  },
  resultBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resultPass: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultFail: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A2540',
  },
  cardModel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  cardOwner: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0A2540',
    marginTop: 4,
  },
  cardAddress: {
    fontSize: 11.5,
    color: '#425466',
    marginTop: 2,
  },
  evidenceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F6F9FC',
  },
  evidenceTag: {
    fontSize: 11,
    color: '#635BFF',
    fontWeight: '700',
  },
  timeTag: {
    fontSize: 10.5,
    color: '#8898AA',
    marginLeft: 'auto',
  },
  cardActionsRow: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
