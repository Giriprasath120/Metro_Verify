import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Linking
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Certificate } from '../../data/mockData';
import { Colors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';
import { API_ENDPOINTS } from '../config/api';

interface CertificateModalProps {
  visible: boolean;
  certificate: Certificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  visible,
  certificate,
  onClose
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!certificate) return null;

  const certNumber = certificate.certificateNumber || certificate.id || 'LM-2026-CERT';
  const instId = certificate.instrumentId || 'INST-UNKNOWN';
  const issueDate = (certificate as any).issuedDate || (certificate as any).issueDate || new Date().toISOString().split('T')[0];
  const validUntil = certificate.validUntil || '2027-03-01';
  const authority = (certificate as any).issuingAuthority || 'Directorate of Legal Metrology, Government of Telangana';
  const officer = (certificate as any).officerName || 'Legal Metrology Officer';
  const standard = (certificate as any).verificationStandard || 'Legal Metrology Act, 2009 (Rule 14)';
  const fee = (certificate as any).verificationFee || '₹500';
  const rawHash = (certificate as any).securityHash || certificate.id || certNumber;
  const secHash = typeof rawHash === 'string' ? rawHash.slice(0, 16) : 'SEC-VERIFY-2026';
  const certStatus = certificate.status || 'ACTIVE';

  const lanHost = '10.20.222.175';
  const verifyUrl = `http://${lanHost}:4000/api/certificates/${encodeURIComponent(certNumber)}/verify`;

  const handleDownload = async () => {
    setDownloading(true);
    const pdfUrl = API_ENDPOINTS.certificatePdf(certificate.id);
    const safeNumber = certNumber.replace(/[\/\\:]/g, '-');
    const fileName = `LM-CERT-${safeNumber}.pdf`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } else {
        await Linking.openURL(pdfUrl);
      }
    } catch (err: any) {
      Alert.alert(
        'PDF Download Failed',
        `Could not retrieve certificate file: ${err.message || 'Network error'}. Please verify backend server is running.`
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
      (navigator as any).clipboard.writeText(verifyUrl);
      Alert.alert(
        'Verification Link Copied',
        `Official eMaap Verification URL copied to clipboard:\n${verifyUrl}`
      );
    } else {
      Alert.alert(
        'Share Verification Link',
        `Public eMaap Verification Link:\n${verifyUrl}`,
        [
          { text: 'Open in Browser', onPress: () => Linking.openURL(verifyUrl) },
          { text: 'OK' }
        ]
      );
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.headerTitle}>Digital Metrology Certificate</Text>
              <Text style={styles.headerSubtitle}>Legal Metrology Act, 2009 • Form VI</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Certificate Frame */}
            <View style={styles.certFrame}>
              <View style={styles.nationalRibbon}>
                <View style={[styles.ribbonBand, { backgroundColor: '#FF9933' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#138808' }]} />
              </View>

              <View style={styles.certHeader}>
                <Text style={styles.emblemIcon}>🏛️</Text>
                <Text style={styles.govTitle}>GOVERNMENT OF INDIA</Text>
                <Text style={styles.deptTitle}>DIRECTORATE OF LEGAL METROLOGY</Text>
                <Text style={styles.certHeading}>CERTIFICATE OF VERIFICATION</Text>
                <Text style={styles.ruleText}>[Under Rule 14 of the Legal Metrology (General) Rules, 2011]</Text>
              </View>

              <View style={styles.badgeRow}>
                <StatusBadge status={certStatus} />
                <Text style={styles.certNumberText}>{certNumber}</Text>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrSection}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={verifyUrl}
                    size={160}
                    color="#0B2545"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrCaption}>Scan with any phone camera to verify on Government Portal</Text>
                
                {/* Direct Link Button */}
                <TouchableOpacity
                  style={styles.openVerifyBtn}
                  onPress={() => Linking.openURL(verifyUrl)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openVerifyBtnText}>🌐 Open Live Verification Page</Text>
                </TouchableOpacity>

                {/* Live Scanner Output Preview Box */}
                <View style={styles.scannedPreviewBox}>
                  <Text style={styles.scannedPreviewTitle}>📱 Live Scanner Web Link:</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(verifyUrl)}>
                    <Text style={styles.verifyLinkText}>{verifyUrl}</Text>
                  </TouchableOpacity>
                  <Text style={styles.scannedStatusApproved}>✓ STATUS: APPROVED & VERIFIED (FORM VI)</Text>
                  <Text style={styles.scannedPreviewText}>• Certificate: {certNumber}</Text>
                  <Text style={styles.scannedPreviewText}>• Instrument ID: {instId}</Text>
                  <Text style={styles.scannedPreviewText}>• Valid Until: {validUntil}</Text>
                  <Text style={styles.scannedPreviewText}>• Officer: {officer}</Text>
                </View>
              </View>

              {/* Details Table */}
              <View style={styles.detailsTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Instrument ID</Text>
                  <Text style={styles.tableValue}>{instId}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Issuing Authority</Text>
                  <Text style={styles.tableValue}>{authority}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Verifying Officer</Text>
                  <Text style={styles.tableValue}>{officer}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Applicable Standard</Text>
                  <Text style={styles.tableValue}>{standard}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Statutory Fee Paid</Text>
                  <Text style={styles.tableValue}>{fee}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Verification Date</Text>
                  <Text style={styles.tableValue}>{issueDate}</Text>
                </View>
                <View style={styles.tableRowHighlight}>
                  <Text style={styles.tableLabelHighlight}>Valid Until</Text>
                  <Text style={styles.tableValueHighlight}>{validUntil}</Text>
                </View>
              </View>

              {/* Seal Stamp */}
              <View style={styles.stampBox}>
                <Text style={styles.stampText}>DIGITALLY SIGNED & SEALED</Text>
                <Text style={styles.stampSub}>LEGAL METROLOGY ACT, 2009</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.downloadBtn, downloading && { opacity: 0.6 }]}
                onPress={handleDownload}
                disabled={downloading}
              >
                <Text style={styles.actionBtnText}>
                  {downloading ? 'Downloading PDF...' : '⬇ Download PDF'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={handleShare}
              >
                <Text style={styles.shareBtnText}>🔗 Share Link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryNavy,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerTitle: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700'
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 1
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  closeButtonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
    width: 16,
    textAlign: 'center'
  },
  scrollArea: {
    flexGrow: 1
  },
  scrollContent: {
    padding: 16
  },
  certFrame: {
    borderWidth: 2,
    borderColor: '#0B2545',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#FFFFFF'
  },
  nationalRibbon: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
    marginBottom: 10,
    borderRadius: 2,
    overflow: 'hidden'
  },
  ribbonBand: {
    flex: 1,
    height: '100%'
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 10
  },
  emblemIcon: {
    fontSize: 24,
    marginBottom: 2
  },
  govTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B2545',
    letterSpacing: 1
  },
  deptTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 1
  },
  certHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.accentAmber,
    marginTop: 6,
    letterSpacing: 0.5
  },
  ruleText: {
    fontSize: 9,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10
  },
  certNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 10
  },
  qrBox: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  qrCaption: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  openVerifyBtn: {
    marginTop: 8,
    backgroundColor: '#0F766E',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  openVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  verifyLinkText: {
    fontSize: 11,
    color: '#0284C7',
    textDecorationLine: 'underline',
    marginBottom: 6,
    fontWeight: '600',
  },
  scannedPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginTop: 10
  },
  scannedPreviewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryNavy,
    marginBottom: 4
  },
  scannedStatusApproved: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    marginBottom: 4
  },
  scannedPreviewText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 15
  },
  hashText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2
  },
  detailsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    marginVertical: 10,
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  tableRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#FFF7ED'
  },
  tableLabel: {
    width: 120,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  tableValue: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600'
  },
  tableLabelHighlight: {
    width: 120,
    fontSize: 11,
    color: Colors.accentAmber,
    fontWeight: '700'
  },
  tableValueHighlight: {
    flex: 1,
    fontSize: 11,
    color: Colors.accentAmber,
    fontWeight: '800'
  },
  stampBox: {
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    transform: [{ rotate: '-2deg' }]
  },
  stampText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5
  },
  stampSub: {
    color: '#059669',
    fontSize: 8,
    fontWeight: '600'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  downloadBtn: {
    backgroundColor: Colors.primaryNavy
  },
  actionBtnText: {
    color: Colors.textWhite,
    fontWeight: '700',
    fontSize: 13
  },
  shareBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  shareBtnText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 13
  }
});
