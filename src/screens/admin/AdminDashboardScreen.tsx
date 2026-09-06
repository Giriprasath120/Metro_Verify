import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await fetch(API_ENDPOINTS.applications);
        const data = await res.json();
        if (data.success && data.applications) {
          const pending = data.applications.filter((a: any) => a.status === 'SUBMITTED');
          setPendingRequestsCount(pending.length);
        }
      } catch (e) {}
    }
    loadPending();
    const unsub = navigation.addListener('focus', loadPending);
    return unsub;
  }, [navigation]);

  const trendData = mockAdminStats.monthlyVerificationTrend;
  const maxCount = Math.max(...trendData.map(d => d.count));
  const chartHeight = 120;
  const chartWidth = 300;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="State Metrology Directorate"
        subtitle="National Legal Metrology Verification Command Centre"
        roleLabel="State Admin"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Statewide Metrics 2x2 Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Colors.primaryNavy }]}>
            <Text style={styles.statNumber}>
              {mockAdminStats.totalInstrumentsStatewide.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Total Registered Statewide</Text>
            <Text style={styles.statSub}>Across 33 Districts</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.statNumber, { color: '#047857' }]}>
              {mockAdminStats.verificationsThisMonth.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Verifications This Month</Text>
            <Text style={styles.statSub}>+12.4% vs last cycle</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: Colors.accentAmber }]}>
            <Text style={[styles.statNumber, { color: Colors.accentAmber }]}>
              {mockAdminStats.averageComplianceScore}%
            </Text>
            <Text style={styles.statLabel}>Statewide Compliance Index</Text>
            <Text style={styles.statSub}>Tier A Baseline (Target ≥ 85%)</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={[styles.statNumber, { color: '#B91C1C' }]}>
              {mockAdminStats.overdueAlertsCount}
            </Text>
            <Text style={styles.statLabel}>Critical Overdue Alerts</Text>
            <Text style={styles.statSub}>Notices Automated</Text>
          </View>
        </View>

        {/* Verification Trend Chart (SVG) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Statewide Verification Trend (Monthly)</Text>
            <View style={styles.legendDotRow}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Completed Stamping Visits</Text>
            </View>
          </View>

          <View style={styles.svgWrapper}>
            <Svg width="100%" height={chartHeight} viewBox="0 0 320 120">
              {/* Baseline axis */}
              <Line x1="10" y1="95" x2="310" y2="95" stroke="#CBD5E1" strokeWidth="1" />

              {trendData.map((d, index) => {
                const barWidth = 28;
                const spacing = 48;
                const x = 20 + index * spacing;
                const barH = Math.round((d.count / maxCount) * 75);
                const y = 95 - barH;

                return (
                  <React.Fragment key={d.month}>
                    {/* Bar */}
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={index === trendData.length - 1 ? Colors.accentAmber : Colors.primaryNavy}
                      rx="4"
                    />
                    {/* Count label */}
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
                    {/* Month label */}
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

        {/* Submitted Verification Requests Pending Banner */}
        <TouchableOpacity
          style={styles.pendingBannerCard}
          onPress={() => navigation.navigate('SmartAllocation')}
          activeOpacity={0.85}
        >
          <View style={styles.pendingIconBox}>
            <Text style={{ fontSize: 24 }}>📥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.pendingBannerTitle}>Submitted Requests (Admin Inbox)</Text>
              <View style={styles.pendingCountPill}>
                <Text style={styles.pendingCountText}>{pendingRequestsCount} PENDING</Text>
              </View>
            </View>
            <Text style={styles.pendingBannerSub}>
              Direct from traders & owners in MySQL. Tap to Auto-Allocate evenly across all 5 officers.
            </Text>
          </View>
          <Text style={styles.wsArrow}>›</Text>
        </TouchableOpacity>

        {/* Core Administrative Workspaces */}
        <Text style={styles.sectionHeader}>Enforcement & Automation Workspaces</Text>

        <View style={styles.workspaceGrid}>
          {/* Workspace 1: Smart Allocation */}
          <TouchableOpacity
            style={styles.workspaceCard}
            onPress={() => navigation.navigate('SmartAllocation')}
            activeOpacity={0.8}
          >
            <View style={[styles.wsIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.wsIcon}>🧠</Text>
            </View>
            <View style={styles.wsTextCol}>
              <View style={styles.wsTitleRow}>
                <Text style={styles.wsTitle}>Smart Officer Allocation</Text>
                <View style={styles.liveAlgoPill}>
                  <Text style={styles.liveAlgoText}>LIVE ALGO</Text>
                </View>
              </View>
              <Text style={styles.wsDesc}>
                Real-time deterministic scoring engine ranking LMOs & GATCs by jurisdiction, travel distance, workload, and slot availability.
              </Text>
            </View>
            <Text style={styles.wsArrow}>›</Text>
          </TouchableOpacity>

          {/* Workspace 2: Compliance & Risk Alerts */}
          <TouchableOpacity
            style={styles.workspaceCard}
            onPress={() => navigation.navigate('ComplianceAlerts')}
            activeOpacity={0.8}
          >
            <View style={[styles.wsIconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Text style={styles.wsIcon}>⚠️</Text>
            </View>
            <View style={styles.wsTextCol}>
              <View style={styles.wsTitleRow}>
                <Text style={styles.wsTitle}>Compliance & Risk Alerts</Text>
                <View style={[styles.liveAlgoPill, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.liveAlgoText, { color: '#B91C1C' }]}>
                    {mockAdminStats.overdueAlertsCount} OVERDUE
                  </Text>
                </View>
              </View>
              <Text style={styles.wsDesc}>
                Watchlist of trade entities with explainable deduction breakdowns, overdue weighbridges, and automatic warning notices.
              </Text>
            </View>
            <Text style={styles.wsArrow}>›</Text>
          </TouchableOpacity>

          {/* Workspace 3: Bulk Batch Monitor */}
          <TouchableOpacity
            style={styles.workspaceCard}
            onPress={() => navigation.navigate('BulkMonitor')}
            activeOpacity={0.8}
          >
            <View style={[styles.wsIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.wsIcon}>📦</Text>
            </View>
            <View style={styles.wsTextCol}>
              <View style={styles.wsTitleRow}>
                <Text style={styles.wsTitle}>Bulk Batch Monitor</Text>
                <View style={[styles.liveAlgoPill, { backgroundColor: '#FFEDD5' }]}>
                  <Text style={[styles.liveAlgoText, { color: '#C2410C' }]}>
                    {mockBulkBatches.length} ACTIVE
                  </Text>
                </View>
              </View>
              <Text style={styles.wsDesc}>
                Statewide multi-instrument batch tracker with completion progress bars and officer workload balance charts.
              </Text>
            </View>
            <Text style={styles.wsArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: 12
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryNavy
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2
  },
  statSub: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  legendDotRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentAmber,
    marginRight: 4
  },
  legendText: {
    fontSize: 9,
    color: Colors.textMuted
  },
  svgWrapper: {
    alignItems: 'center'
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10
  },
  workspaceGrid: {
    gap: 12
  },
  workspaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  wsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  wsIcon: {
    fontSize: 22
  },
  wsTextCol: {
    flex: 1
  },
  wsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  wsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  liveAlgoPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  liveAlgoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  wsDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15
  },
  wsArrow: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
    marginLeft: 8
  },
  pendingBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryNavy,
  },
  pendingCountPill: {
    backgroundColor: Colors.accentAmber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  pendingBannerSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    lineHeight: 15,
  },
});
