import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { PassportTimeline } from '../../components/PassportTimeline';
import { CertificateModal } from '../../components/CertificateModal';
import { DigitalTwin3DView } from '../../components/DigitalTwin3DView';
import { Instrument, mockCertificates, mockInstruments } from '../../../data/mockData';
import { Colors } from '../../theme/colors';

import { API_ENDPOINTS } from '../../config/api';

interface InstrumentPassportScreenProps {
  route: any;
  navigation: any;
  onSwitchRole: () => void;
}

export const InstrumentPassportScreen: React.FC<InstrumentPassportScreenProps> = ({
  route,
  navigation,
  onSwitchRole
}) => {
  const initialInstrument: Instrument = route?.params?.instrument || mockInstruments[0];
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [livePassport, setLivePassport] = useState<any>(null);

  React.useEffect(() => {
    async function loadPassport() {
      try {
        const res = await fetch(API_ENDPOINTS.instrumentPassport(initialInstrument.id));
        const data = await res.json();
        if (data.success) {
          setLivePassport(data);
        }
      } catch (e) {}
    }
    loadPassport();
  }, [initialInstrument.id]);

  const instrument: Instrument = {
    id: initialInstrument?.id || 'INST-TS-01',
    model: initialInstrument?.model || 'Electronic Counter Scale',
    category: initialInstrument?.category || 'Non-Automatic Weighing Instrument',
    subCategory: initialInstrument?.subCategory || 'Digital Commercial Scale',
    capacity: initialInstrument?.capacity || '50 kg',
    accuracyClass: initialInstrument?.accuracyClass || 'Class III',
    serialNumber: initialInstrument?.serialNumber || 'SN-2026-LM-01',
    manufacturer: initialInstrument?.manufacturer || 'Certified Metrology Equipment',
    location: initialInstrument?.location || 'Osmangunj Wholesale Market, Hyderabad',
    district: initialInstrument?.district || 'Hyderabad',
    state: initialInstrument?.state || 'Telangana',
    expiryDate: initialInstrument?.expiryDate || initialInstrument?.scheduledDate || '2027-02-18',
    status: livePassport?.status || initialInstrument?.status || 'Verified',
    readings: initialInstrument?.readings || {
      standardWeight: '20.000 kg',
      indicatedValue: '20.002 kg',
      errorMargin: '+2 g',
      toleranceLimit: '±5 g (Class III)',
      result: 'PASS' as const,
    },
    passportTimeline: livePassport?.timeline || initialInstrument?.passportTimeline || [],
    ownerId: initialInstrument?.ownerId || 'OWN-101',
    lastVerifiedDate: initialInstrument?.lastVerifiedDate || '2026-02-18',
  };

  const matchedCertificate = (livePassport?.activeCertificate ? {
    id: livePassport.activeCertificate.id,
    certificateNumber: livePassport.activeCertificate.certificateNumber,
    instrumentId: livePassport.activeCertificate.instrumentId,
    ownerId: livePassport.activeCertificate.ownerId,
    issuedDate: livePassport.activeCertificate.issueDate,
    validUntil: livePassport.activeCertificate.validUntil,
    issuingAuthority: 'Directorate of Legal Metrology, Government of Telangana',
    officerName: livePassport.activeCertificate.officerName,
    verificationStandard: 'Legal Metrology Act, 2009 (Rule 14)',
    verificationFee: '₹500',
    securityHash: livePassport.activeCertificate.id,
    qrPayload: livePassport.activeCertificate.qrCodeData,
    status: (livePassport.activeCertificate.status === 'ACTIVE' ? 'Active' : 'Expired') as 'Active' | 'Expired',
  } : null) || mockCertificates.find(
    c => c.instrumentId === instrument.id || c.id === instrument.certificateId
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Instrument Passport"
        subtitle="Permanent Verifiable Lifecycle Record"
        roleLabel="Digital Passport"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Back navigation button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹ Back to My Instruments</Text>
        </TouchableOpacity>

        {/* 3D Digital Twin Representation */}
        <DigitalTwin3DView instrument={instrument} />

        {/* Passport Header Card */}
        <View style={styles.passportCard}>
          <View style={styles.passportRibbon}>
            <View style={[styles.ribbonColor, { backgroundColor: '#FF9933' }]} />
            <View style={[styles.ribbonColor, { backgroundColor: '#FFFFFF' }]} />
            <View style={[styles.ribbonColor, { backgroundColor: '#138808' }]} />
          </View>

          <View style={styles.cardHeader}>
            <View style={styles.passportBadge}>
              <Text style={styles.passportIcon}>🛡️</Text>
              <Text style={styles.passportBadgeText}>DIGITAL METROLOGY PASSPORT</Text>
            </View>
            <StatusBadge status={instrument.status} />
          </View>

          <Text style={styles.instrumentName}>{instrument.model}</Text>
          <Text style={styles.instrumentCategory}>{instrument.category} • {instrument.subCategory}</Text>

          {/* Quick Info Grid */}
          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Passport ID</Text>
              <Text style={styles.metaValHighlight}>{instrument.id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Serial Number</Text>
              <Text style={styles.metaVal}>{instrument.serialNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Manufacturer</Text>
              <Text style={styles.metaVal}>{instrument.manufacturer}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Capacity & Class</Text>
              <Text style={styles.metaVal}>{instrument.capacity} ({instrument.accuracyClass || 'Standard'})</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Location</Text>
              <Text style={styles.metaVal}>📍 {instrument.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Jurisdiction</Text>
              <Text style={styles.metaVal}>{instrument.district}, {instrument.state}</Text>
            </View>
            <View style={styles.metaRowHighlight}>
              <Text style={styles.metaKeyHighlight}>Current Validity Due</Text>
              <Text style={styles.metaValHighlightDate}>{instrument.expiryDate}</Text>
            </View>
          </View>
        </View>

        {/* Measurement Readings Card (if verified / tested) */}
        {instrument.readings && (
          <View style={styles.readingsCard}>
            <View style={styles.readingsHeader}>
              <Text style={styles.readingsTitle}>Field Calibration Test Readings</Text>
              <View
                style={[
                  styles.resultPill,
                  { backgroundColor: instrument.readings.result === 'PASS' ? '#ECFDF5' : '#FEF2F2' }
                ]}
              >
                <Text
                  style={[
                    styles.resultPillText,
                    { color: instrument.readings.result === 'PASS' ? '#047857' : '#B91C1C' }
                  ]}
                >
                  {instrument.readings.result}
                </Text>
              </View>
            </View>

            <View style={styles.readingsGrid}>
              <View style={styles.readingItem}>
                <Text style={styles.readingLabel}>Standard Load Applied</Text>
                <Text style={styles.readingValue}>{instrument.readings.standardWeight}</Text>
              </View>
              <View style={styles.readingItem}>
                <Text style={styles.readingLabel}>Indicated Reading</Text>
                <Text style={styles.readingValue}>{instrument.readings.indicatedValue}</Text>
              </View>
              <View style={styles.readingItem}>
                <Text style={styles.readingLabel}>Recorded Error Margin</Text>
                <Text style={styles.readingValueHighlight}>{instrument.readings.errorMargin}</Text>
              </View>
              <View style={styles.readingItem}>
                <Text style={styles.readingLabel}>Allowable Tolerance</Text>
                <Text style={styles.readingValue}>{instrument.readings.toleranceLimit}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Vertical Lifecycle Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineSectionTitle}>Verification Lifecycle History</Text>
          <Text style={styles.timelineSectionSub}>
            Immutable audit trail per Legal Metrology (General) Rules, 2011
          </Text>

          <PassportTimeline nodes={instrument.passportTimeline} />
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
  backButton: {
    marginBottom: 12
  },
  backButtonText: {
    fontSize: 13,
    color: Colors.primaryNavy,
    fontWeight: '700'
  },
  passportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    overflow: 'hidden'
  },
  passportRibbon: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },
  ribbonColor: {
    flex: 1,
    height: '100%'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10
  },
  passportBadge: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  passportIcon: {
    fontSize: 16,
    marginRight: 6
  },
  passportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryNavy,
    letterSpacing: 0.5
  },
  instrumentName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  instrumentCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  metaTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14
  },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  metaRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF7ED'
  },
  metaKey: {
    width: 130,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  metaVal: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600'
  },
  metaKeyHighlight: {
    width: 130,
    fontSize: 11,
    color: Colors.accentAmber,
    fontWeight: '700'
  },
  metaValHighlight: {
    flex: 1,
    fontSize: 11,
    color: Colors.accentAmber,
    fontWeight: '800'
  },
  metaValHighlightDate: {
    flex: 1,
    fontSize: 12,
    color: Colors.accentAmber,
    fontWeight: '800'
  },
  viewCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10
  },
  viewCertIcon: {
    fontSize: 22,
    marginRight: 10
  },
  viewCertTextCol: {
    flex: 1
  },
  viewCertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  viewCertSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2
  },
  viewCertArrow: {
    fontSize: 20,
    color: '#1D4ED8',
    fontWeight: '600'
  },
  noCertNotice: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  noCertText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center'
  },
  readingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16
  },
  readingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  readingsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  resultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  resultPillText: {
    fontSize: 10,
    fontWeight: '800'
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  readingItem: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  readingLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  readingValue: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 2
  },
  readingValueHighlight: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
    marginTop: 2
  },
  timelineSection: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  timelineSectionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 12
  },
  certCtaButton: {
    backgroundColor: '#0B2545',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#1E3A8A'
  },
  certCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  certCtaIcon: {
    fontSize: 22
  },
  certCtaTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  certCtaSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 2
  },
  certCtaArrow: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700'
  }
});
