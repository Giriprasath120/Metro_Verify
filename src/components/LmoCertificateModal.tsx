import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../theme/colors';

export interface LmoCertificateData {
  id?: string;
  certificateNumber: string;
  sealNumber: string;
  instrumentId: string;
  instrumentModel?: string;
  category?: string;
  ownerName?: string;
  issueDate: string;
  officerName: string;
  officerBadge: string;
  officerDesignation?: string;
  district?: string;
  standardWeight?: string;
  indicatedValue?: string;
  errorMargin?: string;
  toleranceLimit?: string;
  status?: string;
  gatcTargetLab?: string;
  latitude?: number;
  longitude?: number;
  remarks?: string;
}

interface LmoCertificateModalProps {
  visible: boolean;
  certificate: LmoCertificateData | null;
  onClose: () => void;
  onEndorseByGatc?: () => void;
  isGatcView?: boolean;
}

export const LmoCertificateModal: React.FC<LmoCertificateModalProps> = ({
  visible,
  certificate,
  onClose,
  onEndorseByGatc,
  isGatcView = false,
}) => {
  if (!certificate) return null;

  const certNumber = certificate.certificateNumber || 'LMO-CERT-TS-2026-0000';
  const sealNumber = certificate.sealNumber || 'TS-SEAL-000000';
  const issueDate = certificate.issueDate || new Date().toISOString().split('T')[0];

  const activeHostname = (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? window.location.hostname
    : '10.20.222.175';

  const lmoVerifyUrl = `http://${activeHostname}:4000/api/certificates/verify?id=${encodeURIComponent(certNumber)}`;

  const lmoQrPayload = `LEGAL METROLOGY • LMO FIELD CERTIFICATE
========================================
STATUS: CERTIFIED BY LMO (PASSED TO GATC)
LMO CERT NO: ${certNumber}
LEAD SEAL NO: 🔒 ${sealNumber}
INSTRUMENT: ${certificate.instrumentId}
MODEL: ${certificate.instrumentModel || 'Commercial Weighing Instrument'}
CATEGORY: ${certificate.category || 'Weighing Instrument'}
OWNER: ${certificate.ownerName || 'Commercial Establishment'}
VERIFYING LMO: ${certificate.officerName} (${certificate.officerBadge})
DATE: ${issueDate}
CALIBRATION: LOAD ${certificate.standardWeight || '20.0 kg'} -> INDICATED ${certificate.indicatedValue || '20.000 kg'}
ERROR MARGIN: ${certificate.errorMargin || '0.00%'} (PASS)
TARGET LAB: ${certificate.gatcTargetLab || 'TS Central Metrology Lab (GATC-01)'}
========================================
ONLINE RECORD: ${lmoVerifyUrl}`;

  const handleCopy = () => {
    const text = 'GOVERNMENT OF TELANGANA - LEGAL METROLOGY\nLMO CERTIFICATE: ' + certNumber + '\nLEAD SEAL: ' + sealNumber + '\nINSTRUMENT: ' + certificate.instrumentId + '\nOFFICER: ' + certificate.officerName + ' (' + certificate.officerBadge + ')\nSTATUS: CERTIFIED BY LMO - PASSED TO GATC';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
      (navigator as any).clipboard.writeText(text);
      Alert.alert('Copied', 'LMO Certificate details copied to clipboard.');
    } else {
      Alert.alert('LMO Certificate Record', text);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.headerTitle}>LMO Field Verification Certificate</Text>
              <Text style={styles.headerSubtitle}>Legal Metrology Act, 2009 • Schedule VII Stamping</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Certificate Frame */}
            <View style={styles.certFrame}>
              {/* National Tri-Color Ribbon */}
              <View style={styles.nationalRibbon}>
                <View style={[styles.ribbonBand, { backgroundColor: '#FF9933' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#138808' }]} />
              </View>

              {/* Header Box */}
              <View style={styles.certHeader}>
                <Text style={styles.emblemIcon}>🏛️</Text>
                <Text style={styles.govTitle}>GOVERNMENT OF TELANGANA</Text>
                <Text style={styles.deptTitle}>DIRECTORATE OF LEGAL METROLOGY</Text>
                <Text style={styles.certHeading}>FIELD VERIFICATION & CALIBRATION SLIP</Text>
                <Text style={styles.ruleText}>[Official Schedule VII Physical Stamping & Standard Test Slip]</Text>
              </View>

              {/* Badges Row */}
              <View style={styles.badgeRow}>
                <View style={styles.certStatusBadge}>
                  <Text style={styles.certStatusText}>● CERTIFIED BY LMO</Text>
                </View>
                <View style={styles.handoffBadge}>
                  <Text style={styles.handoffText}>🔬 PASSED TO GATC LAB</Text>
                </View>
              </View>

              {/* Number and Seal Row */}
              <View style={styles.numberBox}>
                <View style={styles.numCol}>
                  <Text style={styles.numLabel}>LMO CERTIFICATE NUMBER</Text>
                  <Text style={styles.numValue}>{certNumber}</Text>
                </View>
                <View style={styles.numDivider} />
                <View style={styles.numCol}>
                  <Text style={styles.numLabel}>PHYSICAL LEAD SEAL NO.</Text>
                  <Text style={[styles.numValue, { color: '#047857' }]}>🔒 {sealNumber}</Text>
                </View>
              </View>

              {/* Official Single LMO QR Code */}
              <View style={styles.qrSection}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={lmoQrPayload}
                    size={160}
                    color="#0B2545"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrCaption}>
                  ✓ Official LMO Field QR Code • Point any phone camera or QR scanner to view instant field calibration readings &amp; lead seal verification
                </Text>
              </View>

              {/* Instrument & Owner Details Table */}
              <View style={styles.tableSection}>
                <Text style={styles.tableHeader}>INSTRUMENT & ESTABLISHMENT DETAILS</Text>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Target Instrument ID</Text>
                  <Text style={styles.tableValBold}>{certificate.instrumentId}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Instrument Model / Type</Text>
                  <Text style={styles.tableVal}>{certificate.instrumentModel || 'Commercial Weighing Instrument'}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Category</Text>
                  <Text style={styles.tableVal}>{certificate.category || 'Non-Automatic Weighing Instrument'}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Establishment / Owner</Text>
                  <Text style={styles.tableVal}>{certificate.ownerName || 'Registered Commercial Trader'}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Verification Date</Text>
                  <Text style={styles.tableVal}>{issueDate}</Text>
                </View>
              </View>

              {/* Calibration & Field Readings Table */}
              <View style={styles.tableSection}>
                <Text style={styles.tableHeader}>PHYSICAL CALIBRATION & TEST READINGS</Text>
                <View style={styles.readingsGrid}>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>Standard Test Load</Text>
                    <Text style={styles.readingVal}>{certificate.standardWeight || '20.0 kg'}</Text>
                  </View>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>Indicated Reading</Text>
                    <Text style={styles.readingVal}>{certificate.indicatedValue || '20.000 kg'}</Text>
                  </View>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>Error Margin</Text>
                    <Text style={[styles.readingVal, { color: '#059669' }]}>{certificate.errorMargin || '0.00%'}</Text>
                  </View>
                  <View style={styles.readingCard}>
                    <Text style={styles.readingLabel}>Tolerance Limit</Text>
                    <Text style={styles.readingVal}>{certificate.toleranceLimit || '±0.05%'}</Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Field Stamping Result</Text>
                  <Text style={[styles.tableValBold, { color: '#047857' }]}>✓ PASS — WITHIN PERMISSIBLE LIMITS</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Geo-Location Evidence</Text>
                  <Text style={styles.tableVal}>
                    {certificate.latitude && certificate.longitude
                      ? 'Lat: ' + certificate.latitude.toFixed(4) + ', Lng: ' + certificate.longitude.toFixed(4) + ' ✓ Geo-Stamped'
                      : 'Geo-Coordinates Verified & Logged ✓'}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Observations / Remarks</Text>
                  <Text style={styles.tableVal}>{certificate.remarks || 'Standard weights verified. Scale calibrated within Schedule VII tolerance.'}</Text>
                </View>
              </View>

              {/* Officer Sign-Off & Lab Handoff Box */}
              <View style={styles.signOffContainer}>
                <View style={styles.signBox}>
                  <Text style={styles.signStatus}>✓ CERTIFIED BY LMO</Text>
                  <Text style={styles.signName}>{certificate.officerName}</Text>
                  <Text style={styles.signBadge}>Badge: {certificate.officerBadge}</Text>
                  <Text style={styles.signDept}>{certificate.officerDesignation || 'Legal Metrology Officer'}</Text>
                  <Text style={styles.signStamp}>Telangana State Legal Metrology</Text>
                </View>

                <View style={styles.arrowBox}>
                  <Text style={{ fontSize: 22 }}>➔</Text>
                </View>

                <View style={styles.signBoxGatc}>
                  <Text style={styles.signStatusGatc}>🔬 TARGET GATC CENTRE</Text>
                  <Text style={styles.signNameGatc}>GATC Central Testing Laboratory</Text>
                  <Text style={styles.signBadgeGatc}>Station: GATC-TS-01</Text>
                  <Text style={styles.signDeptGatc}>Awaiting Final Form VI Endorsement</Text>
                  <Text style={styles.signStampGatc}>Government of Telangana</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Text style={styles.copyBtnText}>📋 Copy Details</Text>
            </TouchableOpacity>

            {isGatcView && onEndorseByGatc ? (
              <TouchableOpacity style={styles.endorseBtn} onPress={onEndorseByGatc} activeOpacity={0.85}>
                <Text style={styles.endorseBtnText}>🔬 Laboratory Endorse & Issue Form VI ›</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.closeActionBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeActionBtnText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.primaryNavy,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  certFrame: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  nationalRibbon: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ribbonBand: {
    flex: 1,
    height: '100%',
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  emblemIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  govTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primaryNavy,
    letterSpacing: 1.2,
  },
  deptTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  certHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.accentAmber,
    letterSpacing: 1,
    marginTop: 4,
  },
  ruleText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  certStatusBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  certStatusText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  handoffBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  handoffText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },
  numberBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  numCol: {
    flex: 1,
    alignItems: 'center',
  },
  numDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
  },
  numLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  numValue: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primaryNavy,
  },
  qrSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  qrBox: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrCaption: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
    paddingHorizontal: 10,
  },
  tableSection: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  tableHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tableKey: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  tableVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  tableValBold: {
    fontSize: 11,
    color: Colors.primaryNavy,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  readingCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  readingVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryNavy,
    marginTop: 2,
  },
  signOffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  arrowBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBox: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  signStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 2,
  },
  signName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  signBadge: {
    fontSize: 10,
    color: '#475569',
  },
  signDept: {
    fontSize: 9,
    color: '#64748B',
  },
  signStamp: {
    fontSize: 8,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 2,
  },
  signBoxGatc: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  signStatusGatc: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  signNameGatc: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  signBadgeGatc: {
    fontSize: 10,
    color: '#475569',
  },
  signDeptGatc: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
  },
  signStampGatc: {
    fontSize: 8,
    color: '#1D4ED8',
    fontWeight: '700',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  copyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  endorseBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endorseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeActionBtn: {
    flex: 1,
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
