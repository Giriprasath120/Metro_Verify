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
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
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

const OFFICER_ACCOUNTS = [
  { id: 'LMO-101', name: 'V. Ramanathan', role: 'LMO', zone: 'Hyderabad North' },
  { id: 'LMO-102', name: 'Sunita Rao', role: 'LMO', zone: 'Secunderabad' },
  { id: 'LMO-103', name: 'A. Kumar', role: 'LMO', zone: 'Charminar Zone' },
  { id: 'LMO-104', name: 'K. Priya', role: 'LMO', zone: 'Cyberabad West' },
  { id: 'GATC-01', name: 'State Central Lab', role: 'GATC', zone: 'Central Testing' },
];

export const OfficerDashboardScreen: React.FC<OfficerDashboardScreenProps> = ({
  navigation,
  onSwitchRole,
  isOfflineMode,
  setIsOfflineMode,
}) => {
  const [currentOfficer, setCurrentOfficerState] = useState<OfficerProfile>(getActiveOfficer());
  const [loading, setLoading] = useState(true);
  const [officerModalVisible, setOfficerModalVisible] = useState(false);
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

      const res = await fetch(API_ENDPOINTS.lmoDashboard, { headers });
      const data = await res.json();

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

  const handleSwitchOfficerAccount = async (officerId: string) => {
    setOfficerModalVisible(false);
    setLoading(true);
    const loginRes = await loginOfficer(officerId, 'password123');
    if (loginRes.success && loginRes.officer) {
      setCurrentOfficerState(loginRes.officer);
      fetchDashboardData(officerId);
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
                <TouchableOpacity
                  style={styles.switchOfficerBtn}
                  onPress={() => setOfficerModalVisible(true)}
                >
                  <Text style={styles.switchOfficerText}>Switch ▾</Text>
                </TouchableOpacity>
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

        {/* Assigned Inspections Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>My Assigned Inspections</Text>
            <Text style={styles.sectionSubtitle}>
              Showing only verifications assigned to {currentOfficer.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchDashboardData(currentOfficer.id)}
          >
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Real DB Assigned Inspections List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primaryNavy} />
            <Text style={styles.loadingText}>Fetching assigned work from MySQL...</Text>
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Pending Assignments</Text>
            <Text style={styles.emptySubtitle}>
              No instruments are currently assigned to {currentOfficer.name}. When the Smart Allocation
              Engine or Administrator allocates requests to this officer account, they will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.inspectionsList}>
            {assignments.map((item) => {
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
                        : 'Start Field Verification ›'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Officer Switcher Modal */}
      <Modal
        visible={officerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfficerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOfficerModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Officer Account</Text>
            <Text style={styles.modalSubtitle}>
              Switch officer to view only work assigned to that authenticated badge in MySQL:
            </Text>

            {OFFICER_ACCOUNTS.map((off) => (
              <TouchableOpacity
                key={off.id}
                style={[
                  styles.officerChoiceBtn,
                  currentOfficer.id === off.id && styles.officerChoiceSelected,
                ]}
                onPress={() => handleSwitchOfficerAccount(off.id)}
              >
                <View>
                  <Text
                    style={[
                      styles.choiceName,
                      currentOfficer.id === off.id && styles.choiceNameSelected,
                    ]}
                  >
                    {off.name} ({off.id})
                  </Text>
                  <Text style={styles.choiceZone}>
                    Role: {off.role} • Jurisdiction: {off.zone}
                  </Text>
                </View>
                {currentOfficer.id === off.id && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOfficerModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },
  officerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  officerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officerAvatarText: {
    fontSize: 22,
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
    color: Colors.textPrimary,
  },
  switchOfficerBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  switchOfficerText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy,
  },
  officerDesignation: {
    fontSize: 12,
    color: Colors.primaryNavy,
    fontWeight: '600',
    marginTop: 1,
  },
  badgeNumber: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  offlineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offlineInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  offlineSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  officerChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  officerChoiceSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primaryNavy,
  },
  choiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  choiceNameSelected: {
    color: Colors.primaryNavy,
  },
  choiceZone: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  modalCloseBtn: {
    marginTop: 8,
    alignItems: 'center',
    padding: 10,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
