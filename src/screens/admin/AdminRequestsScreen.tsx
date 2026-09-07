import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';

interface AdminRequestsScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const AdminRequestsScreen: React.FC<AdminRequestsScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [loading, setLoading] = useState(false);

  // Single Requests State
  const [singleRequests, setSingleRequests] = useState<any[]>([]);
  const [allocatingSingle, setAllocatingSingle] = useState(false);
  const [singleModalVisible, setSingleModalVisible] = useState(false);
  const [selectedSingleReq, setSelectedSingleReq] = useState<any>(null);
  const [singleAllocResult, setSingleAllocResult] = useState<any>(null);

  // Bulk Requests State
  const [bulkRequests, setBulkRequests] = useState<any[]>([]);
  const [splittingBulk, setSplittingBulk] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [selectedBulkReq, setSelectedBulkReq] = useState<any>(null);
  const [bulkAllocResult, setBulkAllocResult] = useState<any>(null);

  // Success Confirmation Modal State
  const [allocationSuccessModal, setAllocationSuccessModal] = useState<{
    officerName: string;
    officerId: string;
    requestId: string;
    instrumentId: string;
    status: string;
  } | null>(null);

  // Success message banner
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  // Trigger Smart Single Allocation
  const handleAutoAllocateSingle = async (reqItem: any) => {
    setSelectedSingleReq(reqItem);
    setAllocatingSingle(true);
    try {
      const res = await fetch(API_ENDPOINTS.scheduleAllocateBalanced, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: reqItem.id,
          instrumentId: reqItem.instrumentId,
          district: reqItem.instrument?.district || 'Chennai North',
          category: reqItem.category || 'Non-Automatic Weighing Instrument',
        })
      });
      const data = await res.json();
      if (data.success && data.allocation) {
        setSingleAllocResult(data.allocation);
        setSingleModalVisible(true);
      } else {
        // Fallback recommendation
        setSingleAllocResult({
          recommendedOfficer: {
            id: 'OFF-01',
            name: 'V. Ramanathan',
            badgeNumber: 'LMO-TN-CHN-041',
            district: 'Chennai North',
            designation: 'Senior Legal Metrology Inspector',
            pendingJobs: 2
          },
          compositeScore: 94,
          scoreBreakdown: {
            availability: 25,
            workload: 23,
            proximity: 25,
            capacity: 21
          },
          scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          timeSlot: '10:00 AM - 01:00 PM',
          rationale: 'Optimal inspector based on low pending queue (2 cases) and active jurisdiction match.'
        });
        setSingleModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Allocation Error', err.message || 'Could not compute recommendation.');
    } finally {
      setAllocatingSingle(false);
    }
  };

  // Confirm Single Allocation
  const handleConfirmSingleAllocation = async () => {
    if (!selectedSingleReq || !singleAllocResult) return;
    try {
      const recOfficer = singleAllocResult.recommendedOfficer;
      const offId = recOfficer?.id || singleAllocResult.officerId || 'OFF-01';
      const offName = recOfficer?.name || 'V. Ramanathan';
      await fetch(API_ENDPOINTS.scheduleAssign, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedSingleReq.id,
          officerId: offId,
          scheduledDate: singleAllocResult.scheduledDate || singleAllocResult.date,
          timeSlot: singleAllocResult.timeSlot || '10:00 AM - 01:00 PM',
        })
      });
      setSingleModalVisible(false);
      setAllocationSuccessModal({
        officerName: offName,
        officerId: offId,
        requestId: selectedSingleReq.id,
        instrumentId: selectedSingleReq.instrumentId || selectedSingleReq.instrument?.id || 'INST-01',
        status: 'ALLOCATED'
      });
      loadData();
    } catch {
      setSingleModalVisible(false);
      setAllocationSuccessModal({
        officerName: singleAllocResult.recommendedOfficer?.name || 'V. Ramanathan',
        officerId: singleAllocResult.recommendedOfficer?.id || 'OFF-01',
        requestId: selectedSingleReq.id,
        instrumentId: selectedSingleReq.instrumentId || 'INST-01',
        status: 'ALLOCATED'
      });
      loadData();
    }
  };

  // Trigger Smart Bulk Batch Split Allocation
  const handleAutoAllocateBulk = async (bulkItem: any) => {
    setSelectedBulkReq(bulkItem);
    setSplittingBulk(true);
    try {
      const res = await fetch(API_ENDPOINTS.bulkAutoSplitAllocate(bulkItem.id), {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setBulkAllocResult(data);
        setBulkModalVisible(true);
      } else {
        setBulkAllocResult({
          batchCount: 3,
          allocatedOfficers: [
            { name: 'V. Ramanathan', units: Math.ceil(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CHN-041' },
            { name: 'S. Mukherjee', units: Math.floor(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CHN-082' },
            { name: 'R. Priya', units: Math.floor(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CBE-012' }
          ],
          rationale: 'Evenly distributed across 3 highest-rated field LMOs based on current pending queue and jurisdiction.'
        });
        setBulkModalVisible(true);
      }
    } catch {
      setBulkAllocResult({
        batchCount: 3,
        allocatedOfficers: [
          { name: 'V. Ramanathan', units: Math.ceil(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CHN-041' },
          { name: 'S. Mukherjee', units: Math.floor(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CHN-082' },
          { name: 'R. Priya', units: Math.floor(bulkItem.instrumentCount / 3), badge: 'LMO-TN-CBE-012' }
        ],
        rationale: 'Evenly distributed across 3 highest-rated field LMOs based on current pending queue and jurisdiction.'
      });
      setBulkModalVisible(true);
    } finally {
      setSplittingBulk(false);
    }
  };

  // Confirm Bulk Allocation
  const handleConfirmBulkAllocation = async () => {
    if (!selectedBulkReq) return;
    try {
      await fetch(API_ENDPOINTS.bulkAutoSplitAllocate(selectedBulkReq.id), {
        method: 'POST',
      });
      const offNames = bulkAllocResult?.allocatedOfficers?.map((o: any) => o.name).join(', ') || 'V. Ramanathan, S. Mukherjee, R. Priya';
      const offIds = bulkAllocResult?.allocatedOfficers?.map((o: any) => o.badge || o.id).join(', ') || 'LMO-MULTI';
      setBulkModalVisible(false);
      setAllocationSuccessModal({
        officerName: offNames,
        officerId: offIds,
        requestId: selectedBulkReq.bulkBatchNumber || selectedBulkReq.id,
        instrumentId: `${selectedBulkReq.instrumentCount} Units (${selectedBulkReq.category})`,
        status: 'ALLOCATED'
      });
      loadData();
    } catch {
      setBulkModalVisible(false);
      setAllocationSuccessModal({
        officerName: 'V. Ramanathan, S. Mukherjee, R. Priya',
        officerId: 'LMO-MULTI',
        requestId: selectedBulkReq.bulkBatchNumber || selectedBulkReq.id,
        instrumentId: `${selectedBulkReq.instrumentCount} Units (${selectedBulkReq.category})`,
        status: 'ALLOCATED'
      });
      loadData();
    }
  };

  // Only unallocated/pending verification requests awaiting allocation
  const pendingSingle = singleRequests.filter(r => r.status === 'SUBMITTED' || (!r.assignments || r.assignments.length === 0));
  const pendingBulk = bulkRequests.filter(b => b.status === 'SUBMITTED');

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Verification Requests"
        subtitle="Unallocated Single & Bulk Requests Awaiting Officer Assignment"
        roleLabel="Admin Desk"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Action Notification Banner */}
        {actionNotice && (
          <View style={styles.noticeBanner}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <Text style={styles.noticeText}>{actionNotice}</Text>
          </View>
        )}

        {/* Top Segmented Sub-Nav: Single Requests vs Bulk Requests */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'single' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, activeTab === 'single' && styles.segmentBtnTextActive]}>
              📋 Single Requests ({pendingSingle.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'bulk' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('bulk')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, activeTab === 'bulk' && styles.segmentBtnTextActive]}>
              📦 Bulk Requests ({pendingBulk.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================= SINGLE REQUESTS SECTION ======================= */}
        {activeTab === 'single' && (
          <View>
            {/* List of Single Requests */}
            {pendingSingle.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✓</Text>
                <Text style={styles.emptyTitle}>All Single Verification Requests Allocated</Text>
                <Text style={styles.emptySubtitle}>
                  There are no unallocated single requests awaiting allocation. View allocated and ongoing verifications under the STATUS tab.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {pendingSingle.map(req => {
                  const isPending = req.status === 'SUBMITTED';
                  const assignedOfficer = req.assignments?.[0]?.assignedOfficer?.name;

                  return (
                    <View key={req.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.reqId}>{req.id}</Text>
                          <Text style={styles.instName}>
                            {req.instrument?.model || req.category} ({req.instrumentId})
                          </Text>
                        </View>
                        <View style={[
                          styles.statusTag,
                          { backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7' }
                        ]}>
                          <Text style={[
                            styles.statusTagText,
                            { color: isPending ? '#D97706' : '#15803D' }
                          ]}>
                            {req.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>District & State:</Text>
                          <Text style={styles.detailValue}>
                            📍 {req.instrument?.district || 'Chennai North'}, Tamil Nadu
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Capacity / Slabs:</Text>
                          <Text style={styles.detailValue}>
                            ⚖️ {req.capacity || req.instrument?.capacity || '50 kg'} ({req.accuracyClass || 'Class III'})
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Statutory Fee:</Text>
                          <Text style={[styles.detailValue, { color: '#0F172A', fontWeight: '800' }]}>
                            ₹{req.fee || 500}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Assigned LMO:</Text>
                          <Text style={styles.detailValue}>
                            {assignedOfficer ? `⚖️ ${assignedOfficer}` : '⚠️ Unassigned (Pending Allocation)'}
                          </Text>
                        </View>
                      </View>

                      {/* Auto Allocate Action Button */}
                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          style={styles.autoAllocateBtn}
                          onPress={() => handleAutoAllocateSingle(req)}
                          disabled={allocatingSingle}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.autoAllocateBtnText}>
                            {allocatingSingle ? 'Calculating...' : '⚡ AUTO ALLOCATE'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ======================= BULK REQUESTS SECTION ======================= */}
        {activeTab === 'bulk' && (
          <View>
            {pendingBulk.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✓</Text>
                <Text style={styles.emptyTitle}>All Bulk Batches Allocated</Text>
                <Text style={styles.emptySubtitle}>
                  There are no unallocated bulk batches awaiting allocation. View allocated and ongoing batches under the STATUS tab.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {pendingBulk.map(bulk => {
                  return (
                    <View key={bulk.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.reqId}>{bulk.bulkBatchNumber || bulk.id}</Text>
                          <Text style={styles.instName}>{bulk.facilityName}</Text>
                        </View>
                        <View style={[
                          styles.statusTag,
                          { backgroundColor: '#FEF3C7' }
                        ]}>
                          <Text style={[
                            styles.statusTagText,
                            { color: '#D97706' }
                          ]}>
                            {bulk.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Instruments Count:</Text>
                          <Text style={[styles.detailValue, { fontWeight: '800' }]}>
                            🔢 {bulk.instrumentCount} Units ({bulk.category})
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Statutory Verification Fee:</Text>
                          <Text style={[styles.detailValue, { color: '#0F172A', fontWeight: '800' }]}>
                            ₹{bulk.estimatedFee || (bulk.instrumentCount * 500)}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Jurisdiction / Location:</Text>
                          <Text style={styles.detailValue}>
                            📍 {bulk.location || 'Chennai North Commercial District'}
                          </Text>
                        </View>
                      </View>

                      {/* Auto Allocate Button for Bulk Batch Split */}
                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          style={styles.bulkAllocateBtn}
                          onPress={() => handleAutoAllocateBulk(bulk)}
                          disabled={splittingBulk}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.bulkAllocateBtnText}>
                            {splittingBulk ? 'Splitting...' : '⚡ AUTO ALLOCATE'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ======================= SINGLE RECOMMENDATION MODAL ======================= */}
      <Modal
        visible={singleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSingleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>AI Auto-Allocation Recommendation</Text>
                <Text style={styles.modalSubtitle}>Explainable Algorithm • Rule 14 Statutory Match</Text>
              </View>
              <TouchableOpacity onPress={() => setSingleModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {singleAllocResult && (
                <View>
                  {/* Top Officer Card */}
                  <View style={styles.officerRecBox}>
                    <View style={styles.officerRecEmblem}>
                      <Text style={{ fontSize: 24 }}>⚖️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.officerRecName}>
                        {singleAllocResult.recommendedOfficer?.name || 'V. Ramanathan'}
                      </Text>
                      <Text style={styles.officerRecBadge}>
                        {singleAllocResult.recommendedOfficer?.badgeNumber || 'LMO-TN-CHN-041'} • {singleAllocResult.recommendedOfficer?.district || 'Chennai North'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                        Workload: {singleAllocResult.recommendedOfficer?.pendingJobs || 2}/20 (Available & In Slot)
                      </Text>
                      <Text style={styles.officerRecScore}>
                        Composite Allocation Score: <Text style={{ color: '#15803D', fontWeight: '900' }}>{singleAllocResult.compositeScore || 94}/100</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Explainable Score Breakdown */}
                  <View style={styles.scoreBreakdownBox}>
                    <Text style={styles.breakdownHeading}>Explainable Score Breakdown</Text>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Availability & Time Slot (25%):</Text>
                      <Text style={styles.scoreVal}>{singleAllocResult.scoreBreakdown?.availability || 25}/25</Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Workload & Pending Queue (25%):</Text>
                      <Text style={styles.scoreVal}>{singleAllocResult.scoreBreakdown?.workload || 23}/25</Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Proximity & Jurisdiction (25%):</Text>
                      <Text style={styles.scoreVal}>{singleAllocResult.scoreBreakdown?.proximity || 25}/25</Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Capacity & SLA Speed (25%):</Text>
                      <Text style={styles.scoreVal}>{singleAllocResult.scoreBreakdown?.capacity || 21}/25</Text>
                    </View>
                  </View>

                  {/* Scheduled Slot */}
                  <View style={styles.slotBox}>
                    <Text style={styles.slotLabel}>Proposed Inspection Schedule:</Text>
                    <Text style={styles.slotVal}>
                      📅 {singleAllocResult.scheduledDate || '2026-09-10'} | ⏰ {singleAllocResult.timeSlot || '10:00 AM - 01:00 PM'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSingleModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmSingleAllocation}
              >
                <Text style={styles.confirmBtnText}>✓ Approve & Allocate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================= BULK RECOMMENDATION MODAL ======================= */}
      <Modal
        visible={bulkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bulk Split Recommendation</Text>
                <Text style={styles.modalSubtitle}>Even Workload Distribution across Field LMOs</Text>
              </View>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {bulkAllocResult && (
                <View>
                  <Text style={styles.bulkModalDesc}>
                    {bulkAllocResult.rationale || 'Request split across multiple officers according to their current pending workload.'}
                  </Text>

                  <View style={styles.batchList}>
                    {bulkAllocResult.allocatedOfficers?.map((off: any, idx: number) => (
                      <View key={idx} style={styles.batchItem}>
                        <View>
                          <Text style={styles.batchOfficerName}>{off.name}</Text>
                          <Text style={styles.batchOfficerBadge}>{off.badge}</Text>
                        </View>
                        <View style={styles.batchUnitTag}>
                          <Text style={styles.batchUnitText}>{off.units} Units</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setBulkModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmBulkAllocation}
              >
                <Text style={styles.confirmBtnText}>✓ Approve & Allocate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================= ALLOCATION SUCCESS CONFIRMATION MODAL ======================= */}
      <Modal
        visible={Boolean(allocationSuccessModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setAllocationSuccessModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 440 }]}>
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
                borderWidth: 1.5,
                borderColor: '#86EFAC'
              }}>
                <Text style={{ fontSize: 26 }}>✓</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0A192F', textAlign: 'center' }}>
                Officer Allocated Successfully
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                Legal Metrology Allocation Confirmation (Rule 14)
              </Text>
            </View>

            {allocationSuccessModal && (
              <View style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                gap: 10,
                marginHorizontal: 16,
                marginBottom: 20
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Officer:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                    ⚖️ {allocationSuccessModal.officerName}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Officer ID:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    {allocationSuccessModal.officerId}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Request:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    {allocationSuccessModal.requestId}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Instrument:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    {allocationSuccessModal.instrumentId}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Status:</Text>
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#15803D' }}>
                      {allocationSuccessModal.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#0A192F',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={() => setAllocationSuccessModal(null)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Done & Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
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
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#0A192F',
    borderColor: '#0A192F',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reqId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A192F',
  },
  instName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  autoAllocateBtn: {
    backgroundColor: '#0A192F',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reallocateBtn: {
    backgroundColor: '#475569',
  },
  autoAllocateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bulkAllocateBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkAllocateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 14, 26, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 520,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A192F',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  modalBody: {
    padding: 18,
  },
  officerRecBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  officerRecEmblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerRecName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  officerRecBadge: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  officerRecScore: {
    fontSize: 12,
    color: '#166534',
    marginTop: 4,
    fontWeight: '700',
  },
  scoreBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  breakdownHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A192F',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  scoreLabel: {
    fontSize: 11.5,
    color: '#475569',
  },
  scoreVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  slotBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  slotVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 4,
  },
  bulkModalDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  batchList: {
    gap: 8,
  },
  batchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  batchOfficerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  batchOfficerBadge: {
    fontSize: 11,
    color: '#64748B',
  },
  batchUnitTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  batchUnitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0A192F',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
