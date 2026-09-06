import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Platform
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { mockInstruments, Instrument } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser } from '../../services/authService';

interface MyInstrumentsScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

interface BulkBatchRecord {
  id: string;
  bulkBatchNumber: string;
  facilityName: string;
  category: string;
  instrumentCount: number;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
  progressPercent: number;
  status: string;
  preferredDate?: string;
  estimatedFee?: number;
  remarks?: string;
  batches?: Array<{
    id: string;
    batchName: string;
    totalCount: number;
    completedCount: number;
    officerName?: string;
    assignedOfficerId?: string;
  }>;
}

export const MyInstrumentsScreen: React.FC<MyInstrumentsScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const currentOwnerId = activeUser?.id || 'OWN-101';

  // Category Tab: 'single' | 'bulk'
  const [activeCategory, setActiveCategory] = useState<'single' | 'bulk'>('single');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Expiring Soon' | 'Pending' | 'Scheduled' | 'Expired'>('All');
  const [instruments, setInstruments] = useState<Instrument[]>(() =>
    currentOwnerId === 'OWN-101' ? mockInstruments.filter(i => i.ownerId === 'OWN-101') : []
  );
  const [bulkRequests, setBulkRequests] = useState<BulkBatchRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch live instruments and bulk requests from backend
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Instruments
      const resInst = await fetch(`${API_ENDPOINTS.instruments}?ownerId=${currentOwnerId}`);
      if (resInst.ok) {
        const dataInst = await resInst.json();
        if (dataInst.instruments && Array.isArray(dataInst.instruments)) {
          setInstruments(dataInst.instruments);
        }
      }

      // 2. Fetch Bulk Requests
      const resBulk = await fetch(`${API_ENDPOINTS.bulkRequests}?ownerId=${currentOwnerId}`);
      if (resBulk.ok) {
        const dataBulk = await resBulk.json();
        if (dataBulk.bulkRequests && Array.isArray(dataBulk.bulkRequests)) {
          setBulkRequests(dataBulk.bulkRequests);
        }
      }
    } catch {
      // Keep existing data if offline
    }
  }, [currentOwnerId]);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Helper to match status case-insensitively with alias support
  const matchesFilter = (itemStatus: string, filter: string): boolean => {
    if (filter === 'All') return true;

    const norm = (itemStatus || '').toUpperCase().trim().replace(/[\s_-]+/g, '');
    const normFilter = filter.toUpperCase().trim().replace(/[\s_-]+/g, '');

    if (normFilter === 'VERIFIED') {
      return norm === 'VERIFIED' || norm === 'COMPLETED';
    }
    if (normFilter === 'EXPIRINGSOON') {
      return norm === 'EXPIRINGSOON';
    }
    if (normFilter === 'PENDING') {
      return norm === 'PENDING' || norm === 'SUBMITTED' || norm === 'INREVIEW';
    }
    if (normFilter === 'SCHEDULED') {
      return norm === 'SCHEDULED' || norm === 'ASSIGNED' || norm === 'INPROGRESS';
    }
    if (normFilter === 'EXPIRED') {
      return norm === 'EXPIRED';
    }
    return norm === normFilter;
  };

  // Filter single instruments: exclude auto-generated bulk items
  const singleInstruments = instruments.filter(
    item => !item.id.startsWith('INST-BULK-') && !item.serialNumber?.startsWith('SN-BULK-')
  );

  const filteredSingleInstruments = singleInstruments.filter(item => {
    const matchesSearch =
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    return matchesFilter(item.status, activeFilter);
  });

  // Filter bulk requests
  const filteredBulkRequests = bulkRequests.filter(b => {
    const matchesSearch =
      b.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bulkBatchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    return matchesFilter(b.status, activeFilter);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="My Instruments & Fleets"
        subtitle="Directorate of Legal Metrology • Permanent Equipment Registry"
        roleLabel="Owner Portal"
        onSwitchRole={onSwitchRole}
      />

      <View style={styles.container}>
        {/* Top Category Segmented Switcher (Single vs Bulk) */}
        <View style={styles.categorySwitcher}>
          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategory === 'single' && styles.categoryTabActive
            ]}
            onPress={() => setActiveCategory('single')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === 'single' && styles.categoryTabTextActive
              ]}
            >
              🎯 Single Instruments ({singleInstruments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategory === 'bulk' && styles.categoryTabActive
            ]}
            onPress={() => setActiveCategory('bulk')}
            activeOpacity={0.85}
          >
            <View style={styles.bulkTabBadgeRow}>
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === 'bulk' && styles.categoryTabTextActive
                ]}
              >
                📦 Bulk Fleets / Batches ({bulkRequests.length})
              </Text>
              <View style={styles.multiUnitPill}>
                <Text style={styles.multiUnitPillText}>FLEET</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder={
              activeCategory === 'single'
                ? "Search by ID, Model, or Serial Number..."
                : "Search by Batch Code, Facility, or Category..."
            }
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterRow}>
          {(['All', 'Verified', 'Expiring Soon', 'Pending', 'Scheduled', 'Expired'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Registry Count & Refresh Bar */}
        <View style={styles.countBanner}>
          <Text style={styles.countText}>
            {activeCategory === 'single' ? (
              <>Showing <Text style={styles.bold}>{filteredSingleInstruments.length}</Text> individual instruments</>
            ) : (
              <>Showing <Text style={styles.bold}>{filteredBulkRequests.length}</Text> bulk batches ({filteredBulkRequests.reduce((acc, b) => acc + (b.instrumentCount || 0), 0)} total machines)</>
            )}
          </Text>
          <TouchableOpacity onPress={fetchData} style={styles.refreshBadge}>
            <Text style={styles.refreshBadgeText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primaryNavy]}
            />
          }
        >
          {activeCategory === 'single' ? (
            /* ================= SINGLE INSTRUMENTS LIST ================= */
            filteredSingleInstruments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📂</Text>
                <Text style={styles.emptyTitle}>No matching single instruments found</Text>
                <Text style={styles.emptySub}>Register an instrument or adjust your filters.</Text>
              </View>
            ) : (
              filteredSingleInstruments.map((inst, index) => {
                // Ensure date is always clearly formatted and visible
                const dateDisplay = inst.expiryDate
                  ? { label: 'EXPIRY / VALID UNTIL', val: inst.expiryDate, isExpiry: true }
                  : inst.scheduledDate
                  ? { label: 'SCHEDULED DUE DATE', val: inst.scheduledDate, isExpiry: false }
                  : inst.lastVerifiedDate
                  ? { label: 'LAST VERIFIED', val: inst.lastVerifiedDate, isExpiry: false }
                  : { label: 'VERIFICATION DUE', val: 'Pending Schedule', isExpiry: false };

                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={styles.tableRowCard}
                    onPress={() => navigation.navigate('Passport', { instrument: inst })}
                    activeOpacity={0.85}
                  >
                    {/* Tricolor National Top Strip */}
                    <View style={styles.cardTricolor}>
                      <View style={[styles.cardTriBand, { backgroundColor: '#FF9933' }]} />
                      <View style={[styles.cardTriBand, { backgroundColor: '#CBD5E1' }]} />
                      <View style={[styles.cardTriBand, { backgroundColor: '#138808' }]} />
                    </View>

                    {/* Header Row */}
                    <View style={styles.rowTop}>
                      <View style={styles.srNumberBadge}>
                        <Text style={styles.srNumberText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.titleInfo}>
                        <Text style={styles.modelNameText}>{inst.model}</Text>
                        <View style={styles.idBadgeHighlight}>
                          <Text style={styles.idBadgeIcon}>🏷️</Text>
                          <Text style={styles.idBadgeLabel}>UID:</Text>
                          <Text style={styles.idBadgeValue}>{inst.id}</Text>
                        </View>
                      </View>
                      <StatusBadge status={inst.status} size="sm" />
                    </View>

                    {/* Details Grid 1: Category & Serial */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Type / Category</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {inst.category} {inst.subCategory ? `• ${inst.subCategory}` : ''}
                        </Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Serial Number</Text>
                        <Text style={[styles.detailValue, styles.monoText]} numberOfLines={1}>
                          {inst.serialNumber || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Details Grid 2: Capacity & Highly Visible Due Date */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Capacity & Class</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {inst.capacity} ({inst.accuracyClass || 'Class III'})
                        </Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabelHighlight}>{dateDisplay.label}</Text>
                        <Text
                          style={[
                            styles.detailValueDate,
                            inst.status === 'Expiring Soon' && { color: '#C2410C' },
                            inst.status === 'Expired' && { color: '#B91C1C' }
                          ]}
                          numberOfLines={1}
                        >
                          📅 {dateDisplay.val}
                        </Text>
                      </View>
                    </View>

                    {/* Footer Strip */}
                    <View style={styles.rowFooter}>
                      <Text style={styles.lastVerifiedText} numberOfLines={1}>
                        📍 {inst.location}
                      </Text>
                      <View style={styles.twinPillMini}>
                        <Text style={styles.twinPillMiniText}>🌐 3D Digital Twin & Details ›</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            /* ================= BULK FLEETS / BATCHES LIST ================= */
            filteredBulkRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No bulk verification requests found</Text>
                <Text style={styles.emptySub}>
                  Submit a bulk batch from the 'New Request' tab for 25, 50, 100, or 250+ machines.
                </Text>
              </View>
            ) : (
              filteredBulkRequests.map((bulk, index) => {
                const displayDueDate = bulk.preferredDate || '2026-09-25';

                return (
                  <View key={bulk.id} style={styles.bulkFleetCard}>
                    {/* Tricolor National Top Strip */}
                    <View style={styles.cardTricolor}>
                      <View style={[styles.cardTriBand, { backgroundColor: '#FF9933' }]} />
                      <View style={[styles.cardTriBand, { backgroundColor: '#CBD5E1' }]} />
                      <View style={[styles.cardTriBand, { backgroundColor: '#138808' }]} />
                    </View>

                    {/* Bulk Card Header */}
                    <View style={styles.bulkHeaderRow}>
                      <View style={styles.bulkIconBadge}>
                        <Text style={styles.bulkIconSymbol}>📦</Text>
                      </View>
                      <View style={styles.bulkTitleCol}>
                        <Text style={styles.bulkFacilityTitle}>{bulk.facilityName}</Text>
                        <View style={styles.batchTagRow}>
                          <Text style={styles.batchTagCode}>{bulk.bulkBatchNumber}</Text>
                          <Text style={styles.batchRefId}>• ID: {bulk.id}</Text>
                        </View>
                      </View>
                      <StatusBadge
                        status={
                          bulk.status === 'COMPLETED'
                            ? 'Verified'
                            : bulk.status === 'IN_PROGRESS'
                            ? 'Scheduled'
                            : 'Pending'
                        }
                        size="sm"
                      />
                    </View>

                    {/* PROMINENT FLEET QUANTITY BANNER */}
                    <View style={styles.fleetQuantityHero}>
                      <View style={styles.quantityNumCol}>
                        <Text style={styles.quantityHeroNumber}>{bulk.instrumentCount}</Text>
                        <Text style={styles.quantityHeroUnits}>MACHINES IN FLEET</Text>
                      </View>
                      <View style={styles.quantityDivider} />
                      <View style={styles.quantityMetaCol}>
                        <Text style={styles.categoryHeroText}>{bulk.category}</Text>
                        <Text style={styles.feeHeroText}>
                          Statutory Fee: <Text style={styles.feeHeroBold}>₹ {bulk.estimatedFee?.toLocaleString('en-IN') || '50,000'}</Text>
                        </Text>
                        <Text style={styles.dateHeroText}>
                          📅 Scheduled Inspection: <Text style={styles.dateHeroBold}>{displayDueDate}</Text>
                        </Text>
                      </View>
                    </View>

                    {/* Sub-Batch Allocation Breakdown */}
                    {bulk.batches && bulk.batches.length > 0 ? (
                      <View style={styles.allocBreakdownBox}>
                        <Text style={styles.allocBreakdownTitle}>
                          👮 Team Officer Multi-Deployment ({bulk.batches.length} Sub-Batches):
                        </Text>
                        <View style={styles.subBatchesGrid}>
                          {bulk.batches.map((b) => (
                            <View key={b.id} style={styles.subBatchPill}>
                              <Text style={styles.subBatchName}>{b.batchName}</Text>
                              <Text style={styles.subBatchOfficer}>
                                ⚖️ {b.officerName || b.assignedOfficerId || 'Assigned LMO'}
                              </Text>
                              <View style={styles.subBatchCountPill}>
                                <Text style={styles.subBatchCountText}>{b.totalCount} Units</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.awaitingSplitNotice}>
                        <Text style={styles.awaitingSplitText}>
                          ⏳ Awaiting Admin balanced auto-split across regional LMO officer team.
                        </Text>
                      </View>
                    )}

                    {/* Remarks Footer */}
                    {bulk.remarks ? (
                      <View style={styles.bulkFooterNote}>
                        <Text style={styles.noteLabel}>Special Instructions:</Text>
                        <Text style={styles.noteText}>{bulk.remarks}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  categorySwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  categoryTabActive: {
    backgroundColor: Colors.primaryNavy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  categoryTabTextActive: {
    color: '#FFFFFF'
  },
  bulkTabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  multiUnitPill: {
    backgroundColor: Colors.accentAmber,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4
  },
  multiUnitPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 42
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 12.5,
    color: Colors.textPrimary
  },
  clearText: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: 4
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 10
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  filterChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  filterText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  countBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  countText: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary
  },
  refreshBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  refreshBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  listContent: {
    paddingBottom: 28,
    gap: 12
  },
  tableRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden'
  },
  cardTricolor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    flexDirection: 'row'
  },
  cardTriBand: {
    flex: 1,
    height: '100%'
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8
  },
  srNumberBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8
  },
  srNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  titleInfo: {
    flex: 1
  },
  modelNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  idBadgeHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4
  },
  idBadgeIcon: {
    fontSize: 10
  },
  idBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5
  },
  idBadgeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  detailCol: {
    flex: 1
  },
  detailLabel: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  detailLabelHighlight: {
    fontSize: 9,
    color: '#1E3A8A',
    textTransform: 'uppercase',
    fontWeight: '800'
  },
  detailValue: {
    fontSize: 11.5,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 1
  },
  detailValueDate: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '800',
    marginTop: 1
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#334155'
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  lastVerifiedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1
  },
  twinPillMini: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8
  },
  twinPillMiniText: {
    color: '#1D4ED8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  emptySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center'
  },

  /* ================= BULK FLEET CARD STYLES ================= */
  bulkFleetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden'
  },
  bulkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12
  },
  bulkIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  bulkIconSymbol: {
    fontSize: 20
  },
  bulkTitleCol: {
    flex: 1
  },
  bulkFacilityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  batchTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6
  },
  batchTagCode: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accentAmber,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  batchRefId: {
    fontSize: 10,
    color: Colors.textMuted
  },
  fleetQuantityHero: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  quantityNumCol: {
    alignItems: 'center',
    paddingRight: 14,
    minWidth: 95
  },
  quantityHeroNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primaryNavy,
    lineHeight: 36
  },
  quantityHeroUnits: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 2
  },
  quantityDivider: {
    width: 1.5,
    height: '80%',
    backgroundColor: '#CBD5E1',
    marginRight: 14
  },
  quantityMetaCol: {
    flex: 1
  },
  categoryHeroText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4
  },
  feeHeroText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 2
  },
  feeHeroBold: {
    fontWeight: '800',
    color: '#047857'
  },
  dateHeroText: {
    fontSize: 11,
    color: '#475569'
  },
  dateHeroBold: {
    fontWeight: '800',
    color: '#1E3A8A'
  },
  allocBreakdownBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginBottom: 10
  },
  allocBreakdownTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  subBatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  subBatchPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    padding: 6,
    minWidth: '47%',
    flex: 1
  },
  subBatchName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534'
  },
  subBatchOfficer: {
    fontSize: 9.5,
    color: '#374151',
    marginTop: 1
  },
  subBatchCountPill: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3
  },
  subBatchCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D'
  },
  awaitingSplitNotice: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  awaitingSplitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309'
  },
  bulkFooterNote: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  noteLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase'
  },
  noteText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 1
  }
});
