import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  RefreshControl,
  Linking
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { ComplianceGauge } from '../../components/ComplianceGauge';
import { StatusBadge } from '../../components/StatusBadge';
import { mockInstruments, mockOwners, Instrument } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser, UserProfile } from '../../services/authService';

export interface ApplicationItem {
  id: string;
  instrumentId: string;
  instrumentName: string;
  ownerId: string;
  category: string;
  capacity?: string;
  accuracyClass?: string;
  preferredDate: string;
  status: 'Submitted' | 'Scheduled' | 'In Review' | 'WITHDRAWN' | 'Completed' | string;
  fee: number;
  ruleReference?: string;
  remarks?: string;
  assignedOfficer?: {
    id: string;
    name: string;
    badgeNumber?: string;
    phone?: string;
    role?: string;
    designation?: string;
    district?: string;
  };
  scheduledDate?: string;
  timeSlot?: string;
}

export interface BulkBatchProgressItem {
  batchId: string;
  total: number;
  completed: number;
  pending: number;
  status: 'Completed' | 'In Progress' | 'Pending';
  officerName?: string;
}

export interface BulkRequestItem {
  id: string; // BR-2026-001
  bulkBatchNumber: string;
  ownerId: string;
  facilityName: string;
  category: string;
  instrumentCount: number;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
  progressPercent: number;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'PARTIALLY_COMPLETED' | 'COMPLETED' | 'WITHDRAWN';
  preferredDate: string;
  estimatedFee: number;
  feeRule: string;
  createdAt: string;
  remarks: string;
  batches: BulkBatchProgressItem[];
}

const INITIAL_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'APP-2026-1038',
    instrumentId: 'INST-TS-01',
    instrumentName: 'Avery Weigh-Tronix Pitless 60T',
    ownerId: 'OWN-101',
    category: 'Electronic Weighbridge',
    capacity: '60 Metric Tonnes',
    accuracyClass: 'Class IV',
    preferredDate: '2026-09-18',
    status: 'Scheduled',
    fee: 5000,
    ruleReference: 'Schedule IX, Part II - Heavy Road Weighbridges',
    remarks: 'Annual re-stamping before kharif harvesting rush'
  },
  {
    id: 'APP-2026-1040',
    instrumentId: 'INST-TS-02',
    instrumentName: 'Essae Teraoka Counter Scale',
    ownerId: 'OWN-101',
    category: 'Non-Automatic Weighing Instrument',
    capacity: '30 kg',
    accuracyClass: 'Class III',
    preferredDate: '2026-09-22',
    status: 'Submitted',
    fee: 500,
    ruleReference: 'Schedule IX, Part I - Non-Automatic Commercial Scales',
    remarks: 'Pre-emptive verification before certificate expiry'
  }
];

const INITIAL_BULK_REQUESTS: BulkRequestItem[] = [
  {
    id: 'BR-2026-001',
    bulkBatchNumber: 'BLK/TS/HYD/2026/01',
    ownerId: 'OWN-101',
    facilityName: 'Bowenpally Agricultural Wholesale Yard',
    category: 'Non-Automatic Weighing Instrument',
    instrumentCount: 5000,
    verifiedCount: 700,
    pendingCount: 4300,
    failedCount: 0,
    progressPercent: 14,
    status: 'IN_PROGRESS',
    preferredDate: '2026-09-25',
    estimatedFee: 2500000,
    feeRule: 'Schedule IX, Part I - Non-Automatic Commercial Scales',
    createdAt: '2026-09-01T10:00:00Z',
    remarks: 'Annual wholesale Mandi market platform scale calibration',
    batches: [
      {
        batchId: 'Batch 1',
        total: 700,
        completed: 700,
        pending: 0,
        status: 'Completed',
        officerName: 'V. Ramanathan (LMO, Hyderabad North)'
      },
      {
        batchId: 'Batch 2',
        total: 700,
        completed: 500,
        pending: 200,
        status: 'In Progress',
        officerName: 'Sunita Rao (LMO, Secunderabad)'
      },
      {
        batchId: 'Batch 3',
        total: 700,
        completed: 200,
        pending: 500,
        status: 'In Progress',
        officerName: 'K. Murali (GATC Lab Manager)'
      },
      {
        batchId: 'Batch 4',
        total: 1450,
        completed: 0,
        pending: 1450,
        status: 'Pending',
        officerName: 'Awaiting Officer Allocation'
      },
      {
        batchId: 'Batch 5',
        total: 1450,
        completed: 0,
        pending: 1450,
        status: 'Pending',
        officerName: 'Awaiting Officer Allocation'
      }
    ]
  },
  {
    id: 'BR-2026-002',
    bulkBatchNumber: 'BLK/TS/HYD/2026/02',
    ownerId: 'OWN-101',
    facilityName: 'Central Grain Terminal & Silos',
    category: 'Electronic Weighbridge',
    instrumentCount: 10,
    verifiedCount: 0,
    pendingCount: 10,
    failedCount: 0,
    progressPercent: 0,
    status: 'SUBMITTED',
    preferredDate: '2026-09-28',
    estimatedFee: 50000,
    feeRule: 'Schedule IX, Part II - Heavy Road Weighbridges',
    createdAt: '2026-09-04T15:30:00Z',
    remarks: 'Pre-season terminal weighbridge bulk check',
    batches: []
  }
];

interface OwnerDashboardScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const OwnerDashboardScreen: React.FC<OwnerDashboardScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const currentOwner = {
    id: activeUser?.id || 'OWN-101',
    name: activeUser?.name || 'Rajesh Kumar',
    businessName: activeUser?.businessName || (activeUser?.name ? `${activeUser.name} Enterprises` : 'Sri Balaji Mandi & Agro Traders'),
    district: activeUser?.district || 'Hyderabad',
    state: activeUser?.state || 'Telangana',
    address: (activeUser as any)?.address || `${activeUser?.district || 'Hyderabad'}, ${activeUser?.state || 'Telangana'}`,
    complianceScore: activeUser?.complianceScore ?? 100,
    complianceDeductions: (activeUser as any)?.complianceDeductions || [],
  };

  const [liveCompliance, setLiveCompliance] = useState<{
    score: number;
    grade: string;
    deductions: any[];
    explanation?: string;
  } | null>(null);

  const [instruments, setInstruments] = useState<Instrument[]>(() =>
    currentOwner.id === 'OWN-101'
      ? mockInstruments.filter(i => i.ownerId === currentOwner.id)
      : []
  );
  const myInstruments = instruments;

  const [applications, setApplications] = useState<ApplicationItem[]>(() =>
    currentOwner.id === 'OWN-101' ? INITIAL_APPLICATIONS : []
  );
  const [bulkRequests, setBulkRequests] = useState<BulkRequestItem[]>(() =>
    currentOwner.id === 'OWN-101' ? INITIAL_BULK_REQUESTS : []
  );
  const [withdrawingApp, setWithdrawingApp] = useState<ApplicationItem | null>(null);
  const [selectedBulkDetail, setSelectedBulkDetail] = useState<BulkRequestItem | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [officerNoticeModalVisible, setOfficerNoticeModalVisible] = useState(false);
  const [assignedNoticeItem, setAssignedNoticeItem] = useState<ApplicationItem | null>(null);
  const [acknowledgedNoticeIds, setAcknowledgedNoticeIds] = useState<Record<string, boolean>>({});

  // Fetch live applications & bulk requests from API
  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Single Applications
      const appRes = await fetch(`${API_ENDPOINTS.applications}?ownerId=${currentOwner.id}`);
      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.applications && Array.isArray(appData.applications)) {
          const mapped: ApplicationItem[] = appData.applications
            .filter((a: any) => a.status !== 'WITHDRAWN')
            .map((a: any) => {
              const asg = a.assignments?.[0];
              const off = asg?.assignedOfficer;
              return {
                id: a.id,
                instrumentId: a.instrumentId,
                instrumentName: a.instrument?.model || a.instrumentName || a.instrumentId,
                ownerId: a.ownerId,
                category: a.category || a.instrument?.category || 'Commercial Measuring Instrument',
                capacity: a.instrument?.capacity,
                accuracyClass: a.instrument?.accuracyClass,
                preferredDate: a.preferredDate || new Date().toISOString().split('T')[0],
                status: a.status,
                fee: a.fee || 500,
                ruleReference: a.ruleReference,
                remarks: a.remarks,
                assignedOfficer: off ? {
                  id: off.id,
                  name: off.name,
                  badgeNumber: off.badgeNumber,
                  phone: off.phone,
                  role: off.role,
                  designation: off.designation,
                  district: off.district,
                } : undefined,
                scheduledDate: asg?.scheduledDate || a.preferredDate,
                timeSlot: asg?.timeSlot || '10:00 AM - 01:00 PM',
              };
            });
          setApplications(mapped);

          // Find newly assigned application to alert the owner
          const newlyAssigned = mapped.find((item: ApplicationItem) =>
            item.assignedOfficer &&
            (item.status === 'SCHEDULED' || item.status === 'Scheduled' || item.status === 'IN_PROGRESS') &&
            !acknowledgedNoticeIds[item.id]
          );

          if (newlyAssigned) {
            setAssignedNoticeItem(newlyAssigned);
            setOfficerNoticeModalVisible(true);
          }
        }
      }

      // 2. Bulk Requests
      const bulkRes = await fetch(`${API_ENDPOINTS.bulkRequests}?ownerId=${currentOwner.id}`);
      if (bulkRes.ok) {
        const bulkData = await bulkRes.json();
        if (bulkData.bulkRequests && Array.isArray(bulkData.bulkRequests)) {
          setBulkRequests(bulkData.bulkRequests);
        }
      }

      // 3. Registered Equipment Registry
      const instRes = await fetch(`${API_ENDPOINTS.instruments}?ownerId=${currentOwner.id}`);
      if (instRes.ok) {
        const instData = await instRes.json();
        if (instData.instruments && Array.isArray(instData.instruments)) {
          setInstruments(instData.instruments);
        }
      }

      // 4. Live Compliance Score
      try {
        const compRes = await fetch(API_ENDPOINTS.complianceScore(currentOwner.id));
        if (compRes.ok) {
          const compData = await compRes.json();
          if (compData.success) {
            setLiveCompliance({
              score: compData.complianceScore,
              grade: compData.grade,
              deductions: compData.deductions || [],
              explanation: compData.explanation,
            });
          }
        }
      } catch {
        // keep fallback
      }
    } catch {
      // Keep state if offline
    }
  }, [currentOwner.id]);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh when tab is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [navigation, fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const totalInstruments = myInstruments.length;
  const activeApplications = applications.filter(a => a.status !== 'WITHDRAWN');
  const assignedApplications = activeApplications.filter(
    a => Boolean(a.assignedOfficer) && (a.status === 'SCHEDULED' || a.status === 'Scheduled' || a.status === 'IN_PROGRESS')
  );
  const activeApplicationsCount = activeApplications.filter(
    a => a.status === 'Submitted' || a.status === 'SUBMITTED' || a.status === 'Scheduled' || a.status === 'SCHEDULED' || a.status === 'In Review'
  ).length;
  const activeBulkCount = bulkRequests.filter(
    b => b.status === 'SUBMITTED' || b.status === 'IN_PROGRESS' || b.status === 'PARTIALLY_COMPLETED'
  ).length;
  const expiringSoon = myInstruments.filter(i => i.status === 'Expiring Soon').length;
  const verifiedActive = myInstruments.filter(i => i.status === 'Verified').length;

  // Withdrawal Handler: immediately remove from dashboard so it disappears
  const handleConfirmWithdraw = async () => {
    if (!withdrawingApp) return;
    const targetId = withdrawingApp.id;

    try {
      await fetch(API_ENDPOINTS.applicationWithdraw(targetId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Withdrawn by owner via Dashboard' })
      });
    } catch {
      // Offline fallback handling
    }

    // Immediately remove withdrawn application from state so it disappears
    setApplications(prev => prev.filter(app => app.id !== targetId));

    const message = `Application ${targetId} has been withdrawn and removed from active requests.`;
    setSuccessBanner(message);
    setWithdrawingApp(null);

    if (Platform.OS !== 'web') {
      Alert.alert('Application Withdrawn', message);
    }
  };

  const promptWithdraw = (app: ApplicationItem) => {
    if (Platform.OS === 'web') {
      setWithdrawingApp(app);
    } else {
      Alert.alert(
        'Confirm Withdrawal',
        `Are you sure you want to withdraw application ${app.id}? This will cancel the pending inspection visit.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw Request',
            style: 'destructive',
            onPress: () => {
              setWithdrawingApp(app);
              setTimeout(() => handleConfirmWithdraw(), 50);
            }
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Owner Dashboard"
        roleLabel="Instrument Owner"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Success Toast / Notification Banner */}
        {successBanner && (
          <View style={styles.alertSuccessBanner}>
            <Text style={styles.alertSuccessIcon}>✓</Text>
            <Text style={styles.alertSuccessText}>{successBanner}</Text>
            <TouchableOpacity onPress={() => setSuccessBanner(null)}>
              <Text style={styles.alertDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>🏪</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.businessName}>{currentOwner.businessName}</Text>
              <Text style={styles.ownerSub}>
                Owner: {currentOwner.name} • ID: {currentOwner.id} • {currentOwner.district}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                📍 {currentOwner.address}
              </Text>
            </View>
          </View>
        </View>

        {/* High-Priority Alert Banner if instruments are expiring */}
        {expiringSoon > 0 && (
          <View style={styles.priorityWarningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextCol}>
              <Text style={styles.warningTitle}>
                {expiringSoon} Instrument{expiringSoon > 1 ? 's' : ''} Expiring Within 30 Days
              </Text>
              <Text style={styles.warningDesc}>
                Statutory re-verification is required under Rule 14. Avoid penalty by submitting a request early.
              </Text>
            </View>
          </View>
        )}

        {/* Officer Assigned Immediate Alert Banner */}
        {assignedApplications.length > 0 && (
          <View style={styles.assignedAlertBanner}>
            <View style={styles.assignedAlertLeft}>
              <View style={styles.assignedAlertIconBox}>
                <Text style={styles.assignedAlertIcon}>👮</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.assignedAlertTitle}>
                    Verifying Officer Assigned: {assignedApplications[0].assignedOfficer?.name}
                  </Text>
                  <View style={styles.officerPillBadge}>
                    <Text style={styles.officerPillBadgeText}>✓ ALLOCATED</Text>
                  </View>
                </View>
                <Text style={styles.assignedAlertDesc}>
                  Application {assignedApplications[0].id} ({assignedApplications[0].instrumentName}) scheduled on {assignedApplications[0].scheduledDate || assignedApplications[0].preferredDate} ({assignedApplications[0].timeSlot || '10:00 AM - 01:00 PM'}).
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.assignedAlertCallBtn}
              onPress={() => Linking.openURL(`tel:${assignedApplications[0].assignedOfficer?.phone || '9848012345'}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.assignedAlertCallText}>📞 Call Officer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top Metrics Row */}
        <View style={styles.statsGrid}>
          {/* Compliance Gauge Card */}
          <View style={styles.gaugeCard}>
            <Text style={styles.cardHeaderTitle}>Compliance Health Score</Text>
            <ComplianceGauge score={liveCompliance?.score ?? currentOwner.complianceScore} size={92} showGrade={true} />
            <Text style={styles.gaugeNote}>
              {(liveCompliance?.deductions ?? currentOwner.complianceDeductions).length === 0
                ? (liveCompliance?.grade ? `${liveCompliance.grade} • Statutory Compliant` : 'Fully compliant with standard rules')
                : `${(liveCompliance?.deductions ?? currentOwner.complianceDeductions)[0]?.reason}`}
            </Text>
          </View>

          {/* Metric Counter Cards */}
          <View style={styles.countersColumn}>
            <View style={[styles.counterCard, { borderLeftColor: Colors.primaryNavy }]}>
              <Text style={styles.counterValue}>{totalInstruments}</Text>
              <Text style={styles.counterLabel}>Total Registered</Text>
            </View>
            <View style={[styles.counterCard, { borderLeftColor: '#10B981' }]}>
              <Text style={[styles.counterValue, { color: '#047857' }]}>{verifiedActive}</Text>
              <Text style={styles.counterLabel}>Verified & Active</Text>
            </View>
            <View style={[styles.counterCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={[styles.counterValue, { color: '#B45309' }]}>
                {activeApplicationsCount + activeBulkCount}
              </Text>
              <Text style={styles.counterLabel}>Active Requests</Text>
            </View>
            <View style={[styles.counterCard, { borderLeftColor: '#EA580C' }]}>
              <Text style={[styles.counterValue, { color: '#C2410C' }]}>{expiringSoon}</Text>
              <Text style={styles.counterLabel}>Expiring Soon</Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* BULK VERIFICATION REQUESTS SECTION (Requirement 2, 6, 7) */}
        {/* ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Bulk Verification Requests</Text>
          <Text style={styles.sectionCountBadge}>{bulkRequests.length} Batches</Text>
        </View>

        <View style={styles.bulkRequestsList}>
          {bulkRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No bulk verification requests submitted yet.</Text>
            </View>
          ) : (
            bulkRequests.map(bulk => {
              return (
                <TouchableOpacity
                  key={bulk.id}
                  style={styles.bulkCard}
                  onPress={() => setSelectedBulkDetail(bulk)}
                  activeOpacity={0.8}
                >
                  <View style={styles.bulkCardHeader}>
                    <View style={styles.bulkIdCol}>
                      <Text style={styles.bulkIdText}>{bulk.id}</Text>
                      <Text style={styles.bulkFacilityText} numberOfLines={1}>
                        {bulk.facilityName}
                      </Text>
                      <Text style={styles.bulkCategoryText}>{bulk.category}</Text>
                    </View>
                    <StatusBadge status={bulk.status} size="sm" />
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Real Counts Grid: Total, Verified, Pending, Failed */}
                  <View style={styles.bulkCountsRow}>
                    <View style={styles.bulkCountItem}>
                      <Text style={styles.bulkCountVal}>{bulk.instrumentCount.toLocaleString('en-IN')}</Text>
                      <Text style={styles.bulkCountLbl}>Total Instruments</Text>
                    </View>
                    <View style={styles.bulkCountItem}>
                      <Text style={[styles.bulkCountVal, { color: '#047857' }]}>
                        {bulk.verifiedCount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.bulkCountLbl}>Verified</Text>
                    </View>
                    <View style={styles.bulkCountItem}>
                      <Text style={[styles.bulkCountVal, { color: '#B45309' }]}>
                        {bulk.pendingCount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.bulkCountLbl}>Pending</Text>
                    </View>
                    <View style={styles.bulkCountItem}>
                      <Text style={[styles.bulkCountVal, { color: bulk.failedCount > 0 ? '#DC2626' : '#64748B' }]}>
                        {bulk.failedCount}
                      </Text>
                      <Text style={styles.bulkCountLbl}>Reinspection</Text>
                    </View>
                  </View>

                  {/* Progress Bar with % */}
                  <View style={styles.bulkProgressContainer}>
                    <View style={styles.bulkProgressHeader}>
                      <Text style={styles.bulkProgressTitle}>Overall Batch Completion</Text>
                      <Text style={styles.bulkProgressPercent}>{bulk.progressPercent}% Complete</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${bulk.progressPercent}%`,
                            backgroundColor: bulk.status === 'COMPLETED' ? '#10B981' : Colors.accentAmber
                          }
                        ]}
                      />
                    </View>
                  </View>

                  {/* Card Footer: Detail Link */}
                  <View style={styles.bulkCardFooter}>
                    <Text style={styles.bulkBatchInfo}>
                      {bulk.batches && bulk.batches.length > 0
                        ? `${bulk.batches.length} Assigned Sub-Batches`
                        : 'Awaiting Department Batch Split'}
                    </Text>
                    <Text style={styles.bulkDetailLink}>View Batch Breakdown ›</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ======================================================== */}
        {/* SINGLE ACTIVE APPLICATIONS & WITHDRAWAL SECTION          */}
        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* SINGLE ACTIVE APPLICATIONS & WITHDRAWAL SECTION          */}
        {/* ======================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Individual Verification Requests</Text>
          <Text style={styles.sectionCountBadge}>{activeApplications.length} Requests</Text>
        </View>

        <View style={styles.applicationsList}>
          {activeApplications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active individual verification requests pending.</Text>
            </View>
          ) : (
            activeApplications.map(app => {
              const isAssigned = Boolean(app.assignedOfficer);
              const canWithdraw = (app.status === 'Submitted' || app.status === 'SUBMITTED') && !isAssigned;

              return (
                <View
                  key={app.id}
                  style={styles.applicationCard}
                >
                  <View style={styles.appTopRow}>
                    <View style={styles.appIdCol}>
                      <Text style={styles.appIdText}>{app.id}</Text>
                      <Text style={styles.appInstrumentName}>{app.instrumentName}</Text>
                      <Text style={styles.appCategoryText}>{app.category}</Text>
                    </View>
                    <StatusBadge status={app.status} size="sm" />
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.appDetailsRow}>
                    <View style={styles.detailCol}>
                      <Text style={styles.appMetaLabel}>Inspection Date</Text>
                      <Text style={styles.appMetaVal}>📅 {app.preferredDate}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.appMetaLabel}>Statutory Fee</Text>
                      <Text style={styles.appMetaFee}>₹ {app.fee.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  {app.ruleReference && (
                    <Text style={styles.appRuleText}>⚖️ {app.ruleReference}</Text>
                  )}

                  {/* Assigned Officer Details Box if allocated */}
                  {app.assignedOfficer && (
                    <View style={styles.appOfficerCard}>
                      <View style={styles.appOfficerHeader}>
                        <View style={styles.appOfficerIconBox}>
                          <Text style={styles.appOfficerIcon}>👮</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.appOfficerTitle}>VERIFYING OFFICER ASSIGNED</Text>
                            <View style={styles.badgeAssignedPill}>
                              <Text style={styles.badgeAssignedPillText}>✓ ASSIGNED</Text>
                            </View>
                          </View>
                          <Text style={styles.appOfficerName}>
                            {app.assignedOfficer.name} ({app.assignedOfficer.badgeNumber || app.assignedOfficer.id})
                          </Text>
                          <Text style={styles.appOfficerSub}>
                            {app.assignedOfficer.designation || 'Legal Metrology Officer'} • {app.assignedOfficer.district || 'Telangana'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.appOfficerCallBtn}
                          onPress={() => Linking.openURL(`tel:${app.assignedOfficer?.phone || '9848012345'}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.appOfficerCallText}>📞 Call</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.appOfficerFooter}>
                        <Text style={styles.appOfficerScheduleText}>
                          📅 Scheduled Inspection: <Text style={{ fontWeight: '800', color: Colors.primaryNavy }}>{app.scheduledDate || app.preferredDate}</Text>
                          {app.timeSlot ? ` • ${app.timeSlot}` : ' • 10:00 AM - 01:00 PM'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Bottom Row with Withdraw action or Officer Contact */}
                  <View style={styles.appActionRow}>
                    {canWithdraw ? (
                      <TouchableOpacity
                        style={styles.withdrawBtn}
                        onPress={() => promptWithdraw(app)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.withdrawBtnText}>✕ Withdraw Request</Text>
                      </TouchableOpacity>
                    ) : app.assignedOfficer ? (
                      <View style={styles.assignedStatusRow}>
                        <Text style={styles.assignedStatusBadgeText}>
                          ✓ Officer Allocated • In Progress
                        </Text>
                        <TouchableOpacity
                          style={styles.actionCallBtn}
                          onPress={() => Linking.openURL(`tel:${app.assignedOfficer?.phone || '9848012345'}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionCallBtnText}>📞 Contact Officer</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.statusNoteText}>
                        • Verification in progress
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Registered Equipment Quick Preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Registered Equipment Registry</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Instruments')}>
            <Text style={styles.viewAllText}>View All ({totalInstruments}) ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instrumentsList}>
          {myInstruments.slice(0, 3).map(item => (
            <View
              key={item.id}
              style={styles.instrumentCard}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.modelCol}>
                  <Text style={styles.modelName}>{item.model}</Text>
                  <Text style={styles.categoryText}>
                    {item.category} • {item.capacity}
                  </Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBottomRow}>
                <View style={styles.idBadgeHighlight}>
                  <Text style={styles.idBadgeIcon}>🏷️</Text>
                  <Text style={styles.idBadgeLabel}>UID:</Text>
                  <Text style={styles.idBadgeValue}>{item.id}</Text>
                </View>
                <Text style={styles.metaLabel}>
                  Due:{' '}
                  <Text
                    style={[
                      styles.metaValue,
                      item.status === 'Expiring Soon' && {
                        color: '#C2410C',
                        fontWeight: 'bold'
                      }
                    ]}
                  >
                    {item.expiryDate}
                  </Text>
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* BULK REQUEST DETAIL MODAL (Requirement 7)                */}
      {/* ======================================================== */}
      <Modal
        visible={Boolean(selectedBulkDetail)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedBulkDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModalBox}>
            <View style={styles.bulkModalHeader}>
              <View>
                <Text style={styles.bulkModalTitle}>Bulk Verification Detail</Text>
                <Text style={styles.bulkModalId}>{selectedBulkDetail?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedBulkDetail(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bulkModalScroll}>
              {selectedBulkDetail && (
                <>
                  {/* Status & Facility */}
                  <View style={styles.modalStatusRow}>
                    <StatusBadge status={selectedBulkDetail.status} size="md" />
                    <Text style={styles.modalDateText}>
                      Submitted: {selectedBulkDetail.createdAt ? selectedBulkDetail.createdAt.split('T')[0] : '2026-09-01'}
                    </Text>
                  </View>

                  <View style={styles.modalInfoCard}>
                    <Text style={styles.modalFacilityTitle}>{selectedBulkDetail.facilityName}</Text>
                    <Text style={styles.modalCategorySub}>{selectedBulkDetail.category}</Text>
                    <Text style={styles.modalFeeText}>
                      Estimated Challan: ₹ {selectedBulkDetail.estimatedFee?.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {/* Summary Metric Counters */}
                  <View style={styles.modalMetricsGrid}>
                    <View style={styles.modalMetricBox}>
                      <Text style={styles.modalMetricVal}>
                        {selectedBulkDetail.instrumentCount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.modalMetricLbl}>Total Units</Text>
                    </View>
                    <View style={styles.modalMetricBox}>
                      <Text style={[styles.modalMetricVal, { color: '#047857' }]}>
                        {selectedBulkDetail.verifiedCount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.modalMetricLbl}>Verified</Text>
                    </View>
                    <View style={styles.modalMetricBox}>
                      <Text style={[styles.modalMetricVal, { color: '#B45309' }]}>
                        {selectedBulkDetail.pendingCount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.modalMetricLbl}>Pending</Text>
                    </View>
                    <View style={styles.modalMetricBox}>
                      <Text style={[styles.modalMetricVal, { color: '#DC2626' }]}>
                        {selectedBulkDetail.failedCount}
                      </Text>
                      <Text style={styles.modalMetricLbl}>Reinspection</Text>
                    </View>
                  </View>

                  {/* Overall Equation & Progress */}
                  <View style={styles.modalEquationBox}>
                    <Text style={styles.modalEquationTitle}>Overall Verification Equation</Text>
                    <Text style={styles.modalEquationFormula}>
                      {selectedBulkDetail.verifiedCount.toLocaleString('en-IN')} / {selectedBulkDetail.instrumentCount.toLocaleString('en-IN')} = {selectedBulkDetail.progressPercent}% Completed
                    </Text>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${selectedBulkDetail.progressPercent}%`,
                            backgroundColor: selectedBulkDetail.status === 'COMPLETED' ? '#10B981' : Colors.accentAmber
                          }
                        ]}
                      />
                    </View>
                  </View>

                  {/* Sub-Batches Progress Breakdown */}
                  <Text style={styles.modalBatchesTitle}>
                    Department Batch Breakdown ({selectedBulkDetail.batches?.length || 0})
                  </Text>

                  {(!selectedBulkDetail.batches || selectedBulkDetail.batches.length === 0) ? (
                    <View style={styles.modalNoBatchesBox}>
                      <Text style={styles.modalNoBatchesText}>
                        • Pending officer scheduling. The department will split this request into operational batches.
                      </Text>
                    </View>
                  ) : (
                    selectedBulkDetail.batches.map(batch => (
                      <View key={batch.batchId} style={styles.batchItemCard}>
                        <View style={styles.batchItemHeader}>
                          <Text style={styles.batchItemName}>{batch.batchId}</Text>
                          <Text
                            style={[
                              styles.batchItemStatus,
                              batch.status === 'Completed' && { color: '#047857', backgroundColor: '#ECFDF5' },
                              batch.status === 'In Progress' && { color: '#B45309', backgroundColor: '#FEF3C7' },
                              batch.status === 'Pending' && { color: '#64748B', backgroundColor: '#F1F5F9' }
                            ]}
                          >
                            {batch.status}
                          </Text>
                        </View>
                        <Text style={styles.batchOfficerSub}>
                          Assigned: {batch.officerName || 'Department Officer Team'}
                        </Text>
                        <View style={styles.batchProgRow}>
                          <Text style={styles.batchProgEquation}>
                            {batch.completed} of {batch.total} completed ({Math.round((batch.completed / batch.total) * 100)}%)
                          </Text>
                        </View>
                        <View style={styles.batchTrack}>
                          <View
                            style={[
                              styles.batchFill,
                              {
                                width: `${Math.round((batch.completed / batch.total) * 100)}%`,
                                backgroundColor: batch.status === 'Completed' ? '#10B981' : Colors.primaryNavy
                              }
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  )}

                  <View style={styles.modalAdvisoryBox}>
                    <Text style={styles.modalAdvisoryText}>
                      ℹ️ Batch allocation and field testing are scheduled by State Legal Metrology Officers and GATCs. Owners can monitor progress in real-time.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedBulkDetail(null)}
              >
                <Text style={styles.modalCloseBtnText}>Close Detail View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal for Single Withdrawal */}
      <Modal
        visible={Boolean(withdrawingApp)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWithdrawingApp(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmHeader}>Withdraw Verification Request</Text>
            <Text style={styles.confirmBody}>
              Are you sure you want to withdraw application{' '}
              <Text style={{ fontWeight: 'bold' }}>{withdrawingApp?.id}</Text>? This will cancel
              the scheduled verification slot.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setWithdrawingApp(null)}
              >
                <Text style={styles.cancelBtnText}>Keep Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDestructiveBtn}
                onPress={handleConfirmWithdraw}
              >
                <Text style={styles.confirmDestructiveText}>Yes, Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Officer Assignment Notice Modal for Owner */}
      <Modal
        visible={officerNoticeModalVisible && Boolean(assignedNoticeItem)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (assignedNoticeItem) {
            setAcknowledgedNoticeIds(prev => ({ ...prev, [assignedNoticeItem.id]: true }));
          }
          setOfficerNoticeModalVisible(false);
        }}
      >
        <View style={styles.noticeModalOverlay}>
          <View style={styles.noticeModalCard}>
            {/* National Tricolor Bar */}
            <View style={styles.noticeRibbon}>
              <View style={[styles.ribbonBand, { backgroundColor: '#FF9933' }]} />
              <View style={[styles.ribbonBand, { backgroundColor: '#FFFFFF' }]} />
              <View style={[styles.ribbonBand, { backgroundColor: '#138808' }]} />
            </View>

            <View style={styles.noticeModalHeader}>
              <Text style={styles.noticeEmblemIcon}>🏛️</Text>
              <Text style={styles.noticeGovTitle}>GOVERNMENT OF INDIA</Text>
              <Text style={styles.noticeDeptTitle}>DIRECTORATE OF LEGAL METROLOGY</Text>
              <Text style={styles.noticeMainHeading}>OFFICIAL VERIFICATION NOTICE</Text>
              <View style={styles.noticeBadgePill}>
                <Text style={styles.noticeBadgePillText}>✓ VERIFYING OFFICER ALLOCATED</Text>
              </View>
            </View>

            <ScrollView style={styles.noticeModalBodyScroll} contentContainerStyle={styles.noticeModalBody}>
              <Text style={styles.noticeGreeting}>
                Dear {currentOwner.name} ({currentOwner.businessName}),
              </Text>
              <Text style={styles.noticeMessageText}>
                An official Legal Metrology Officer has been allocated by the Department to conduct the physical inspection, standard testing, and statutory stamping of your equipment.
              </Text>

              <View style={styles.noticeDetailsBox}>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Application ID</Text>
                  <Text style={styles.noticeDetailValue}>{assignedNoticeItem?.id}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Instrument Model</Text>
                  <Text style={styles.noticeDetailValue}>{assignedNoticeItem?.instrumentName}</Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Assigned Officer</Text>
                  <Text style={styles.noticeOfficerHighlight}>
                    👮 {assignedNoticeItem?.assignedOfficer?.name} ({assignedNoticeItem?.assignedOfficer?.badgeNumber || assignedNoticeItem?.assignedOfficer?.id})
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Designation</Text>
                  <Text style={styles.noticeDetailValue}>
                    {assignedNoticeItem?.assignedOfficer?.designation || 'Legal Metrology Officer'}
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Scheduled Date</Text>
                  <Text style={styles.noticeDetailValue}>
                    📅 {assignedNoticeItem?.scheduledDate || assignedNoticeItem?.preferredDate}
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Inspection Slot</Text>
                  <Text style={styles.noticeDetailValue}>
                    ⏰ {assignedNoticeItem?.timeSlot || '10:00 AM - 01:00 PM'}
                  </Text>
                </View>
                <View style={styles.noticeDetailRow}>
                  <Text style={styles.noticeDetailLabel}>Officer Contact</Text>
                  <Text style={styles.noticePhoneHighlight}>
                    📞 {assignedNoticeItem?.assignedOfficer?.phone || '+91 98480 12345'}
                  </Text>
                </View>
              </View>

              <View style={styles.noticeAdvisoryBox}>
                <Text style={styles.noticeAdvisoryText}>
                  ℹ️ Please ensure the instrument is cleaned, accessible, and past verification records are ready for the officer's inspection.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.noticeModalActions}>
              <TouchableOpacity
                style={styles.noticeCallBtn}
                onPress={() => {
                  const phone = assignedNoticeItem?.assignedOfficer?.phone || '9848012345';
                  Linking.openURL(`tel:${phone}`);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.noticeCallBtnText}>📞 Call Officer Directly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.noticeDismissBtn}
                onPress={() => {
                  if (assignedNoticeItem) {
                    setAcknowledgedNoticeIds(prev => ({ ...prev, [assignedNoticeItem.id]: true }));
                  }
                  setOfficerNoticeModalVisible(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.noticeDismissBtnText}>✓ Understood & Acknowledged</Text>
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
  alertSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  alertSuccessIcon: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 16,
    marginRight: 8
  },
  alertSuccessText: {
    flex: 1,
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600'
  },
  alertDismiss: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 22
  },
  profileInfo: {
    flex: 1
  },
  businessName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  ownerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2
  },
  addressText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2
  },
  priorityWarningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start'
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2
  },
  warningTextCol: {
    flex: 1
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E'
  },
  warningDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  gaugeCard: {
    flex: 1.1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center'
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4
  },
  gaugeNote: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12
  },
  countersColumn: {
    flex: 1,
    gap: 6
  },
  counterCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    justifyContent: 'center'
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  counterLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10
  },
  sectionCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accentAmber
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted
  },
  bulkRequestsList: {
    gap: 12,
    marginBottom: 16
  },
  bulkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  bulkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bulkIdCol: {
    flex: 1,
    marginRight: 8
  },
  bulkIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  bulkFacilityText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2
  },
  bulkCategoryText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10
  },
  bulkCountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bulkCountItem: {
    alignItems: 'center'
  },
  bulkCountVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  bulkCountLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2
  },
  bulkProgressContainer: {
    marginTop: 10
  },
  bulkProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  bulkProgressTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  bulkProgressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  bulkCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  bulkBatchInfo: {
    fontSize: 10,
    color: '#64748B'
  },
  bulkDetailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy
  },
  applicationsList: {
    gap: 10,
    marginBottom: 16
  },
  applicationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  applicationCardWithdrawn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85
  },
  appTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  appIdCol: {
    flex: 1,
    marginRight: 8
  },
  appIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  appInstrumentName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2
  },
  appCategoryText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1
  },
  appDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailCol: {
    flex: 1
  },
  appMetaLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  appMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2
  },
  appMetaFee: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
    marginTop: 2
  },
  appRuleText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4
  },
  appActionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FEF2F2'
  },
  withdrawBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700'
  },
  statusNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  instrumentsList: {
    gap: 10
  },
  instrumentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  modelCol: {
    flex: 1,
    marginRight: 8
  },
  modelName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  categoryText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  metaValue: {
    fontWeight: '600',
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
    paddingVertical: 2.5,
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
  passportLink: {
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
  bulkModalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  bulkModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryNavy,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  bulkModalTitle: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '700'
  },
  bulkModalId: {
    color: Colors.accentAmber,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  closeBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: 'bold',
    width: 14,
    textAlign: 'center'
  },
  bulkModalScroll: {
    padding: 16
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalDateText: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  modalInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12
  },
  modalFacilityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  modalCategorySub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2
  },
  modalFeeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4
  },
  modalMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    justifyContent: 'space-around'
  },
  modalMetricBox: {
    alignItems: 'center'
  },
  modalMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  modalMetricLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2
  },
  modalEquationBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 14
  },
  modalEquationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4
  },
  modalEquationFormula: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 8
  },
  modalBatchesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8
  },
  modalNoBatchesBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12
  },
  modalNoBatchesText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic'
  },
  batchItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8
  },
  batchItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  batchItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryNavy
  },
  batchItemStatus: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  batchOfficerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2
  },
  batchProgRow: {
    marginTop: 6
  },
  batchProgEquation: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  batchTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4
  },
  batchFill: {
    height: '100%',
    borderRadius: 3
  },
  modalAdvisoryBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    marginVertical: 10
  },
  modalAdvisoryText: {
    fontSize: 10,
    color: '#1E40AF',
    lineHeight: 14
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  modalCloseBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCloseBtnText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700'
  },
  confirmBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  confirmHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8
  },
  confirmBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  confirmDestructiveBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6
  },
  confirmDestructiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite
  },
  // Officer Assigned Immediate Alert Banner
  assignedAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  assignedAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  assignedAlertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  assignedAlertIcon: {
    fontSize: 20,
  },
  assignedAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  officerPillBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  officerPillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  assignedAlertDesc: {
    fontSize: 11,
    color: '#1E40AF',
    marginTop: 2,
    lineHeight: 15,
  },
  assignedAlertCallBtn: {
    backgroundColor: '#1E40AF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  assignedAlertCallText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  // In-Card Assigned Officer Box
  appOfficerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  appOfficerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appOfficerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appOfficerIcon: {
    fontSize: 16,
  },
  appOfficerTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  badgeAssignedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeAssignedPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803D',
  },
  appOfficerName: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryNavy,
    marginTop: 1,
  },
  appOfficerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  appOfficerCallBtn: {
    backgroundColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  appOfficerCallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  appOfficerFooter: {
    borderTopWidth: 1,
    borderColor: '#DCFCE7',
    paddingTop: 6,
    marginTop: 6,
  },
  appOfficerScheduleText: {
    fontSize: 10.5,
    color: '#14532D',
  },
  // Card Actions for Assigned
  assignedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  assignedStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  actionCallBtn: {
    backgroundColor: '#0B2545',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  actionCallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Notice Modal for Owner
  noticeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noticeModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  noticeRibbon: {
    flexDirection: 'row',
    height: 5,
    width: '100%',
  },
  ribbonBand: {
    flex: 1,
    height: '100%',
  },
  noticeModalHeader: {
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeEmblemIcon: {
    fontSize: 26,
    marginBottom: 2,
  },
  noticeGovTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B2545',
    letterSpacing: 1,
  },
  noticeDeptTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  noticeMainHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.accentAmber,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  noticeBadgePill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  noticeBadgePillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  noticeModalBodyScroll: {
    maxHeight: 340,
  },
  noticeModalBody: {
    padding: 16,
  },
  noticeGreeting: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryNavy,
    marginBottom: 4,
  },
  noticeMessageText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 12,
  },
  noticeDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  noticeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  noticeDetailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  noticeDetailValue: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  noticeOfficerHighlight: {
    fontSize: 11.5,
    color: Colors.primaryNavy,
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  noticePhoneHighlight: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '800',
  },
  noticeAdvisoryBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    padding: 10,
  },
  noticeAdvisoryText: {
    fontSize: 10.5,
    color: '#1E40AF',
    lineHeight: 15,
  },
  noticeModalActions: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  noticeCallBtn: {
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  noticeCallBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '800',
  },
  noticeDismissBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDismissBtnText: {
    color: Colors.textWhite,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
