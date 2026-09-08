import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { GovHeader } from '../../components/GovHeader';
import { mockAdminStats, mockBulkBatches, mockOfficers } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';

interface AdminDashboardScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInstrumentsStatewide: 0,
    verificationsThisMonth: 0,
    averageComplianceScore: 100,
    overdueAlertsCount: 0,
    pendingSingleApplications: 0,
    pendingBulkRequests: 0,
    totalPendingVerificationInbox: 0,
    activeBulkBatches: 0,
    officersOnDuty: 5,
    monthlyVerificationTrend: [
      { month: 'Apr', count: 0 },
      { month: 'May', count: 0 },
      { month: 'Jun', count: 0 },
      { month: 'Jul', count: 0 },
      { month: 'Aug', count: 0 },
      { month: 'Sep', count: 0 },
    ],
  });
  const [officers, setOfficers] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [recentBulkRequests, setRecentBulkRequests] = useState<any[]>([]);

  const loadLiveAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.adminDashboard);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          if (data.officers) setOfficers(data.officers);
          if (data.recentApplications) setRecentApplications(data.recentApplications);
          if (data.recentBulkRequests) setRecentBulkRequests(data.recentBulkRequests);
        }
      }
    } catch (e) {
      console.warn('Could not load live admin dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveAdminData();
    const unsub = navigation.addListener('focus', loadLiveAdminData);
    return unsub;
  }, [navigation]);

  const trendData = stats.monthlyVerificationTrend || [];
  const maxCount = Math.max(1, ...trendData.map(d => d.count));
  const chartHeight = 120;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="State Metrology Directorate"
        subtitle="National Legal Metrology Verification Command Centre"
        roleLabel="State Admin"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Control Bar: Live Indicator */}
        <View style={styles.topControlBar}>
          <View style={styles.liveIndicatorPill}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.liveIndicatorText}>LIVE METRICS • MYSQL CONNECTED</Text>
          </View>
        </View>

        {/* Top Statewide Metrics 2x2 Grid with Live Data */}
        <View style={styles.metricsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Colors.primaryNavy }]}>
            <Text style={styles.statNumber}>
              {stats.totalInstrumentsStatewide.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Total Registered Statewide</Text>
            <Text style={styles.statSub}>Real Registry Instruments</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.statNumber, { color: '#047857' }]}>
              {stats.verificationsThisMonth.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Verifications This Month</Text>
            <Text style={styles.statSub}>Active Form VI Stamped</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: Colors.accentAmber }]}>
            <Text style={[styles.statNumber, { color: Colors.accentAmber }]}>
              {stats.averageComplianceScore}%
            </Text>
            <Text style={styles.statLabel}>Statewide Compliance Index</Text>
            <Text style={styles.statSub}>Tier A Baseline (Target ≥ 85%)</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={[styles.statNumber, { color: '#B91C1C' }]}>
              {stats.overdueAlertsCount}
            </Text>
            <Text style={styles.statLabel}>Critical Overdue Alerts</Text>
            <Text style={styles.statSub}>Automated Notices</Text>
          </View>
        </View>

        {/* Live Pending Verification Inbox (Combined Single & Bulk) */}
        <View style={styles.inboxSectionCard}>
          <View style={styles.inboxHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>📥</Text>
              <Text style={styles.inboxTitle}>Pending Verification Inbox</Text>
            </View>
            <View style={styles.pendingCountPill}>
              <Text style={styles.pendingCountText}>
                {stats.totalPendingVerificationInbox} PENDING
              </Text>
            </View>
          </View>

          <Text style={styles.inboxSub}>
            Live verification applications awaiting scheduling and smart balanced allocation across officers.
          </Text>

          <View style={styles.inboxChipsRow}>
            <View style={styles.inboxChip}>
              <Text style={styles.inboxChipNum}>{stats.pendingSingleApplications}</Text>
              <Text style={styles.inboxChipLabel}>Single Requests</Text>
            </View>
            <View style={[styles.inboxChip, { borderColor: '#F59E0B' }]}>
              <Text style={[styles.inboxChipNum, { color: '#D97706' }]}>{stats.pendingBulkRequests}</Text>
              <Text style={styles.inboxChipLabel}>Bulk Batches</Text>
            </View>
            <View style={[styles.inboxChip, { borderColor: '#10B981' }]}>
              <Text style={[styles.inboxChipNum, { color: '#047857' }]}>{stats.activeBulkBatches}</Text>
              <Text style={styles.inboxChipLabel}>Active Batches</Text>
            </View>
          </View>

        </View>

        {/* Verification Trend Chart (SVG) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Statewide Verification Trend (Monthly)</Text>
            <View style={styles.legendDotRow}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Issued Form VI Certificates</Text>
            </View>
          </View>

          <View style={styles.svgWrapper}>
            <Svg width="100%" height={chartHeight} viewBox="0 0 320 120">
              <Line x1="10" y1="95" x2="310" y2="95" stroke="#CBD5E1" strokeWidth="1" />

              {trendData.map((d: any, index: number) => {
                const barWidth = 28;
                const spacing = 48;
                const x = 20 + index * spacing;
                const barH = Math.round((d.count / maxCount) * 75);
                const y = 95 - barH;

                return (
                  <React.Fragment key={d.month}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barH)}
                      fill={index === trendData.length - 1 ? Colors.accentAmber : Colors.primaryNavy}
                      rx="4"
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 4}
                      fontSize="9"
                      fill="#475569"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {d.count}
                    </SvgText>
                    <SvgText
                      x={x + barWidth / 2}
                      y={110}
                      fontSize="10"
                      fill="#64748B"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {d.month}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Live Officer Fleet Workload Breakdown */}
        <View style={styles.fleetSection}>
          <View style={styles.fleetHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>Enforcement Fleet & Lab Workload</Text>
              <Text style={styles.fleetSub}>
                Real-time active verification load per assigned officer in MySQL
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshFleetBtn}
              onPress={loadLiveAdminData}
            >
              <Text style={styles.refreshFleetText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Field Legal Metrology Officers (LMO) */}
          <View style={styles.subFleetHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>⚖️</Text>
              <Text style={styles.subFleetTitle}>1. Field Legal Metrology Officers (LMO)</Text>
            </View>
            <View style={styles.subFleetPill}>
              <Text style={styles.subFleetPillText}>
                {officers.filter((o: any) => o.role !== 'GATC').length} FIELD OFFICERS
              </Text>
            </View>
          </View>
          <Text style={styles.subFleetDesc}>
            Enforcement officers conducting on-site physical stamping, test loads, and seal verification across Chennai districts.
          </Text>

          <View style={styles.officersListGrid}>
            {officers
              .filter((off: any) => off.role !== 'GATC')
              .map((off: any) => {
                const workload = off.currentWorkload || 0;
                const capacity = off.maxCapacity || 20;
                const pct = Math.min(100, Math.round((workload / capacity) * 100));
                const barColor = pct >= 80 ? '#EF4444' : pct >= 50 ? Colors.accentAmber : '#10B981';

                return (
                  <View key={off.id} style={styles.officerFleetCard}>
                    <View style={styles.officerFleetTop}>
                      <View style={styles.officerRoleIconBox}>
                        <Text style={{ fontSize: 18 }}>⚖️</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.officerFleetName}>{off.name}</Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{off.id}</Text>
                          </View>
                        </View>
                        <Text style={styles.officerFleetJurisdiction}>
                          {off.designation} • {off.district || 'Chennai'}
                        </Text>
                      </View>
                    </View>

                    {/* Workload Capacity Bar */}
                    <View style={styles.workloadBarContainer}>
                      <View style={styles.workloadLabelsRow}>
                        <Text style={styles.workloadLabel}>Active Assignments:</Text>
                        <Text style={[styles.workloadVal, { color: barColor }]}>
                          {workload} / {capacity} units ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>

          {/* 2. State Central Testing Laboratory (GATC) */}
          <View style={[styles.subFleetHeaderRow, { marginTop: 24 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>🔬</Text>
              <Text style={styles.subFleetTitle}>2. State Central Testing Laboratory (GATC)</Text>
            </View>
            <View style={[styles.subFleetPill, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
              <Text style={[styles.subFleetPillText, { color: '#6D28D9' }]}>
                CENTRAL METROLOGY LAB
              </Text>
            </View>
          </View>
          <Text style={styles.subFleetDesc}>
            Central testing authority with secondary mass comparators and digital Form VI Certificate endorsement clearance.
          </Text>

          <View style={styles.officersListGrid}>
            {officers
              .filter((off: any) => off.role === 'GATC')
              .map((off: any) => {
                const workload = off.currentWorkload || 0;
                const capacity = off.maxCapacity || 50;
                const pct = Math.min(100, Math.round((workload / capacity) * 100));
                const barColor = pct >= 80 ? '#EF4444' : pct >= 50 ? Colors.accentAmber : '#10B981';

                return (
                  <View key={off.id} style={[styles.officerFleetCard, { borderColor: '#C4B5FD', backgroundColor: '#FAF5FF' }]}>
                    <View style={styles.officerFleetTop}>
                      <View style={[styles.officerRoleIconBox, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={{ fontSize: 18 }}>🔬</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.officerFleetName}>{off.name}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: '#7C3AED' }]}>
                            <Text style={[styles.roleBadgeText, { color: '#FFFFFF' }]}>{off.id}</Text>
                          </View>
                        </View>
                        <Text style={styles.officerFleetJurisdiction}>
                          {off.designation} • State Calibration Directorate
                        </Text>
                      </View>
                    </View>

                    {/* Workload Capacity Bar */}
                    <View style={styles.workloadBarContainer}>
                      <View style={styles.workloadLabelsRow}>
                        <Text style={styles.workloadLabel}>Lab Clearance Queue:</Text>
                        <Text style={[styles.workloadVal, { color: '#6D28D9' }]}>
                          {workload} / {capacity} batches ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#7C3AED' }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FC'
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: 'rgba(50, 50, 93, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0A2540'
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A2540',
    marginTop: 2
  },
  statSub: {
    fontSize: 9.5,
    color: '#8898AA',
    marginTop: 2
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(50, 50, 93, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540'
  },
  legendDotRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#635BFF',
    marginRight: 4
  },
  legendText: {
    fontSize: 10,
    color: '#8898AA'
  },
  svgWrapper: {
    alignItems: 'center'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 10
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFE5FE',
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#635BFF',
    marginRight: 6,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#635BFF',
    letterSpacing: 0.5,
  },
  cleanSlateBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cleanSlateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  inboxSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  inboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inboxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  inboxSub: {
    fontSize: 12,
    color: '#425466',
    marginBottom: 12,
    lineHeight: 16,
  },
  inboxChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  inboxChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    paddingVertical: 10,
    alignItems: 'center',
  },
  inboxChipNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0A2540',
  },
  inboxChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8898AA',
    marginTop: 2,
  },
  allocateNowBtn: {
    backgroundColor: '#635BFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  allocateNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  fleetSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  fleetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fleetSub: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 2,
  },
  subFleetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4,
  },
  subFleetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540',
  },
  subFleetPill: {
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#DFE5FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subFleetPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#635BFF',
    letterSpacing: 0.4,
  },
  subFleetDesc: {
    fontSize: 11,
    color: '#425466',
    marginBottom: 10,
  },
  refreshFleetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#DFE5FE',
  },
  refreshFleetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#635BFF',
  },
  officersListGrid: {
    gap: 10,
  },
  officerFleetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 14,
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  officerFleetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  officerRoleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerFleetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A2540',
  },
  roleBadge: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DFE5FE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#635BFF',
  },
  officerFleetJurisdiction: {
    fontSize: 11,
    color: '#8898AA',
    marginTop: 2,
  },
  workloadBarContainer: {
    marginTop: 4,
  },
  workloadLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  workloadLabel: {
    fontSize: 11,
    color: '#425466',
  },
  workloadVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E3E8EE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pendingCountPill: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

