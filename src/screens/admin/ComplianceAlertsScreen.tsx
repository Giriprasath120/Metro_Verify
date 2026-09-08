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
import { GovHeader } from '../../components/GovHeader';
import { ComplianceGauge } from '../../components/ComplianceGauge';
import { mockOwners, Owner } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';

interface ComplianceAlertsScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const ComplianceAlertsScreen: React.FC<ComplianceAlertsScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const [filterTier, setFilterTier] = useState<'All' | 'Risk' | 'Watchlist' | 'Compliant'>('All');
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    async function loadScore() {
      try {
        const res = await fetch(API_ENDPOINTS.complianceScore('OWN-101'));
        const data = await res.json();
        if (data.success) {
          setLiveData(data);
        }
      } catch (e) {}
    }
    loadScore();
  }, []);

  const ownersList = mockOwners.map(o => {
    if (o.id === 'OWN-101' && liveData) {
      return {
        ...o,
        complianceScore: liveData.complianceScore,
        complianceDeductions: liveData.deductions || [],
      };
    }
    return o;
  });

  const filteredOwners = ownersList.filter(owner => {
    if (filterTier === 'All') return true;
    if (filterTier === 'Risk') return owner.complianceScore < 75;
    if (filterTier === 'Watchlist') return owner.complianceScore >= 75 && owner.complianceScore < 90;
    return owner.complianceScore >= 90;
  });

  const handleIssueNotice = (owner: Owner) => {
    Alert.alert(
      'Statutory Notice Dispatched',
      `Legal Metrology Form VII compliance notice dispatched to ${owner.businessName} (${owner.email}) with 7-day cure period.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Compliance & Risk Engine"
        subtitle="Explainable Scoring & Enforcement Auditing"
        roleLabel="State Enforcement"
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

        {/* Header Alert Banner */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Automated Risk Assessment Index</Text>
          <Text style={styles.overviewDesc}>
            Algorithms continuously compute 0–100 health scores based on days overdue, tolerance failure history, uncalibrated scale moves, and challan delays.
          </Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterRow}>
          {(['All', 'Risk', 'Watchlist', 'Compliant'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filterTier === tab && styles.tabBtnActive]}
              onPress={() => setFilterTier(tab)}
            >
              <Text style={[styles.tabText, filterTier === tab && styles.tabTextActive]}>
                {tab === 'Risk' ? 'High Risk (<75)' : tab === 'Watchlist' ? 'Watchlist (75-89)' : tab === 'Compliant' ? 'Tier A (≥90)' : 'All Entities'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Entities List with Explainable Chips */}
        <View style={styles.entitiesList}>
          {filteredOwners.map(owner => {
            const isHighRisk = owner.complianceScore < 75;
            const isWatchlist = owner.complianceScore >= 75 && owner.complianceScore < 90;

            let badgeBg = '#ECFDF5';
            let badgeText = '#047857';
            let tierLabel = 'Tier A (Compliant)';

            if (isHighRisk) {
              badgeBg = '#FEF2F2';
              badgeText = '#B91C1C';
              tierLabel = 'Tier C (Critical Risk)';
            } else if (isWatchlist) {
              badgeBg = '#FFFBEB';
              badgeText = '#B45309';
              tierLabel = 'Tier B (Standard Watchlist)';
            }

            return (
              <View key={owner.id} style={styles.ownerCard}>
                <View style={styles.ownerHeader}>
                  <View style={styles.ownerInfoCol}>
                    <Text style={styles.businessName}>{owner.businessName}</Text>
                    <Text style={styles.ownerSub}>
                      {owner.name} • 📍 {owner.district}, {owner.state}
                    </Text>
                    <Text style={styles.phoneText}>📞 {owner.phone} • {owner.type}</Text>
                  </View>

                  <View style={[styles.scorePill, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.scoreValue, { color: badgeText }]}>
                      {owner.complianceScore}
                    </Text>
                    <Text style={[styles.scoreSub, { color: badgeText }]}>/ 100</Text>
                  </View>
                </View>

                {/* Explainable Deduction Reason Chips (Requirement) */}
                <View style={styles.deductionsSection}>
                  <Text style={styles.deductionsLabel}>EXPLAINABLE RISK FACTORS & DEDUCTIONS:</Text>
                  {owner.complianceDeductions.length === 0 ? (
                    <View style={styles.cleanRecordChip}>
                      <Text style={styles.cleanRecordText}>✓ Zero compliance deductions on ledger (Clean Audit)</Text>
                    </View>
                  ) : (
                    owner.complianceDeductions.map((d: any, dIdx: number) => (
                      <View key={dIdx} style={styles.deductionChip}>
                        <View style={styles.penaltyBadge}>
                          <Text style={styles.penaltyText}>{d.points} PTS</Text>
                        </View>
                        <Text style={styles.deductionReason}>{d.reason}</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Enforcement Action Footer */}
                <View style={styles.cardFooter}>
                  <View style={[styles.tierTag, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.tierTagText, { color: badgeText }]}>{tierLabel}</Text>
                  </View>

                  {isHighRisk && (
                    <TouchableOpacity
                      style={styles.noticeBtn}
                      onPress={() => handleIssueNotice(owner)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.noticeBtnText}>⚡ Issue Enforcement Notice</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#425466',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  entitiesList: {
    gap: 16,
  },
  ownerCard: {
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
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  ownerInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A2540',
  },
  ownerSub: {
    fontSize: 11.5,
    color: '#425466',
    marginTop: 3,
  },
  phoneText: {
    fontSize: 10.5,
    color: '#8898AA',
    marginTop: 2,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 58,
  },
  scoreValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  scoreSub: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: -2,
  },
  deductionsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F6F9FC',
  },
  deductionsLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8898AA',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  deductionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  penaltyBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  penaltyText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  deductionReason: {
    flex: 1,
    fontSize: 11.5,
    color: '#991B1B',
    fontWeight: '500',
  },
  cleanRecordChip: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cleanRecordText: {
    fontSize: 11.5,
    color: '#047857',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tierTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  noticeBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: 'rgba(220, 38, 38, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  noticeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
