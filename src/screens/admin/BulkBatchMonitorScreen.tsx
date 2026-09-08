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
    backgroundColor: '#F6F9FC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 14,
  },
  backBtnText: {
    fontSize: 13,
    color: '#635BFF',
    fontWeight: '700',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  overviewDesc: {
    fontSize: 12,
    color: '#425466',
    marginTop: 4,
    lineHeight: 18,
  },
  batchList: {
    gap: 16,
  },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 18,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  batchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  batchIdBox: {
    flex: 1,
  },
  batchIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  batchOwnerText: {
    fontSize: 12,
    color: '#425466',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#F6F9FC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCurrentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0A2540',
  },
  progressCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#635BFF',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E3E8EE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#635BFF',
    borderRadius: 4,
  },
  officersSection: {
    marginBottom: 14,
  },
  officersSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8898AA',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  officerSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  officerSplitName: {
    fontSize: 12,
    color: '#0A2540',
    fontWeight: '600',
  },
  officerCountPill: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.2)',
  },
  officerCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#635BFF',
  },
  drillDownBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    marginTop: 6,
    shadowColor: 'rgba(50, 50, 93, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  drillDownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#635BFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 37, 64, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A2540',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#8898AA',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalScroll: {
    padding: 16,
  },
  modalListHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  instDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F9FC',
  },
  instNumBox: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  instNumText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8898AA',
  },
  instInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  instModel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A2540',
  },
  instMeta: {
    fontSize: 10.5,
    color: '#425466',
    marginTop: 2,
  },
});
