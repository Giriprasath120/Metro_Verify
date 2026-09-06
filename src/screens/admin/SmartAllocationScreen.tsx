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
import { mockOfficers as initialMockOfficers, Officer } from '../../../data/mockData';
import { scoreOfficer, OfficerScoreResult } from '../../../utils/allocationEngine';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';

interface SmartAllocationScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const SmartAllocationScreen: React.FC<SmartAllocationScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [requestsList, setRequestsList] = useState<any[]>([
    {
      id: 'REQ-HYD-01',
      instrument: 'Essae SuperWeigh-80T (80 Ton Weighbridge)',
      district: 'Hyderabad North',
      state: 'Telangana',
      requestedDate: '2026-09-06',
      category: 'Electronic Weighbridge'
    },
    {
      id: 'REQ-PUN-02',
      instrument: 'Endress+Hauser Promass Coriolis Flow Meter',
      district: 'Pune Industrial',
      state: 'Maharashtra',
      requestedDate: '2026-09-07',
      category: 'Flow Meter'
    },
    {
      id: 'REQ-DEL-03',
      instrument: 'Sartorius High Precision Bullion Microbalance',
      district: 'New Delhi Central',
      state: 'Delhi',
      requestedDate: '2026-09-05',
      category: 'NAWI Class I'
    }
  ]);

  const [officersList, setOfficersList] = useState<Officer[]>(initialMockOfficers);
  const [selectedRequestIndex, setSelectedRequestIndex] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [allocatingAll, setAllocatingAll] = useState(false);
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);
  const [allocationResult, setAllocationResult] = useState<any>(null);

  // Bulk Request States
  const [activeSection, setActiveSection] = useState<'single' | 'bulk'>('single');
  const [bulkRequestsList, setBulkRequestsList] = useState<any[]>([]);
  const [selectedBulkIndex, setSelectedBulkIndex] = useState(0);
  const [splittingBulk, setSplittingBulk] = useState(false);
  const [bulkSplitModalVisible, setBulkSplitModalVisible] = useState(false);
  const [bulkSplitResult, setBulkSplitResult] = useState<any>(null);

  // Load real applications, bulk requests, and officers from backend
  const loadData = async () => {
    try {
      const [appRes, offRes, bulkRes] = await Promise.all([
        fetch(API_ENDPOINTS.applications),
        fetch(API_ENDPOINTS.officersSchedule),
        fetch(API_ENDPOINTS.bulkRequests),
      ]);
      const appData = await appRes.json();
      const offData = await offRes.json();
      const bulkData = await bulkRes.json();

      if (appData.success && appData.applications && appData.applications.length > 0) {
        // Prioritize SUBMITTED (pending allocation) applications first!
        const sorted = [...appData.applications].sort((a: any, b: any) => {
          if (a.status === 'SUBMITTED' && b.status !== 'SUBMITTED') return -1;
          if (b.status === 'SUBMITTED' && a.status !== 'SUBMITTED') return 1;
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

        const mapped = sorted.map((a: any) => ({
          id: a.id,
          instrumentId: a.instrumentId,
          instrument: a.instrument ? `${a.instrument.model} (${a.instrument.id})` : a.instrumentId,
          district: a.instrument?.district || 'Hyderabad North',
          state: a.instrument?.state || 'Telangana',
          requestedDate: a.preferredDate || '2026-09-06',
          category: a.category || 'Non-Automatic Weighing Instrument',
          status: a.status,
          assignedOfficer: a.assignments?.[0]?.assignedOfficer?.name,
          assignedOfficerBadge: a.assignments?.[0]?.assignedOfficer?.badgeNumber || a.assignments?.[0]?.assignedOfficer?.id,
          assignedOfficerPhone: a.assignments?.[0]?.assignedOfficer?.phone,
        }));
        setRequestsList(mapped);
      } else {
        setRequestsList([]);
      }

      if (bulkData.success && bulkData.bulkRequests) {
        setBulkRequestsList(bulkData.bulkRequests);
      }

      if (offData.success && offData.officers && offData.officers.length > 0) {
        setOfficersList(offData.officers);
      }
    } catch (e) {
      console.warn('Could not fetch live applications/officers/bulkRequests', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const activeRequest = requestsList[selectedRequestIndex] || requestsList[0];
  const activeBulk = bulkRequestsList[selectedBulkIndex] || bulkRequestsList[0];

  // Segregate Field LMO Officers and GATC Central Laboratory
  // Field LMOs perform Stage 1 physical verification; GATC performs Stage 2 lab endorsement
  const lmoOfficersList = officersList.filter(o => o.role === 'LMO');
  const gatcOfficersList = officersList.filter(o => o.role === 'GATC');

  // Dynamic live score evaluation for Field LMOs
  const availableLmos = lmoOfficersList.length > 0 ? lmoOfficersList : officersList;
  const scoredOfficers: OfficerScoreResult[] = availableLmos
    .map(officer =>
      scoreOfficer(
        {
          district: activeRequest?.district || 'Hyderabad North',
          state: activeRequest?.state || 'Telangana',
          requestedDate: activeRequest?.requestedDate || '2026-09-06',
          category: activeRequest?.category || 'Electronic Weighbridge'
        },
        officer
      )
    )
    .sort((a, b) => b.totalScore - a.totalScore);

  // Rotate suggestion across different officers based on request index to vary workload distribution
  const rotationIdx = availableLmos.length > 0 ? selectedRequestIndex % availableLmos.length : 0;
  const targetOfficer = availableLmos[rotationIdx];
  const matchedTarget = scoredOfficers.find(s => s.officer.id === targetOfficer?.id);

  const rankedOfficers: OfficerScoreResult[] = matchedTarget
    ? [matchedTarget, ...scoredOfficers.filter(s => s.officer.id !== matchedTarget.officer.id)]
    : scoredOfficers;

  const topSuggested = rankedOfficers[0];

  const handleApproveAssignment = async (officerId: string, officerName?: string) => {
    if (!activeRequest) return;
    setAssigning(true);

    try {
      const res = await fetch(API_ENDPOINTS.scheduleAssign, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: activeRequest.id,
          officerId,
        }),
      });
      const data = await res.json();
      setAssigning(false);

      if (data.success) {
        Alert.alert(
          'Assignment Approved & Scheduled',
          `Successfully allocated ${activeRequest.instrument || activeRequest.id} to ${officerName || topSuggested.officer.name} in MySQL via stored procedure sp_CreateAssignment. The officer's workload is updated.`,
          [{ text: 'OK', onPress: () => loadData() }]
        );
      } else {
        Alert.alert('Allocation Note', data.error || 'Assignment could not be scheduled');
      }
    } catch (err: any) {
      setAssigning(false);
      Alert.alert('Connection Error', err.message);
    }
  };

  // Smart Auto-Allocate All across 5 officers
  const handleAutoAllocateBalanced = async () => {
    setAllocatingAll(true);
    try {
      const res = await fetch(API_ENDPOINTS.scheduleAllocateBalanced, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setAllocatingAll(false);

      if (data.success) {
        setAllocationResult(data);
        setAllocationModalVisible(true);
        loadData();
      } else {
        Alert.alert('Allocation Notice', data.error || 'Could not auto-allocate requests.');
      }
    } catch (err: any) {
      setAllocatingAll(false);
      Alert.alert('Connection Error', err.message);
    }
  };

  // Bulk Auto-Split and allocate evenly across 4 LMO officers
  const handleAutoSplitBulk = async (bulkId: string) => {
    setSplittingBulk(true);
    try {
      const res = await fetch(API_ENDPOINTS.bulkAutoSplitAllocate(bulkId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSplittingBulk(false);

      if (data.success) {
        setBulkSplitResult(data);
        setBulkSplitModalVisible(true);
        loadData();
      } else {
        Alert.alert('Bulk Allocation Notice', data.error || 'Could not auto-split bulk request.');
      }
    } catch (err: any) {
      setSplittingBulk(false);
      Alert.alert('Connection Error', err.message);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Smart Slot Allocation Engine"
        subtitle="Explainable Deterministic Matching Algorithm"
        roleLabel="Live Engine"
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

        {/* Top Section Segmented Tabs: Single vs Bulk */}
        <View style={styles.topSectionTabs}>
          <TouchableOpacity
            style={[styles.sectionTabBtn, activeSection === 'single' && styles.sectionTabBtnActive]}
            onPress={() => setActiveSection('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.sectionTabText, activeSection === 'single' && styles.sectionTabTextActive]}>
              🎯 Single Requests ({requestsList.filter(r => r.status === 'SUBMITTED').length} Pending)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTabBtn, activeSection === 'bulk' && styles.sectionTabBtnActive]}
            onPress={() => setActiveSection('bulk')}
            activeOpacity={0.8}
          >
            <Text style={[styles.sectionTabText, activeSection === 'bulk' && styles.sectionTabTextActive]}>
              📦 Bulk Requests ({bulkRequestsList.filter(b => b.status === 'SUBMITTED').length} Pending)
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === 'single' ? (
          <>
            {/* Algorithm Rules Box */}
            <View style={styles.algoSpecCard}>
              <Text style={styles.algoTitle}>Deterministic Scoring Formula: scoreOfficer()</Text>
              <View style={styles.weightsRow}>
                <View style={styles.weightPill}>
                  <Text style={styles.weightLabel}>Jurisdiction</Text>
                  <Text style={styles.weightVal}>+40 pts</Text>
                </View>
                <View style={styles.weightPill}>
                  <Text style={styles.weightLabel}>Proximity</Text>
                  <Text style={styles.weightVal}>+30 pts</Text>
                </View>
                <View style={styles.weightPill}>
                  <Text style={styles.weightLabel}>Workload</Text>
                  <Text style={styles.weightVal}>+20 pts</Text>
                </View>
                <View style={styles.weightPill}>
                  <Text style={styles.weightLabel}>Slot Open</Text>
                  <Text style={styles.weightVal}>+10 pts</Text>
                </View>
              </View>
              <Text style={styles.algoFootnote}>
                Total Max: 100 Points • Factor live workload and slots to prevent overburdening.
              </Text>
            </View>

            {/* Balanced Auto-Allocation Banner Card (Allocates dynamically across Field LMO Officers) */}
            <View style={styles.balancedBannerCard}>
              <View style={styles.balancedTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balancedTitle}>⚡ Automated Balanced Allocation (Field LMO Officers)</Text>
                  <Text style={styles.balancedSubtitle}>
                    Evenly distribute pending single verification requests across active Field Legal Metrology Officers
                  </Text>
                </View>
              </View>
              <View style={styles.officersBadgeRow}>
                {(lmoOfficersList.length > 0 ? lmoOfficersList : officersList).map((off) => (
                  <Text key={off.id} style={styles.officerPill}>
                    ⚖️ {off.id} ({off.name.split(' ')[0]})
                  </Text>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.autoAllocateAllBtn, allocatingAll && { opacity: 0.7 }]}
                onPress={handleAutoAllocateBalanced}
                disabled={allocatingAll}
                activeOpacity={0.85}
              >
                {allocatingAll ? (
                  <ActivityIndicator color={Colors.textWhite} size="small" />
                ) : (
                  <Text style={styles.autoAllocateAllText}>
                    ⚡ Auto Allocate ›
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Request Selector Tabs */}
            <Text style={styles.sectionTitle}>Select Verification Request to Allocate ({requestsList.length})</Text>
            {requestsList.length === 0 ? (
              <View style={styles.emptyBulkCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyBulkTitle}>No Single Verification Requests</Text>
                <Text style={styles.emptyBulkSub}>
                  When an owner registers or submits a single instrument verification request, it will appear here.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.requestTabs}>
                  {requestsList.map((req: any, idx: number) => {
                    const isSelected = idx === selectedRequestIndex;
                    const isPending = req.status === 'SUBMITTED';
                    return (
                      <TouchableOpacity
                        key={req.id}
                        style={[
                          styles.reqTab,
                          isSelected && styles.reqTabActive,
                          isPending && !isSelected && styles.reqTabPending,
                        ]}
                        onPress={() => setSelectedRequestIndex(idx)}
                      >
                        <View style={styles.reqTabHeader}>
                          <Text style={[styles.reqTabId, isSelected && styles.textWhite]}>{req.id}</Text>
                          <View style={[styles.miniStatusDot, { backgroundColor: isPending ? '#F59E0B' : '#10B981' }]} />
                        </View>
                        <Text style={[styles.reqTabDistrict, isSelected && styles.textWhite]}>
                          {req.district}
                        </Text>
                        <Text
                          style={[
                            styles.reqTabStatus,
                            isSelected && styles.textWhite,
                            !isPending && { color: isSelected ? '#FFFFFF' : '#059669', fontWeight: '800' }
                          ]}
                        >
                          {isPending ? '⏳ PENDING' : `✓ ASSIGNED (${req.assignedOfficer || req.status})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Active Request Details */}
                {activeRequest && (
                  <View style={styles.activeReqCard}>
                    <View style={styles.reqHeaderRow}>
                      <Text style={styles.reqBadge}>TARGET APPLICANT</Text>
                      <Text style={styles.reqDate}>Requested: {activeRequest.requestedDate}</Text>
                    </View>
                    <Text style={styles.activeReqInst}>{activeRequest.instrument}</Text>
                    <Text style={styles.activeReqLocation}>
                      District: {activeRequest.district}, {activeRequest.state} • {activeRequest.category}
                    </Text>
                  </View>
                )}

                {/* Top Recommended Officer Match Card */}
                {topSuggested && (
                  <View style={styles.suggestedCard}>
                    <View style={styles.suggestedHeader}>
                      <View style={styles.trophyCircle}>
                        <Text style={styles.trophyText}>{topSuggested.officer.role === 'GATC' ? '🔬' : '⚖️'}</Text>
                      </View>
                      <View style={styles.suggestedTitleCol}>
                        <Text style={styles.suggestedBadge}>★ TOP RECOMMENDED MATCH</Text>
                        <Text style={styles.suggestedName}>{topSuggested.officer.name}</Text>
                        <Text style={styles.suggestedDesignation}>
                          {topSuggested.officer.role} • {topSuggested.officer.badgeNumber} • {topSuggested.officer.designation}
                        </Text>
                      </View>
                      <View style={styles.totalScoreBox}>
                        <Text style={styles.totalScoreText}>{topSuggested.totalScore}</Text>
                        <Text style={styles.totalScoreSub}>SCORE</Text>
                      </View>
                    </View>

                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationLabel}>ALGORITHM RATIONALE</Text>
                      <Text style={styles.explanationText}>{topSuggested.explanation}</Text>
                    </View>

                    {/* Breakdown Scores */}
                    <View style={styles.breakdownGrid}>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Jurisdiction</Text>
                        <Text style={styles.bdScore}>+{topSuggested.breakdown.jurisdictionScore} / 40</Text>
                      </View>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Proximity</Text>
                        <Text style={styles.bdScore}>+{topSuggested.breakdown.distanceScore} / 30</Text>
                      </View>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Workload</Text>
                        <Text style={styles.bdScore}>+{topSuggested.breakdown.workloadScore} / 20</Text>
                      </View>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.bdLabel}>Slot Avail</Text>
                        <Text style={styles.bdScore}>+{topSuggested.breakdown.availabilityScore} / 10</Text>
                      </View>
                    </View>

                    {/* Action to approve assignment */}
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveAssignment(topSuggested.officer.id, topSuggested.officer.name)}
                      disabled={assigning}
                      activeOpacity={0.85}
                    >
                      {assigning ? (
                        <ActivityIndicator color={Colors.textWhite} />
                      ) : (
                        <Text style={styles.approveBtnText}>
                          ✓ Approve & Assign to {topSuggested.officer.name} (Stored in MySQL)
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Section 1: Field Legal Metrology Officers (LMO) */}
                <View style={styles.segregatedHeaderBox}>
                  <Text style={styles.sectionTitle}>
                    1. Field Legal Metrology Officers (LMO) - Stage 1 Verification ({rankedOfficers.length})
                  </Text>
                  <Text style={styles.segregatedSub}>
                    Active field officers assigned for on-site physical load testing, seal verification, and tolerance checking.
                  </Text>
                </View>

                <View style={styles.rankingsTable}>
                  {rankedOfficers.map((res, index) => {
                    const isTop = index === 0;

                    return (
                      <TouchableOpacity
                        key={res.officer.id}
                        style={[styles.tableRow, isTop && styles.tableRowTop]}
                        onPress={() => handleApproveAssignment(res.officer.id, res.officer.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.rankCol}>
                          <Text style={[styles.rankNum, isTop && styles.rankNumTop]}>#{index + 1}</Text>
                        </View>

                        <View style={styles.officerCol}>
                          <Text style={styles.officerRowName}>⚖️ {res.officer.name}</Text>
                          <Text style={styles.officerRowSub}>
                            {res.officer.role} • {res.officer.district} • {res.distanceKm}km away
                          </Text>
                          <Text style={styles.officerRowWorkload}>
                            Jobs: {res.officer.pendingJobs} • Slot: {res.breakdown.availabilityScore > 0 ? '✓ Open' : '✕ Busy'}
                          </Text>
                        </View>

                        <View style={styles.scoreCol}>
                          <Text style={[styles.scoreNumber, isTop && styles.scoreNumberTop]}>
                            {res.totalScore}
                          </Text>
                          <Text style={styles.scoreSub}>PTS</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section 2: Segregated State Central Testing Laboratory (GATC) Card */}
                <View style={[styles.segregatedHeaderBox, { marginTop: 24 }]}>
                  <Text style={styles.sectionTitle}>
                    2. State Central Testing Laboratory (GATC) — Stage 2 Endorsement Authority
                  </Text>
                  <Text style={styles.segregatedSub}>
                    Next step after LMO physical inspection: Secondary verification of test standards & digital Form VI certification.
                  </Text>
                </View>

                <View style={styles.gatcAuthorityCard}>
                  <View style={styles.gatcAuthorityHeader}>
                    <View style={styles.gatcEmblemCircle}>
                      <Text style={{ fontSize: 26 }}>🔬</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.gatcStageBadge}>
                        <Text style={styles.gatcStageBadgeText}>STAGE 2: LABORATORY ENDORSEMENT</Text>
                      </View>
                      <Text style={styles.gatcAuthorityName}>
                        Telangana State Legal Metrology Central Laboratory (GATC-01)
                      </Text>
                      <Text style={styles.gatcAuthoritySub}>
                        Department of Legal Metrology • State Central Calibration Directorate
                      </Text>
                    </View>
                  </View>

                  <View style={styles.gatcWorkflowExpl}>
                    <Text style={styles.gatcWorkflowTitle}>Statutory Verification Progression (Rule 14):</Text>
                    <Text style={styles.gatcWorkflowStep}>
                      • <Text style={{ fontWeight: '700' }}>Stage 1 (Field):</Text> Field LMO visits applicant premises, applies physical standard weights, tests tolerance, and stamps lead seal.
                    </Text>
                    <Text style={styles.gatcWorkflowStep}>
                      • <Text style={{ fontWeight: '700' }}>Stage 2 (Lab Endorsement):</Text> GATC Central Lab reviews calibration records, verifies primary standards traceability, and issues the official Form VI Certificate with dual digital signatures.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          /* ================== BULK REQUEST ALLOCATION VIEW ================== */
          <View style={styles.bulkAllocContainer}>
            {/* Bulk Allocation Overview Banner */}
            <View style={styles.bulkBannerCard}>
              <View style={styles.bulkBannerHeader}>
                <Text style={{ fontSize: 26, marginRight: 10 }}>📦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkBannerTitle}>Multi-Officer Bulk Batch Auto-Split</Text>
                  <Text style={styles.bulkBannerSub}>
                    Divides multi-instrument batches (e.g. 100 units) evenly across the 4 active field LMO officers (25 units each) so they can conduct physical verification in parallel. GATC Laboratory endorses Form VI certificates upon completion.
                  </Text>
                </View>
              </View>

              <View style={styles.bulkOfficersPillRow}>
                <View style={styles.bulkOffPill}>
                  <Text style={styles.bulkOffPillText}>⚖️ LMO-101 Ramanathan</Text>
                </View>
                <View style={styles.bulkOffPill}>
                  <Text style={styles.bulkOffPillText}>⚖️ LMO-102 Sunita Rao</Text>
                </View>
                <View style={styles.bulkOffPill}>
                  <Text style={styles.bulkOffPillText}>⚖️ LMO-103 A. Kumar</Text>
                </View>
                <View style={styles.bulkOffPill}>
                  <Text style={styles.bulkOffPillText}>⚖️ LMO-104 K. Priya</Text>
                </View>
              </View>
            </View>

            {/* Bulk Batch Selector */}
            <Text style={styles.sectionTitle}>
              Submitted Bulk Batches ({bulkRequestsList.length})
            </Text>

            {bulkRequestsList.length === 0 ? (
              <View style={styles.emptyBulkCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyBulkTitle}>No Bulk Requests in Database</Text>
                <Text style={styles.emptyBulkSub}>
                  When an owner submits a bulk verification batch (e.g. 100 weighing instruments for a market yard or logistics hub), it will immediately appear here for automated 4-officer division.
                </Text>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bulkTabsScroll}>
                  {bulkRequestsList.map((bulk: any, idx: number) => {
                    const isSelected = idx === selectedBulkIndex;
                    const isPending = bulk.status === 'SUBMITTED';
                    return (
                      <TouchableOpacity
                        key={bulk.id}
                        style={[
                          styles.bulkTabChip,
                          isSelected && styles.bulkTabChipActive,
                          isPending && !isSelected && styles.bulkTabChipPending,
                        ]}
                        onPress={() => setSelectedBulkIndex(idx)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.bulkTabTopRow}>
                          <Text style={[styles.bulkTabId, isSelected && styles.textWhite]}>{bulk.id}</Text>
                          <View style={[styles.miniStatusDot, { backgroundColor: isPending ? '#F59E0B' : '#10B981' }]} />
                        </View>
                        <Text style={[styles.bulkTabCount, isSelected && styles.textWhite]}>
                          {bulk.instrumentCount} Units
                        </Text>
                        <Text style={[styles.bulkTabStatus, isSelected && styles.textWhite]}>
                          {bulk.status === 'SUBMITTED' ? '⏳ PENDING' : `✓ ${bulk.status}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {activeBulk && (
                  <View style={styles.activeBulkDetailCard}>
                    <View style={styles.reqHeaderRow}>
                      <View style={styles.bulkBadgeHigh}>
                        <Text style={styles.bulkBadgeHighText}>BATCH CODE: {activeBulk.bulkBatchNumber || activeBulk.id}</Text>
                      </View>
                      <Text style={styles.reqDate}>Target: {activeBulk.preferredDate}</Text>
                    </View>

                    <Text style={styles.bulkFacilityTitle}>{activeBulk.facilityName || 'Commercial Trade Facility'}</Text>
                    <Text style={styles.bulkFacilitySub}>
                      Owner: {activeBulk.owner?.businessName || activeBulk.owner?.name || activeBulk.ownerId} • Category: {activeBulk.category}
                    </Text>

                    <View style={styles.bulkMetricsRow}>
                      <View style={styles.bulkMetricItem}>
                        <Text style={styles.bulkMetricNum}>{activeBulk.instrumentCount}</Text>
                        <Text style={styles.bulkMetricLabel}>Total Units</Text>
                      </View>
                      <View style={styles.bulkMetricItem}>
                        <Text style={styles.bulkMetricNum}>4</Text>
                        <Text style={styles.bulkMetricLabel}>LMO Officers</Text>
                      </View>
                      <View style={styles.bulkMetricItem}>
                        <Text style={[styles.bulkMetricNum, { color: '#047857' }]}>
                          {Math.ceil(activeBulk.instrumentCount / 4)}
                        </Text>
                        <Text style={styles.bulkMetricLabel}>Units / Officer</Text>
                      </View>
                      <View style={styles.bulkMetricItem}>
                        <Text style={[styles.bulkMetricNum, { color: Colors.accentAmber }]}>
                          ₹ {(activeBulk.estimatedFee || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.bulkMetricLabel}>Challan Fee</Text>
                      </View>
                    </View>

                    {/* Split Breakdown Preview */}
                    <View style={styles.splitPlanBox}>
                      <Text style={styles.splitPlanTitle}>Deterministic Sub-Batch Division (sp_SplitBulkBatch):</Text>
                      <Text style={styles.splitPlanDesc}>
                        The {activeBulk.instrumentCount} units are partitioned evenly among the 4 field enforcement officers. Each officer inspects their sub-batch simultaneously:
                      </Text>

                      <View style={styles.officerSplitGrid}>
                        {[
                          { id: 'LMO-101', name: 'V. Ramanathan', zone: 'Hyderabad North', count: Math.ceil(activeBulk.instrumentCount / 4), batch: 'Batch A' },
                          { id: 'LMO-102', name: 'Sunita Rao', zone: 'Secunderabad', count: Math.ceil(activeBulk.instrumentCount / 4), batch: 'Batch B' },
                          { id: 'LMO-103', name: 'A. Kumar', zone: 'Charminar Zone', count: Math.floor(activeBulk.instrumentCount / 4), batch: 'Batch C' },
                          { id: 'LMO-104', name: 'K. Priya', zone: 'Cyberabad West', count: Math.floor(activeBulk.instrumentCount / 4), batch: 'Batch D' },
                        ].map((item) => (
                          <View key={item.id} style={styles.officerSplitCard}>
                            <View style={styles.officerSplitHeader}>
                              <Text style={styles.officerSplitName}>⚖️ {item.name}</Text>
                              <View style={styles.splitBadge}>
                                <Text style={styles.splitBadgeText}>{item.batch}</Text>
                              </View>
                            </View>
                            <Text style={styles.officerSplitSub}>{item.id} • {item.zone}</Text>
                            <Text style={styles.officerSplitQuota}>Quota: {item.count} Units</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.gatcNoteBox}>
                        <Text style={styles.gatcNoteText}>
                          🔬 <Text style={{ fontWeight: '700' }}>GATC Central Lab Protocol:</Text> Verified units from all 4 officers will be routed directly to GATC Central Laboratory for digital calibration review and Form VI certificate generation with QR.
                        </Text>
                      </View>
                    </View>

                    {/* Action button */}
                    {activeBulk.status === 'SUBMITTED' ? (
                      <TouchableOpacity
                        style={[styles.autoSplitBtn, splittingBulk && { opacity: 0.7 }]}
                        onPress={() => handleAutoSplitBulk(activeBulk.id)}
                        disabled={splittingBulk}
                        activeOpacity={0.85}
                      >
                        {splittingBulk ? (
                          <ActivityIndicator color={Colors.textWhite} size="small" />
                        ) : (
                          <Text style={styles.autoSplitBtnText}>
                            🚀 Auto-Split {activeBulk.instrumentCount} Units Evenly Across All 4 LMO Officers ›
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.alreadySplitBanner}>
                        <Text style={styles.alreadySplitText}>
                          ✓ Batch has been split and allocated to LMO officers (Status: {activeBulk.status})
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>


      {/* Balanced Smart Auto-Allocation Result Modal */}
      <Modal
        visible={allocationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setAllocationModalVisible(false);
          loadData();
        }}
      >
        <View style={styles.allocModalOverlay}>
          <View style={styles.allocModalContent}>
            {/* Modal Header */}
            <View style={styles.allocModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.allocModalTitle}>⚖️ Smart Slot Allocation Completed</Text>
                <Text style={styles.allocModalSubtitle}>
                  Balanced Distribution across all 5 Legal Metrology Officers
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAllocationModalVisible(false);
                  loadData();
                }}
                style={styles.allocModalCloseBtn}
              >
                <Text style={styles.allocModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.allocModalScroll} contentContainerStyle={styles.allocModalScrollContent}>
              {/* Top Banner */}
              <View style={styles.allocSuccessBanner}>
                <Text style={styles.allocSuccessIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allocSuccessTitle}>Workload Balanced in MySQL</Text>
                  <Text style={styles.allocSuccessText}>
                    {allocationResult?.message ||
                      'Verification requests have been evenly allocated across all 5 active officers.'}
                  </Text>
                </View>
              </View>

              {/* Officer Distribution Cards */}
              <Text style={styles.allocSectionHeader}>Distribution Across All 5 Officers:</Text>
              <View style={styles.officerDistList}>
                {(allocationResult?.officerDistribution || [
                  { officerId: 'LMO-101', officerName: 'V. Ramanathan', role: 'LMO', assignedCount: 1, totalWorkload: 5 },
                  { officerId: 'LMO-102', officerName: 'Sunita Rao', role: 'LMO', assignedCount: 0, totalWorkload: 4 },
                  { officerId: 'LMO-103', officerName: 'A. Kumar', role: 'LMO', assignedCount: 0, totalWorkload: 3 },
                  { officerId: 'LMO-104', officerName: 'K. Priya', role: 'LMO', assignedCount: 0, totalWorkload: 3 },
                  { officerId: 'GATC-01', officerName: 'State Central Lab', role: 'GATC', assignedCount: 0, totalWorkload: 2 }
                ]).map((off: any) => {
                  const hasAssigned = off.assignedCount > 0;
                  return (
                    <View
                      key={off.officerId}
                      style={[
                        styles.officerDistCard,
                        hasAssigned && styles.officerDistCardHighlighted
                      ]}
                    >
                      <View style={styles.officerDistLeft}>
                        <View style={[styles.roleBadgePill, { backgroundColor: off.role === 'GATC' ? '#EDE9FE' : '#E0F2FE' }]}>
                          <Text style={[styles.roleBadgePillText, { color: off.role === 'GATC' ? '#6D28D9' : '#0369A1' }]}>
                            {off.officerId}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.officerDistName}>{off.officerName}</Text>
                          <Text style={styles.officerDistRole}>
                            {off.role === 'GATC' ? 'Government Approved Test Centre' : 'Legal Metrology Field Officer'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.officerDistRight}>
                        {hasAssigned ? (
                          <View style={styles.assignedPlusBadge}>
                            <Text style={styles.assignedPlusText}>+{off.assignedCount} Allocated</Text>
                          </View>
                        ) : (
                          <Text style={styles.noAllocText}>0 New</Text>
                        )}
                        <Text style={styles.totalWorkloadText}>Workload: {off.totalWorkload} jobs</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Newly Assigned Applications */}
              {allocationResult?.assignments && allocationResult.assignments.length > 0 ? (
                <View style={styles.assignedAppsSection}>
                  <Text style={styles.allocSectionHeader}>
                    Allocated Verification Requests ({allocationResult.assignments.length}):
                  </Text>
                  {allocationResult.assignments.map((asg: any, idx: number) => (
                    <View key={asg.applicationId || idx} style={styles.assignedAppItem}>
                      <View style={styles.assignedAppHeader}>
                        <Text style={styles.assignedAppId}>{asg.applicationId}</Text>
                        <View style={styles.assignedBadgeGreen}>
                          <Text style={styles.assignedBadgeGreenText}>✓ ASSIGNED</Text>
                        </View>
                      </View>
                      <Text style={styles.assignedAppInst}>{asg.instrumentModel}</Text>
                      <Text style={styles.assignedAppOwner}>Applicant: {asg.ownerName}</Text>
                      <View style={styles.assignedOfficerPillRow}>
                        <Text style={styles.assignedOfficerLabel}>Assigned Officer:</Text>
                        <Text style={styles.assignedOfficerValue}>
                          👮 {asg.officerName} ({asg.officerId})
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Done Button */}
            <View style={styles.allocModalFooter}>
              <TouchableOpacity
                style={styles.allocDoneBtn}
                onPress={() => {
                  setAllocationModalVisible(false);
                  loadData();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.allocDoneBtnText}>✓ Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Batch Auto-Split Result Modal */}
      <Modal
        visible={bulkSplitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setBulkSplitModalVisible(false);
          loadData();
        }}
      >
        <View style={styles.allocModalOverlay}>
          <View style={styles.allocModalContent}>
            {/* Modal Header */}
            <View style={[styles.allocModalHeader, { backgroundColor: '#1E293B' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.allocModalTitle}>📦 Bulk Batch Auto-Split Completed</Text>
                <Text style={styles.allocModalSubtitle}>
                  Evenly Divided Across 4 LMO Officers via sp_SplitBulkBatch
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setBulkSplitModalVisible(false);
                  loadData();
                }}
                style={styles.allocModalCloseBtn}
              >
                <Text style={styles.allocModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.allocModalScroll} contentContainerStyle={styles.allocModalScrollContent}>
              {/* Top Banner */}
              <View style={[styles.allocSuccessBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={styles.allocSuccessIcon}>🚀</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.allocSuccessTitle, { color: '#166534' }]}>
                    Batch Successfully Partitioned!
                  </Text>
                  <Text style={[styles.allocSuccessText, { color: '#15803D' }]}>
                    {bulkSplitResult?.message ||
                      'Total units have been partitioned into 4 equal sub-batches and assigned to officers.'}
                  </Text>
                </View>
              </View>

              {/* Sub-Batch Allocation Breakdown */}
              <Text style={styles.allocSectionHeader}>
                4-Officer Sub-Batch Distribution ({bulkSplitResult?.subBatches?.length || 4}):
              </Text>

              <View style={styles.officerDistList}>
                {(bulkSplitResult?.subBatches || []).map((sub: any, idx: number) => (
                  <View key={sub.batchNumber || idx} style={[styles.officerDistCard, styles.officerDistCardHighlighted]}>
                    <View style={styles.officerDistLeft}>
                      <View style={[styles.roleBadgePill, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.roleBadgePillText, { color: '#0369A1' }]}>
                          {sub.batchSuffix || `Sub-${String.fromCharCode(65 + idx)}`}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.officerDistName}>{sub.officerName || sub.officerId}</Text>
                        <Text style={styles.officerDistRole}>
                          ID: {sub.officerId} • Batch: {sub.batchNumber}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.officerDistRight}>
                      <View style={styles.assignedPlusBadge}>
                        <Text style={styles.assignedPlusText}>{sub.allocatedUnits} Units</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* GATC Laboratory Endorsement Next Step */}
              <View style={styles.modalGatcStepBox}>
                <Text style={styles.modalGatcStepTitle}>🔬 Next Step: GATC Laboratory Endorsement</Text>
                <Text style={styles.modalGatcStepDesc}>
                  As each LMO officer completes physical field verification for their 25 units, the verified data passes directly to GATC Central Laboratory (GATC-01) for certificate endorsement with digital QR codes.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Done Button */}
            <View style={styles.allocModalFooter}>
              <TouchableOpacity
                style={[styles.allocDoneBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => {
                  setBulkSplitModalVisible(false);
                  loadData();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.allocDoneBtnText}>✓ Done & Return to Allocation Screen</Text>
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
  algoSpecCard: {
    backgroundColor: '#07162C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14
  },
  algoTitle: {
    color: '#FDBA74',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  weightsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8
  },
  weightPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center'
  },
  weightLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '600'
  },
  weightVal: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2
  },
  algoFootnote: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    marginTop: 8,
    fontStyle: 'italic'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8
  },
  requestTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  reqTab: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  reqTabActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  reqTabId: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy
  },
  reqTabDistrict: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1
  },
  textWhite: {
    color: Colors.textWhite
  },
  activeReqCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 14
  },
  reqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  reqBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.accentAmber
  },
  reqDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  activeReqInst: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  activeReqLocation: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary
  },
  suggestedCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    padding: 14,
    marginBottom: 16
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trophyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  trophyText: {
    fontSize: 20
  },
  suggestedTitleCol: {
    flex: 1
  },
  suggestedBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C'
  },
  suggestedName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  suggestedDesignation: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1
  },
  totalScoreBox: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDBA74'
  },
  totalScoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.accentAmber
  },
  totalScoreSub: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textMuted
  },
  explanationBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  explanationLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.3
  },
  explanationText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
    fontStyle: 'italic'
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10
  },
  breakdownItem: {
    width: '48%',
    backgroundColor: Colors.surface,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  bdLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600'
  },
  bdScore: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryNavy,
    marginTop: 1
  },
  rankingsTable: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  tableRowTop: {
    backgroundColor: '#FFFBEB'
  },
  rankCol: {
    width: 32
  },
  rankNum: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted
  },
  rankNumTop: {
    color: Colors.accentAmber,
    fontWeight: '800'
  },
  officerCol: {
    flex: 1
  },
  officerRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  officerRowSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1
  },
  officerRowWorkload: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1
  },
  scoreCol: {
    alignItems: 'center',
    width: 44
  },
  scoreNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  scoreNumberTop: {
    color: Colors.accentAmber
  },
  scoreSub: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textMuted
  },
  approveBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  approveBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '800',
  },
  balancedBannerCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balancedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balancedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  balancedSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  officersBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  officerPill: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryNavy,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  autoAllocateAllBtn: {
    backgroundColor: Colors.primaryNavy,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  autoAllocateAllText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reqTabPending: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  reqTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  miniStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 4,
  },
  reqTabStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  allocModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  allocModalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  allocModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryNavy,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  allocModalTitle: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '800',
  },
  allocModalSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 2,
  },
  allocModalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 8,
  },
  allocModalCloseText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
    width: 16,
    textAlign: 'center',
  },
  allocModalScroll: {
    flexGrow: 1,
  },
  allocModalScrollContent: {
    padding: 16,
  },
  allocSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  allocSuccessIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  allocSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  allocSuccessText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  allocSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  officerDistList: {
    gap: 8,
    marginBottom: 16,
  },
  officerDistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  officerDistCardHighlighted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  officerDistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  officerDistName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  officerDistRole: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  officerDistRight: {
    alignItems: 'flex-end',
  },
  assignedPlusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  assignedPlusText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
  },
  noAllocText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  totalWorkloadText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  assignedAppsSection: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 14,
    marginTop: 6,
  },
  assignedAppItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  assignedAppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignedAppId: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  assignedBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assignedBadgeGreenText: {
    color: '#166534',
    fontSize: 9.5,
    fontWeight: '800',
  },
  assignedAppInst: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  assignedAppOwner: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  assignedOfficerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  assignedOfficerLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 4,
  },
  assignedOfficerValue: {
    fontSize: 11,
    color: Colors.primaryNavy,
    fontWeight: '700',
  },
  allocModalFooter: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  allocDoneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  allocDoneBtnText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topSectionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sectionTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabBtnActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sectionTabTextActive: {
    color: Colors.textWhite,
    fontWeight: '800',
  },
  bulkAllocContainer: {
    marginTop: 4,
  },
  bulkBannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bulkBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulkBannerTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  bulkBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  bulkOfficersPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  bulkOffPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  bulkOffPillText: {
    color: '#F8FAFC',
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyBulkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyBulkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyBulkSub: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  bulkTabsScroll: {
    marginBottom: 14,
  },
  bulkTabChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    width: 130,
  },
  bulkTabChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy,
  },
  bulkTabChipPending: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  bulkTabTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bulkTabId: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  bulkTabCount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  bulkTabStatus: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  activeBulkDetailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16,
  },
  bulkBadgeHigh: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  bulkBadgeHighText: {
    color: '#4338CA',
    fontSize: 10,
    fontWeight: '800',
  },
  bulkFacilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  bulkFacilitySub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  bulkMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  bulkMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  bulkMetricNum: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  bulkMetricLabel: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  splitPlanBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  splitPlanTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  splitPlanDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  officerSplitGrid: {
    gap: 6,
  },
  officerSplitCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 8,
  },
  officerSplitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  officerSplitName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryNavy,
  },
  splitBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  splitBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  officerSplitSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  officerSplitQuota: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 3,
  },
  gatcNoteBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  gatcNoteText: {
    fontSize: 10.5,
    color: '#6B21A8',
    lineHeight: 15,
  },
  autoSplitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoSplitBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '800',
  },
  alreadySplitBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  alreadySplitText: {
    color: '#047857',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalGatcStepBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  modalGatcStepTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 4,
  },
  modalGatcStepDesc: {
    fontSize: 10.5,
    color: '#6B21A8',
    lineHeight: 15,
  },
  segregatedHeaderBox: {
    marginTop: 16,
    marginBottom: 8,
  },
  segregatedSub: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  gatcAuthorityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gatcAuthorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  gatcEmblemCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#C084FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatcStageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  gatcStageBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  gatcAuthorityName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0B2545',
  },
  gatcAuthoritySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  gatcWorkflowExpl: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gatcWorkflowTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  gatcWorkflowStep: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 4,
  },
});
