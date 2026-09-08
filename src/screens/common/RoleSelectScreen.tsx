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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Stripe Signature Gradient Swoosh Ribbon */}
      <View style={styles.stripeRibbon}>
        {Colors.stripeRibbon.map((color: string, index: number) => (
          <View key={index} style={[styles.ribbonBand, { backgroundColor: color }]} />
        ))}
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
        <Text style={styles.sectionSub}>Unified Authentication & Access Gateway</Text>

        {/* Role Cards */}
        <View style={styles.rolesGrid}>
          {/* Role 1: Owner */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => onSelectRole('owner')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EFF2FE' }]}>
              <Text style={styles.roleIcon}>🏪</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Instrument Owner</Text>
                <View style={[styles.rolePill, { backgroundColor: '#EFF2FE' }]}>
                  <Text style={[styles.rolePillText, { color: '#635BFF' }]}>Industry / Trader</Text>
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
            <View style={[styles.iconCircle, { backgroundColor: '#EFF2FE' }]}>
              <Text style={styles.roleIcon}>⚖️</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>LMO / GATC Officer</Text>
                <View style={[styles.rolePill, { backgroundColor: '#EFF2FE' }]}>
                  <Text style={[styles.rolePillText, { color: '#635BFF' }]}>Field Enforcement</Text>
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
            <View style={[styles.iconCircle, { backgroundColor: '#EFF2FE' }]}>
              <Text style={styles.roleIcon}>📊</Text>
            </View>
            <View style={styles.roleTextContainer}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>Administrator</Text>
                <View style={[styles.rolePill, { backgroundColor: '#EFF2FE' }]}>
                  <Text style={[styles.rolePillText, { color: '#635BFF' }]}>State Directorate</Text>
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
    backgroundColor: '#F6F9FC',
  },
  stripeRibbon: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  ribbonBand: {
    flex: 1,
    height: '100%',
  },
  container: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  emblemContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emblemIcon: {
    fontSize: 24,
  },
  govTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: 1.2,
  },
  deptTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#425466',
    textAlign: 'center',
    marginTop: 4,
  },
  deptSub: {
    fontSize: 9,
    color: '#8898AA',
    textAlign: 'center',
    marginTop: 2,
  },
  appTitleCard: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E3E8EE',
    width: '100%',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0A2540',
    letterSpacing: 0.8,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#425466',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  sihBadge: {
    backgroundColor: '#EFF2FE',
    borderColor: 'rgba(99, 91, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  sihBadgeText: {
    color: '#635BFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2540',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionSub: {
    fontSize: 13,
    color: '#425466',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  rolesGrid: {
    gap: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.15)',
  },
  roleIcon: {
    fontSize: 24,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540',
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.2)',
  },
  rolePillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  roleDesc: {
    fontSize: 12,
    color: '#425466',
    lineHeight: 18,
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  featureChip: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#635BFF',
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.15)',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#635BFF',
    fontWeight: '400',
    marginLeft: 12,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11.5,
    color: '#425466',
    textAlign: 'center',
  },
  footerSub: {
    fontSize: 10.5,
    color: '#8898AA',
    marginTop: 4,
    textAlign: 'center',
  },
});
