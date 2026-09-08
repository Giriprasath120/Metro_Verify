import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { CertificateModal } from '../../components/CertificateModal';
import { LmoCertificateModal, LmoCertificateData } from '../../components/LmoCertificateModal';
import { OfficerMapView } from '../../components/OfficerMapView';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import {
  loginOfficer,
  getActiveOfficer,
  setActiveOfficer,
  getOfficerToken,
  OfficerProfile,
} from '../../services/authService';
import { getOfflineQueue } from '../../services/offlineStorage';

interface OfficerDashboardScreenProps {
  navigation: any;
  onSwitchRole: () => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
}

export const OfficerDashboardScreen: React.FC<OfficerDashboardScreenProps> = ({
  navigation,
  onSwitchRole,
  isOfflineMode,
  setIsOfflineMode,
}) => {
  const [currentOfficer, setCurrentOfficerState] = useState<OfficerProfile>(getActiveOfficer());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'map'>('single');
  const [pendingGatcList, setPendingGatcList] = useState<any[]>([]);
  const [endorsingId, setEndorsingId] = useState<string | null>(null);
  const [endorsedCert, setEndorsedCert] = useState<any>(null);
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [selectedLmoCert, setSelectedLmoCert] = useState<LmoCertificateData | null>(null);
  const [lmoCertModalVisible, setLmoCertModalVisible] = useState(false);
  const [inspectingInspId, setInspectingInspId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    assignedToday: 0,
    completed: 0,
    remaining: 0,
    offlinePendingSync: 0,
    reinspectionRequired: 0,
    overdue: 0,
    currentWorkload: 0,
    maxCapacity: 20,
  });
  const [assignments, setAssignments] = useState<any[]>([]);

  const handleMakeCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Missing', 'No contact phone number is registered for this instrument owner.');
      return;
    }
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported || typeof window !== 'undefined') {
          Linking.openURL(url);
        } else {
          Alert.alert('Cannot Open Dialer', `Dialing is not supported on this device. Owner contact: ${phoneNumber}`);
        }
      })
      .catch(() => {
        Linking.openURL(url).catch(() => {
          Alert.alert('Call Failed', `Could not launch dialer for ${phoneNumber}`);
        });
      });
  };

  const fetchDashboardData = useCallback(async (officerId: string) => {
    try {
      setLoading(true);
      // Ensure authenticated JWT token
      let token = getOfficerToken();
      if (!token) {
        const loginRes = await loginOfficer(officerId, 'password123');
        token = loginRes.token || null;
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const [dashRes, gatcRes] = await Promise.all([
        fetch(API_ENDPOINTS.lmoDashboard, { headers }),
        fetch(API_ENDPOINTS.pendingGatc, { headers }).catch(() => null),
      ]);

      const data = await dashRes.json();

      if (data.success) {
        const localQueue = getOfflineQueue();
        const localPendingCount = localQueue.length;

        setMetrics({
          ...data.metrics,
          offlinePendingSync: Math.max(data.metrics.offlinePendingSync, localPendingCount),
        });
        setAssignments(data.assignments || []);
        if (data.officer) {
          setCurrentOfficerState(data.officer);
          setActiveOfficer(data.officer);
        }
      }

      if (gatcRes) {
        const gatcData = await gatcRes.json();
        if (gatcData.success) {
          setPendingGatcList(gatcData.inspections || []);
        }
      }
    } catch (err) {
      console.error('Failed to load LMO dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(currentOfficer.id);
  }, [currentOfficer.id, fetchDashboardData]);

  // Focus listener to refresh data whenever screen is navigated to
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData(currentOfficer.id);
    });
    return unsubscribe;
  }, [navigation, currentOfficer.id, fetchDashboardData]);

  const handleGatcEndorse = async (inspectionId: string) => {
    setEndorsingId(inspectionId);
    try {
      const token = getOfficerToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(API_ENDPOINTS.gatcEndorse(inspectionId), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          labRemarks: 'Form VI calibration reviewed and endorsed under official State Central Testing Laboratory seal.',
        }),
      });
      const data = await res.json();
      setEndorsingId(null);

      if (data.success && data.certificate) {
        setEndorsedCert(data.certificate);
        setCertModalVisible(true);
        fetchDashboardData(currentOfficer.id);
      } else {
        Alert.alert('GATC Notice', data.error || 'Failed to endorse inspection.');
      }
    } catch (err: any) {
      setEndorsingId(null);
      Alert.alert('Connection Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Officer Dashboard"
        subtitle="Field Enforcement & Verification Portal"
        roleLabel="LMO Field View"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Officer Profile Card & Switcher */}
        <View style={styles.officerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.officerAvatar}>
              <Text style={styles.officerAvatarText}>⚖️</Text>
            </View>
            <View style={styles.officerInfo}>
              <View style={styles.officerTitleRow}>
                <Text style={styles.officerName}>{currentOfficer.name}</Text>
                <View style={styles.officerBadgePill}>
                  <Text style={styles.officerBadgePillText}>
                    {currentOfficer.badgeNumber || currentOfficer.id}
                  </Text>
                </View>
              </View>
              <Text style={styles.officerDesignation}>
                {currentOfficer.designation || 'Legal Metrology Officer'}
              </Text>
              <Text style={styles.badgeNumber}>
                Badge: {currentOfficer.badgeNumber} • {currentOfficer.jurisdiction || currentOfficer.district}
              </Text>
            </View>
          </View>

          {/* Offline Mode Switch */}
          <View style={styles.offlineToggleRow}>
            <View style={styles.offlineInfoCol}>
              <Text style={styles.offlineTitle}>
                {isOfflineMode ? '📡 Offline Verification Mode' : '🌐 Online Connected Mode'}
              </Text>
              <Text style={styles.offlineSubtitle}>
                {isOfflineMode
                  ? 'Verifications saved to local queue for later field sync.'
                  : 'Direct real-time MySQL transaction with state registry.'}
              </Text>
            </View>
            <Switch
              value={isOfflineMode}
              onValueChange={setIsOfflineMode}
              trackColor={{ false: '#CBD5E1', true: Colors.accentAmber }}
              thumbColor={Colors.textWhite}
            />
          </View>
        </View>

        {/* Live Workload Metric Counters */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: Colors.primaryNavy }]}>
            <Text style={styles.metricVal}>{metrics.assignedToday}</Text>
            <Text style={styles.metricLabel}>Assigned Today</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.metricVal, { color: '#047857' }]}>{metrics.completed}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Colors.accentAmber }]}>
            <Text style={[styles.metricVal, { color: '#D97706' }]}>{metrics.remaining}</Text>
            <Text style={styles.metricLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}
            onPress={() => navigation.navigate('OfflineQueue')}
            activeOpacity={0.8}
          >
            <Text style={[styles.metricVal, { color: '#B45309' }]}>
              {metrics.offlinePendingSync}
            </Text>
            <Text style={styles.metricLabel}>Offline Pending Sync ›</Text>
          </TouchableOpacity>
          <View style={[styles.metricCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={[styles.metricVal, { color: '#DC2626' }]}>
              {metrics.reinspectionRequired}
            </Text>
            <Text style={styles.metricLabel}>Reinspection Req</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#6B7280' }]}>
            <Text style={[styles.metricVal, { color: '#4B5563' }]}>{metrics.overdue}</Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
        </View>

        {/* GATC Laboratory Endorsement Queue (When active officer is GATC) */}
        {(currentOfficer.role === 'GATC' || currentOfficer.id === 'GATC-01') && (
          <View style={styles.gatcSectionCard}>
            <View style={styles.gatcSectionHeader}>
              <Text style={{ fontSize: 24, marginRight: 10 }}>🔬</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gatcSectionTitle}>
                  GATC Laboratory Endorsement Queue ({pendingGatcList.length})
                </Text>
                <Text style={styles.gatcSectionSub}>
                  Physical field verification passed by Legal Metrology Officers. Review calibration test records and issue Form VI Certificate with live QR code.
                </Text>
              </View>
            </View>

            {pendingGatcList.length === 0 ? (
              <View style={styles.emptyGatcBox}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>🔬</Text>
                <Text style={styles.emptyGatcTitle}>No Instruments Awaiting GATC Endorsement</Text>
                <Text style={styles.emptyGatcSub}>
                  When an LMO field officer completes physical testing and clicks "Pass to GATC Centre", verified instruments appear here immediately for certificate issuance.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {pendingGatcList.map((insp) => (
                  <View key={insp.id} style={styles.gatcItemCard}>
                    <View style={styles.gatcItemTop}>
                      <View style={styles.gatcItemPill}>
                        <Text style={styles.gatcItemPillText}>INSP: {insp.id}</Text>
                      </View>
                      <View style={styles.gatcPassedBadge}>
                        <Text style={styles.gatcPassedBadgeText}>✓ LMO VERIFIED</Text>
                      </View>
                    </View>

                    <Text style={styles.gatcItemModel}>{insp.instrument?.model || 'Measuring Instrument'}</Text>
                    <Text style={styles.gatcItemSub}>
                      ID: {insp.instrumentId} • Serial: {insp.instrument?.serialNumber || 'SN-REG'} • {insp.instrument?.category || 'Weighing Scale'}
                    </Text>

                    {/* Official LMO Field Certificate Banner & Details for GATC */}
                    <View style={styles.gatcLmoCertBox}>
                      <View style={styles.gatcLmoCertTopRow}>
                        <Text style={styles.gatcLmoCertBadge}>📜 LMO FIELD CERTIFICATE</Text>
                        <Text style={styles.gatcLmoSealBadge}>🔒 {insp.lmoCertificate?.sealNumber || 'TS-SEAL-VERIFIED'}</Text>
                      </View>
                      <Text style={styles.gatcLmoCertNumberText}>
                        Cert No: <Text style={{ fontWeight: '800', color: Colors.primaryNavy }}>{insp.lmoCertificate?.certificateNumber || `LMO-CERT-TS-2026-${insp.id}`}</Text>
                      </Text>
                      <Text style={styles.gatcLmoOfficerText}>
                        Certified & Stamped by: ⚖️ {insp.officer?.name} ({insp.officer?.badgeNumber || insp.officerId})
                      </Text>
                      <View style={styles.gatcTestStatsRow}>
                        <Text style={styles.gatcTestStat}>Std: {insp.standardWeight || insp.lmoCertificate?.standardWeight || '50.0 kg'}</Text>
                        <Text style={styles.gatcTestStat}>Ind: {insp.indicatedValue || insp.lmoCertificate?.indicatedValue || '50.005 kg'}</Text>
                        <Text style={[styles.gatcTestStat, { color: '#059669', fontWeight: '700' }]}>Err: {insp.errorMargin || insp.lmoCertificate?.errorMargin || '0.00%'} (PASS)</Text>
                      </View>
                    </View>

                    <View style={styles.gatcButtonsRow}>
                      <TouchableOpacity
                        style={styles.inspectLmoBtn}
                        onPress={() => {
                          setSelectedLmoCert(insp.lmoCertificate || {
                            certificateNumber: `LMO-CERT-TS-2026-${insp.id}`,
                            sealNumber: 'TS-SEAL-VERIFIED',
                            instrumentId: insp.instrumentId,
                            instrumentModel: insp.instrument?.model,
                            category: insp.instrument?.category,
                            ownerName: insp.assignment?.owner?.businessName || insp.assignment?.owner?.name || 'Registered Trader',
                            issueDate: insp.startedAt ? String(insp.startedAt).split('T')[0] : '2026-09-06',
                            officerName: insp.officer?.name || 'V. Ramanathan',
                            officerBadge: insp.officer?.badgeNumber || 'LMO-TS-HYD-041',
                            officerDesignation: insp.officer?.designation || 'Legal Metrology Officer',
                            standardWeight: insp.standardWeight || '50 kg',
                            indicatedValue: insp.indicatedValue || '50.005 kg',
                            errorMargin: insp.errorMargin || '+5 g',
                            toleranceLimit: insp.toleranceLimit || '±10 g',
                            status: 'CERTIFIED_BY_LMO_PASSED_TO_GATC',
                            gatcTargetLab: 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
                            remarks: insp.remarks,
                          });
                          setInspectingInspId(insp.id);
                          setLmoCertModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.inspectLmoBtnText}>🔍 Inspect LMO Certificate</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.endorseBtn, endorsingId === insp.id && { opacity: 0.7 }]}
                        onPress={() => handleGatcEndorse(insp.id)}
                        disabled={endorsingId === insp.id}
                        activeOpacity={0.85}
                      >
                        {endorsingId === insp.id ? (
                          <ActivityIndicator color={Colors.textWhite} size="small" />
                        ) : (
                          <Text style={styles.endorseBtnText}>
                            🔬 Laboratory Endorse & Issue Form VI ›
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Assigned Workload Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>My Assigned Verifications</Text>
            <Text style={styles.sectionSubtitle}>
              Assignments registered strictly for {currentOfficer.name} ({currentOfficer.id})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchDashboardData(currentOfficer.id)}
          >
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Workload Segmented Tabs: Single vs Bulk vs Map */}
        <View style={styles.workloadTabsRow}>
          <TouchableOpacity
            style={[styles.workloadTab, activeTab === 'single' && styles.workloadTabActive]}
            onPress={() => setActiveTab('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.workloadTabText, activeTab === 'single' && styles.workloadTabTextActive]}>
              🎯 Single ({assignments.filter((a) => !a.batchId && !a.bulkRequestId).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.workloadTab, activeTab === 'bulk' && styles.workloadTabActive]}
            onPress={() => setActiveTab('bulk')}
            activeOpacity={0.8}
          >
            <Text style={[styles.workloadTabText, activeTab === 'bulk' && styles.workloadTabTextActive]}>
              📦 Bulk ({assignments.filter((a) => a.batchId || a.bulkRequestId).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.workloadTab, activeTab === 'map' && styles.workloadTabActive]}
            onPress={() => setActiveTab('map')}
            activeOpacity={0.8}
          >
            <Text style={[styles.workloadTabText, activeTab === 'map' && styles.workloadTabTextActive]}>
              🗺️ Territory Map
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area for Selected Tab */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primaryNavy} />
            <Text style={styles.loadingText}>Fetching assigned work from MySQL...</Text>
          </View>
        ) : activeTab === 'single' ? (
          /* ================= SINGLE VERIFICATIONS TAB ================= */
          assignments.filter((a) => !a.batchId && !a.bulkRequestId).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Single Assignments</Text>
              <Text style={styles.emptySubtitle}>
                No single-instrument verification requests are currently assigned to {currentOfficer.name}. When the Smart Allocation Engine allocates requests to this account, they will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.inspectionsList}>
              {assignments
                .filter((a) => !a.batchId && !a.bulkRequestId)
                .map((item) => {
                  const inst = item.instrument;
                  const owner = item.owner;
                  const app = item.application;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.inspectionCard}
                      onPress={() =>
                        navigation.navigate('FieldVerification', {
                          assignmentId: item.id,
                          instrumentId: item.instrumentId,
                          assignment: item,
                          isOfflineMode,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.inspectionTopRow}>
                        <View style={styles.slotPill}>
                          <Text style={styles.slotText}>📅 Scheduled: {item.scheduledDate}</Text>
                        </View>
                        <StatusBadge status={item.status} size="sm" />
                      </View>

                      <View style={styles.idRow}>
                        <Text style={styles.idBadge}>ID: {item.instrumentId}</Text>
                        {app?.id && <Text style={styles.appBadge}>App: {app.id}</Text>}
                      </View>

                      <Text style={styles.instrumentName}>{inst ? inst.model : 'Measuring Instrument'}</Text>
                      <Text style={styles.instrumentSpec}>
                        {inst?.category || 'Weighing Scale'} • Serial: {inst?.serialNumber || 'N/A'} • Capacity: {inst?.capacity || 'Standard'}
                      </Text>

                      <View style={styles.cardDivider} />

                      <View style={styles.locationRow}>
                        <Text style={styles.ownerText}>🏢 {owner?.businessName || owner?.name || 'Owner'}</Text>
                        {owner?.phone ? (
                          <TouchableOpacity
                            style={styles.callButton}
                            onPress={(e: any) => {
                              e?.stopPropagation?.();
                              handleMakeCall(owner.phone);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.callButtonText}>📞 Call {owner.phone}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.phoneText}>📞 No phone</Text>
                        )}
                      </View>
                      <Text style={styles.addressLine} numberOfLines={2}>
                        📍 {inst?.location || owner?.address || 'Trading premises'}
                      </Text>

                      <View style={styles.verifyActionRow}>
                        <Text style={styles.verifyActionText}>
                          {item.status === 'IN_PROGRESS'
                            ? 'Continue Physical Inspection ›'
                            : item.status === 'COMPLETED'
                            ? 'View Completed Record ›'
                            : item.status === 'PASSED_TO_GATC'
                            ? '✓ Passed to GATC Central Lab ›'
                            : 'Start Field Verification ›'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )
        ) : activeTab === 'bulk' ? (
          /* ================= BULK DEPLOYMENTS TAB ================= */
          <View style={styles.bulkOfficerContainer}>
            {/* Bulk Team Mission Banner */}
            <View style={styles.bulkOfficerBanner}>
              <Text style={styles.bulkOfficerBannerTitle}>📦 Multi-Officer Bulk Batch Deployment</Text>
              <Text style={styles.bulkOfficerBannerSub}>
                You are deployed as part of an enforcement fleet. Multi-instrument orders are divided evenly across officers for parallel physical inspection.
              </Text>

              <View style={styles.collaboratorsBox}>
                <Text style={styles.collaboratorsTitle}>👥 Active Authenticated Officer:</Text>
                <Text style={styles.collaboratorsList}>
                  ★ {currentOfficer.name} ({currentOfficer.badgeNumber || currentOfficer.id}) • {currentOfficer.jurisdiction || currentOfficer.district || 'Chennai Zone'}
                </Text>
                <Text style={styles.gatcCollabNote}>
                  🔬 Next Stage: Verification passes directly to GATC Central Lab for Certificate Issuance
                </Text>
              </View>
            </View>

            {assignments.filter((a) => a.batchId || a.bulkRequestId).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No Bulk Batches Assigned</Text>
                <Text style={styles.emptySubtitle}>
                  When an administrator auto-splits a multi-instrument bulk order across the officer fleet, your sub-batch allocation will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.inspectionsList}>
                {assignments
                  .filter((a) => a.batchId || a.bulkRequestId)
                  .map((item) => {
                    const inst = item.instrument;
                    const owner = item.owner;
                    const batch = item.batch;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.inspectionCard, { borderColor: '#93C5FD' }]}
                        onPress={() =>
                          navigation.navigate('FieldVerification', {
                            assignmentId: item.id,
                            instrumentId: item.instrumentId,
                            assignment: item,
                            isOfflineMode,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <View style={styles.inspectionTopRow}>
                          <View style={[styles.slotPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                            <Text style={[styles.slotText, { color: '#1D4ED8' }]}>
                              📦 {batch?.batchName || 'Sub-Batch Assignment'}
                            </Text>
                          </View>
                          <StatusBadge status={item.status} size="sm" />
                        </View>

                        <View style={styles.idRow}>
                          <Text style={styles.idBadge}>ID: {item.instrumentId}</Text>
                          {item.batchId && (
                            <Text style={[styles.appBadge, { backgroundColor: '#EDE9FE', color: '#6D28D9' }]}>
                              Batch: {item.batchId}
                            </Text>
                          )}
                        </View>

                        <Text style={styles.instrumentName}>{inst ? inst.model : 'Measuring Instrument'}</Text>
                        <Text style={styles.instrumentSpec}>
                          {inst?.category || 'Weighing Scale'} • Serial: {inst?.serialNumber || 'N/A'} • Capacity: {inst?.capacity || 'Standard'}
                        </Text>

                        <View style={styles.quotaPillRow}>
                          <Text style={styles.quotaPillText}>
                            🎯 Sub-Batch Quota: Unit from {batch?.totalCount || 25}-unit partition
                          </Text>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.locationRow}>
                          <Text style={styles.ownerText}>🏢 {owner?.businessName || owner?.name || 'Bulk Applicant'}</Text>
                          {owner?.phone ? (
                            <TouchableOpacity
                              style={styles.callButton}
                              onPress={(e: any) => {
                                e?.stopPropagation?.();
                                handleMakeCall(owner.phone);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.callButtonText}>📞 Call {owner.phone}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.phoneText}>📞 No phone</Text>
                          )}
                        </View>
                        <Text style={styles.addressLine} numberOfLines={2}>
                          📍 {inst?.location || owner?.address || 'Trading premises'}
                        </Text>

                        <View style={styles.verifyActionRow}>
                          <Text style={styles.verifyActionText}>
                            {item.status === 'IN_PROGRESS'
                              ? 'Continue Physical Inspection ›'
                              : item.status === 'COMPLETED'
                              ? 'View Completed Record ›'
                              : item.status === 'PASSED_TO_GATC'
                              ? '✓ Passed to GATC Central Lab ›'
                              : 'Start Field Verification ›'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        ) : (
          /* ================= TERRITORY MAP VIEW ================= */
          <OfficerMapView
            assignments={assignments}
            officerDistrict={currentOfficer.district}
            onSelectInspection={(item) => {}}
            onStartVerification={(item) =>
              navigation.navigate('FieldVerification', {
                assignmentId: item.id,
                instrumentId: item.instrumentId,
                assignment: item,
                isOfflineMode,
              })
            }
          />
        )}
      </ScrollView>

      {/* LMO Field Certificate Inspection Modal for GATC */}
      <LmoCertificateModal
        visible={lmoCertModalVisible}
        certificate={selectedLmoCert}
        isGatcView={true}
        onClose={() => {
          setLmoCertModalVisible(false);
          setSelectedLmoCert(null);
          setInspectingInspId(null);
        }}
        onEndorseByGatc={() => {
          const id = inspectingInspId;
          setLmoCertModalVisible(false);
          setSelectedLmoCert(null);
          setInspectingInspId(null);
          if (id) {
            handleGatcEndorse(id);
          }
        }}
      />

      {/* Form VI Certificate Modal on GATC Endorsement */}
      {endorsedCert && (
        <CertificateModal
          visible={certModalVisible}
          onClose={() => setCertModalVisible(false)}
          certificate={endorsedCert}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  officerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    marginBottom: 14,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  officerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DFE5FE',
  },
  officerAvatarText: {
    fontSize: 24,
  },
  officerInfo: {
    flex: 1,
  },
  officerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  officerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540',
  },
  officerBadgePill: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DFE5FE',
  },
  officerBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#635BFF',
  },
  officerDesignation: {
    fontSize: 12,
    color: '#425466',
    fontWeight: '600',
    marginTop: 1,
  },
  badgeNumber: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 2,
  },
  offlineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3E8EE',
  },
  offlineInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A2540',
  },
  offlineSubtitle: {
    fontSize: 10,
    color: '#8898AA',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderLeftWidth: 4,
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2540',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8898AA',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  refreshBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryNavy,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textMuted,
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
  inspectionsList: {
    marginTop: 4,
  },
  inspectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  inspectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  slotText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  idRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  idBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryNavy,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  appBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  instrumentName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  instrumentSpec: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  phoneText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  addressLine: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  verifyActionRow: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    alignItems: 'flex-end',
  },
  verifyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentAmber,
  },
  gatcSectionCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#D8B4FE',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  gatcSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gatcSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 4,
  },
  gatcSectionSub: {
    fontSize: 11,
    color: '#7E22CE',
    lineHeight: 16,
  },
  emptyGatcBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyGatcTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 2,
  },
  emptyGatcSub: {
    fontSize: 11,
    color: '#9333EA',
    textAlign: 'center',
    lineHeight: 16,
  },
  gatcItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    padding: 12,
  },
  gatcItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gatcItemPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gatcItemPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E22CE',
  },
  gatcPassedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gatcPassedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  gatcItemModel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gatcItemSub: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  gatcLmoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  gatcLmoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 4,
  },
  gatcLmoValue: {
    fontSize: 11,
    color: Colors.primaryNavy,
    fontWeight: '700',
  },
  gatcTestStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  gatcTestStat: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  gatcLmoCertBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  gatcLmoCertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gatcLmoCertBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  gatcLmoSealBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
  },
  gatcLmoCertNumberText: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 2,
  },
  gatcLmoOfficerText: {
    fontSize: 10.5,
    color: '#475569',
    marginBottom: 4,
  },
  gatcButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  inspectLmoBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectLmoBtnText: {
    color: '#1D4ED8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  endorseBtn: {
    flex: 1.3,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endorseBtnText: {
    color: Colors.textWhite,
    fontSize: 11.5,
    fontWeight: '800',
  },
  workloadTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  workloadTab: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  workloadTabActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy,
  },
  workloadTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  workloadTabTextActive: {
    color: Colors.textWhite,
    fontWeight: '800',
  },
  bulkOfficerContainer: {
    marginTop: 2,
  },
  bulkOfficerBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bulkOfficerBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 4,
  },
  bulkOfficerBannerSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 15,
  },
  collaboratorsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  collaboratorsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  collaboratorsList: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 14,
  },
  gatcCollabNote: {
    fontSize: 10,
    color: '#C084FC',
    marginTop: 4,
    fontWeight: '600',
  },
  quotaPillRow: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  quotaPillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
});
