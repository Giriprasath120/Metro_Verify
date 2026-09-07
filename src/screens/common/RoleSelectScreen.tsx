import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Colors } from '../../theme/colors';

interface RoleSelectScreenProps {
  onSelectRole: (role: 'owner' | 'officer' | 'admin') => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelectRole }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryNavy} />
      
      {/* Executive Gov-Tech Accent Strip */}
      <View style={styles.topTricolor}>
        <View style={[styles.tricolorBand, { backgroundColor: '#D4AF37' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#0A192F' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#1E3A8A' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Portal Header */}
        <View style={styles.header}>
          <View style={styles.emblemContainer}>
            <Text style={styles.emblemIcon}>🏛️</Text>
          </View>
          <Text style={styles.govTitle}>GOVERNMENT OF INDIA</Text>
          <Text style={styles.deptTitle}>MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</Text>
          <Text style={styles.deptSub}>DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION</Text>
          
          <View style={styles.appTitleCard}>
            <Text style={styles.appTitle}>METRO VERIFY</Text>
            <Text style={styles.appSubtitle}>
              Digital Legal Metrology Verification & Lifecycle Management Platform
            </Text>
            <View style={styles.sihBadge}>
              <Text style={styles.sihBadgeText}>SMART INDIA HACKATHON 2026 • SIH26036</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Select Your Verification Role to Continue</Text>
        <Text style={styles.sectionSub}>Simulated Authentication Gateway</Text>

        {/* Role Cards */}
        <View style={styles.rolesGrid}>
          {/* Role 1: Owner */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => onSelectRole('owner')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.roleIcon}>🏪</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Instrument Owner</Text>
                <View style={[styles.rolePill, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.rolePillText, { color: Colors.accentAmber }]}>Industry / Trader</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                Manage weighing & measuring instruments, view digital passports, request single or bulk re-verification, view QR certificates, and consult Gemini AI Assistant.
              </Text>
              <View style={styles.featureChipsRow}>
                <Text style={styles.featureChip}>Digital Passport</Text>
                <Text style={styles.featureChip}>Bulk Batching</Text>
                <Text style={styles.featureChip}>AI Assistant</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          {/* Role 2: Officer */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => onSelectRole('officer')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.roleIcon}>⚖️</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>LMO / GATC Officer</Text>
                <View style={[styles.rolePill, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.rolePillText, { color: '#1D4ED8' }]}>Field Enforcement</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                Field verification workspace: today's assigned inspections, measurement tolerance entry, mock GPS stamping & photo capture, and offline synchronization queue.
              </Text>
              <View style={styles.featureChipsRow}>
                <Text style={styles.featureChip}>Field Test Form</Text>
                <Text style={styles.featureChip}>GPS & Photo</Text>
                <Text style={styles.featureChip}>Offline Sync</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          {/* Role 3: Administrator */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => onSelectRole('admin')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.roleIcon}>📊</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Administrator</Text>
                <View style={[styles.rolePill, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.rolePillText, { color: '#047857' }]}>State Directorate</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>
                Statewide analytics dashboard, live smart officer allocation engine, compliance health risk alerts with explainable deductions, and active bulk batch monitoring.
              </Text>
              <View style={styles.featureChipsRow}>
                <Text style={styles.featureChip}>Smart Allocation</Text>
                <Text style={styles.featureChip}>Risk Scoring</Text>
                <Text style={styles.featureChip}>Batch Monitor</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Disclaimer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Demo prototype complementing eMaap (National Legal Metrology Portal).
          </Text>
          <Text style={styles.footerSub}>Powered by Deterministic Allocation Algorithm & Google Gemini AI</Text>
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
  topTricolor: {
    flexDirection: 'row',
    height: 4,
    width: '100%'
  },
  tricolorBand: {
    flex: 1,
    height: '100%'
  },
  container: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  emblemContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  emblemIcon: {
    fontSize: 24
  },
  govTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 1.2
  },
  deptTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 2
  },
  deptSub: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    marginTop: 1
  },
  appTitleCard: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%'
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.accentAmber,
    letterSpacing: 1
  },
  appSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12
  },
  sihBadge: {
    backgroundColor: 'rgba(230, 81, 0, 0.25)',
    borderColor: Colors.accentAmber,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8
  },
  sihBadgeText: {
    color: Colors.accentOrange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 4
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 2
  },
  rolesGrid: {
    gap: 12
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  roleIcon: {
    fontSize: 24
  },
  roleTextContainer: {
    flex: 1
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700'
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  featureChip: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primaryNavy,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  arrowIcon: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
    marginLeft: 8
  },
  footer: {
    marginTop: 24,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center'
  },
  footerSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center'
  }
});
