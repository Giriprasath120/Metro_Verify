import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { mockBulkBatches, mockInstruments, BulkBatch, mockOwners } from '../../../data/mockData';
import { Colors } from '../../theme/colors';

interface BulkBatchMonitorScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const BulkBatchMonitorScreen: React.FC<BulkBatchMonitorScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [selectedBatch, setSelectedBatch] = useState<BulkBatch | null>(null);

  const getOwnerName = (ownerId: string) => {
    const owner = mockOwners.find(o => o.id === ownerId);
    return owner?.businessName || ownerId;
  };

  const selectedBatchInstruments = selectedBatch
    ? mockInstruments.filter(
        i => selectedBatch.instruments.includes(i.id) || i.batchId === selectedBatch.id
      )
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Bulk Batch Monitoring"
        subtitle="Multi-Instrument Verification Workflow Tracker"
        roleLabel="State Batch Ops"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>‹ Back to Admin Dashboard</Text>
        </TouchableOpacity>

        {/* Overview Banner */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Active Bulk Verification Workflows</Text>
          <Text style={styles.overviewDesc}>
            Large-scale verification batches from wholesale mandis and industrial clusters, auto-split across available district inspectors.
          </Text>
        </View>

        {/* Batches List */}
        <View style={styles.batchList}>
          {mockBulkBatches.map(batch => {
            const progressPercent = Math.round((batch.verifiedCount / batch.totalInstruments) * 100);

            return (
              <View key={batch.id} style={styles.batchCard}>
                <View style={styles.batchTopRow}>
                  <View style={styles.batchIdBox}>
                    <Text style={styles.batchIdText}>{batch.batchNumber}</Text>
                    <Text style={styles.batchOwnerText}>{getOwnerName(batch.ownerId)}</Text>
                  </View>
                  <StatusBadge status={batch.status} size="sm" />
                </View>

                {/* Progress Bar (Requirement) */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressCurrentText}>
                      Batch {batch.currentBatchIndex} of {batch.totalBatches}
                    </Text>
                    <Text style={styles.progressCountText}>
                      {batch.verifiedCount} / {batch.totalInstruments} instruments verified ({progressPercent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                </View>

                {/* Assigned Officers Split List */}
                <View style={styles.officersSection}>
                  <Text style={styles.officersSectionTitle}>Allocated Enforcement Officers:</Text>
                  {batch.assignedOfficers.map((officer, oIdx) => (
                    <View key={oIdx} style={styles.officerSplitRow}>
                      <Text style={styles.officerSplitName}>⚖️ {officer.officerName}</Text>
                      <View style={styles.officerCountPill}>
                        <Text style={styles.officerCountText}>{officer.allocatedCount} units</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Drill-down button */}
                <TouchableOpacity
                  style={styles.drillDownBtn}
                  onPress={() => setSelectedBatch(batch)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.drillDownBtnText}>
                    🔍 Drill-Down Instruments ({batch.instruments.length}) ›
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Drill-Down Modal */}
      <Modal
        visible={Boolean(selectedBatch)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Batch Breakdown: {selectedBatch?.batchNumber}</Text>
                <Text style={styles.modalSubtitle}>
                  {getOwnerName(selectedBatch?.ownerId || '')} • {selectedBatch?.totalInstruments} Total Instruments
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedBatch(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalListHeading}>Instruments within this Batch:</Text>
              {selectedBatchInstruments.map((inst, index) => (
                <View key={inst.id} style={styles.instDetailRow}>
                  <View style={styles.instNumBox}>
                    <Text style={styles.instNumText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.instInfoCol}>
                    <Text style={styles.instModel}>{inst.model}</Text>
                    <Text style={styles.instMeta}>
                      ID: {inst.id} • {inst.location}
                    </Text>
                  </View>
                  <StatusBadge status={inst.status} size="sm" />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background
  },
  container: {
    padding: 16,
    paddingBottom: 32
  },
  backBtn: {
    marginBottom: 10
  },
  backBtnText: {
    fontSize: 13,
    color: Colors.primaryNavy,
    fontWeight: '700'
  },
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 14
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  overviewDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15
  },
  batchList: {
    gap: 14
  },
  batchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  batchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  batchIdBox: {
    flex: 1
  },
  batchIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  batchOwnerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1
  },
  progressContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressCurrentText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy
  },
  progressCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accentAmber
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accentAmber,
    borderRadius: 4
  },
  officersSection: {
    marginBottom: 10
  },
  officersSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4
  },
  officerSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3
  },
  officerSplitName: {
    fontSize: 11,
    color: Colors.textPrimary
  },
  officerCountPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  officerCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  drillDownBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4
  },
  drillDownBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryNavy,
    padding: 14
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textWhite
  },
  modalSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  modalCloseText: {
    color: Colors.textWhite,
    fontWeight: 'bold',
    fontSize: 12
  },
  modalScroll: {
    padding: 14
  },
  modalListHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8
  },
  instDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  instNumBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8
  },
  instNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  instInfoCol: {
    flex: 1,
    marginRight: 8
  },
  instModel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  instMeta: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1
  }
});
