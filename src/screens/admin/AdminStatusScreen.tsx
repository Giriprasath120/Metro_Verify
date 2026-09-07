import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';

interface AdminStatusScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const AdminStatusScreen: React.FC<AdminStatusScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [loading, setLoading] = useState(false);
  const [singleRequests, setSingleRequests] = useState<any[]>([]);
  const [bulkRequests, setBulkRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ALLOCATED' | 'IN_PROGRESS' | 'PASSED_TO_GATC' | 'COMPLETED'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, bulkRes] = await Promise.all([
        fetch(API_ENDPOINTS.applications),
        fetch(API_ENDPOINTS.bulkRequests),
      ]);
      const appData = await appRes.json();
      const bulkData = await bulkRes.json();

      if (appData.success && Array.isArray(appData.applications)) {
        setSingleRequests(appData.applications);
      }
      if (bulkData.success && Array.isArray(bulkData.bulkRequests)) {
        setBulkRequests(bulkData.bulkRequests);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  // Status Tab ONLY includes allocated, scheduled, in-progress, and completed requests (status !== 'SUBMITTED')
  const allocatedSingle = singleRequests.filter(req => {
    const isAllocated = req.status !== 'SUBMITTED' || (req.assignments && req.assignments.length > 0);
    if (!isAllocated) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ALLOCATED') return ['ASSIGNED', 'SCHEDULED', 'ALLOCATED'].includes(req.status);
    if (statusFilter === 'IN_PROGRESS') return req.status === 'IN_PROGRESS';
    if (statusFilter === 'PASSED_TO_GATC') return ['PASSED_TO_GATC', 'CERTIFIED_BY_LMO', 'GATC_QUEUE'].includes(req.status);
    if (statusFilter === 'COMPLETED') return ['COMPLETED', 'VERIFIED', 'ACTIVE'].includes(req.status);
    return true;
  });

  const allocatedBulk = bulkRequests.filter(b => {
    const isAllocated = b.status !== 'SUBMITTED';
    if (!isAllocated) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ALLOCATED') return ['ALLOCATED', 'SCHEDULED', 'ASSIGNED'].includes(b.status);
    if (statusFilter === 'IN_PROGRESS') return b.status === 'IN_PROGRESS';
    if (statusFilter === 'COMPLETED') return ['COMPLETED', 'VERIFIED'].includes(b.status);
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Verification Status"
        subtitle="Allocated, In-Progress & Completed Verification Tracking"
        roleLabel="Admin Desk"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[Colors.primaryNavy]} />}
      >
        {/* Top Summary Notice */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{allocatedSingle.length}</Text>
            <Text style={styles.summaryLabel}>Allocated Singles</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{allocatedBulk.length}</Text>
            <Text style={styles.summaryLabel}>Allocated Batches</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#15803D' }]}>
              {singleRequests.filter(r => ['COMPLETED', 'VERIFIED'].includes(r.status)).length}
            </Text>
            <Text style={styles.summaryLabel}>Completed Form VI</Text>
          </View>
        </View>

        {/* Top Segmented Control: Single vs Bulk */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'single' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, activeTab === 'single' && styles.segmentBtnTextActive]}>
              🎯 Single Requests ({allocatedSingle.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'bulk' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('bulk')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, activeTab === 'bulk' && styles.segmentBtnTextActive]}>
              📦 Bulk Batches ({allocatedBulk.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filter Status:</Text>
          {(['ALL', 'ALLOCATED', 'IN_PROGRESS', 'PASSED_TO_GATC', 'COMPLETED'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
                {f.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ======================= SINGLE ALLOCATED REQUESTS ======================= */}
        {activeTab === 'single' && (
          <View>
            {allocatedSingle.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📑</Text>
                <Text style={styles.emptyTitle}>No Allocated Single Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  Requests allocated by admin will appear here with live verification and laboratory status.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {allocatedSingle.map(req => {
                  const assignment = req.assignments?.[0];
                  const officerName = assignment?.assignedOfficer?.name || 'V. Ramanathan';
                  const officerBadge = assignment?.assignedOfficer?.badgeNumber || 'LMO-TN-CHN-041';
                  const scheduledDate = assignment?.scheduledDate || req.createdAt?.split('T')?.[0] || '2026-09-10';
                  const timeSlot = assignment?.timeSlot || '10:00 AM - 01:00 PM';
                  const inst = req.instrument;

                  return (
                    <View key={req.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reqId}>{req.id}</Text>
                          <Text style={styles.instName}>
                            {inst?.model || req.category} ({req.instrumentId})
                          </Text>
                        </View>
                        <StatusBadge status={req.status || 'SCHEDULED'} size="sm" />
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Assigned LMO:</Text>
                          <Text style={[styles.detailValue, { fontWeight: '800', color: Colors.primaryNavy }]}>
                            ⚖️ {officerName} ({officerBadge})
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Inspection Schedule:</Text>
                          <Text style={styles.detailValue}>
                            📅 {scheduledDate} | ⏰ {timeSlot}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Jurisdiction & District:</Text>
                          <Text style={styles.detailValue}>
                            📍 {inst?.district || 'Chennai North'}, Tamil Nadu
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Capacity & Class:</Text>
                          <Text style={styles.detailValue}>
                            ⚖️ {inst?.capacity || req.capacity || '50 kg'} ({inst?.accuracyClass || 'Class III'})
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Establishment:</Text>
                          <Text style={styles.detailValue}>
                            🏢 {req.owner?.businessName || req.owner?.name || 'Sri Balaji Traders'}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Statutory Fee Paid:</Text>
                          <Text style={[styles.detailValue, { fontWeight: '800', color: '#0F172A' }]}>
                            ₹{req.fee || 500} (Challan Verified)
                          </Text>
                        </View>
                      </View>

                      {/* Card Footer Status Indicator */}
                      <View style={styles.cardFooterInfo}>
                        <Text style={styles.footerNoteText}>
                          {req.status === 'COMPLETED'
                            ? '✓ Form VI Digital Certificate Generated & Endorsed by GATC Lab'
                            : req.status === 'PASSED_TO_GATC'
                            ? '🔬 Field Verification Approved by LMO • In GATC Lab Endorsement Queue'
                            : req.status === 'IN_PROGRESS'
                            ? '⏳ Physical Inspection In Progress on Site'
                            : '📋 Allocated to LMO Schedule • Pending On-Site Stamping'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ======================= BULK ALLOCATED BATCHES ======================= */}
        {activeTab === 'bulk' && (
          <View>
            {allocatedBulk.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                <Text style={styles.emptyTitle}>No Allocated Bulk Batches Found</Text>
                <Text style={styles.emptySubtitle}>
                  Bulk fleet allocations split across officers will appear here with team progress.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {allocatedBulk.map(bulk => {
                  const verifiedCount = bulk.verifiedCount || 0;
                  const totalCount = bulk.instrumentCount || 10;
                  const percent = Math.round((verifiedCount / totalCount) * 100);

                  return (
                    <View key={bulk.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reqId}>{bulk.bulkBatchNumber || bulk.id}</Text>
                          <Text style={styles.instName}>{bulk.facilityName}</Text>
                        </View>
                        <StatusBadge status={bulk.status} size="sm" />
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Instruments Fleet:</Text>
                          <Text style={[styles.detailValue, { fontWeight: '800' }]}>
                            🔢 {totalCount} Units ({bulk.category})
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Allocated LMO Officers:</Text>
                          <Text style={[styles.detailValue, { color: Colors.primaryNavy, fontWeight: '700' }]}>
                            ⚖️ V. Ramanathan, S. Mukherjee, R. Priya
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Preferred Inspection:</Text>
                          <Text style={styles.detailValue}>
                            📅 {bulk.preferredDate || '2026-09-12'} | {bulk.preferredTimeSlot || 'Morning Batch'}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Location / Hub:</Text>
                          <Text style={styles.detailValue}>
                            📍 {bulk.location || 'Chennai North Industrial Corridor'}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{ marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                              Batch Verification Progress:
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.primaryNavy }}>
                              {verifiedCount}/{totalCount} Units ({percent}%)
                            </Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.max(5, percent)}%` }]} />
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardFooterInfo}>
                        <Text style={styles.footerNoteText}>
                          👥 Multi-officer split active. Units distributed across 3 field inspectors for concurrent calibration.
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
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
    paddingBottom: 40,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryNavy,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0A192F',
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#0A192F',
    borderColor: '#0A192F',
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqId: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A192F',
    letterSpacing: 0.5,
  },
  instName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 7,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#15803D',
    borderRadius: 4,
  },
  cardFooterInfo: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
