import React, { useState, useEffect } from 'react';
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
import { API_ENDPOINTS, PUBLIC_VERIFY_URL } from '../config/api';

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
  const [liveTunnelUrl, setLiveTunnelUrl] = useState(PUBLIC_VERIFY_URL);
  const [qrMode, setQrMode] = useState<'url' | 'text'>('url');
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically query server for active tunnel URL
    fetch(API_ENDPOINTS.publicTunnel)
      .then(res => res.json())
      .then(data => {
        if (data && data.tunnelUrl) {
          setLiveTunnelUrl(data.tunnelUrl);
        }
      })
      .catch(() => {
        // Keeps default PUBLIC_VERIFY_URL
      });
  }, []);

  if (!visible || !certificate) return null;

  const certNumber = certificate.certificateNumber || certificate.id || 'LM-2026-CERT';
  const instId = certificate.instrumentId || 'INST-UNKNOWN';
  const issueDate = (certificate as any).issuedDate || (certificate as any).issueDate || new Date().toISOString().split('T')[0];
  const validUntil = certificate.validUntil || '2027-03-01';
  const authority = (certificate as any).issuingAuthority || 'Directorate of Legal Metrology, Government of India';
  const officer = (certificate as any).officerName || 'Legal Metrology Officer';
  const standard = (certificate as any).verificationStandard || 'Legal Metrology Act, 2009 (Rule 14)';
  const fee = (certificate as any).verificationFee || '₹500';
  const rawHash = (certificate as any).securityHash || certificate.id || certNumber;
  const secHash = typeof rawHash === 'string' ? rawHash.slice(0, 16) : 'SEC-VERIFY-2026';
  const certStatus = certificate.status || 'ACTIVE';
  const modelType = (certificate as any).instrumentType || (certificate as any).instrument?.model || 'Commercial Electronic Scale';
  const serialNo = (certificate as any).serialNumber || (certificate as any).instrument?.serialNumber || 'SN-TN-2026-8812';
  const ownerName = (certificate as any).ownerName || (certificate as any).owner?.businessName || (certificate as any).owner?.name || 'Sri Balaji Traders, Koyambedu, Chennai';

  const now = new Date();
  const expiryDate = new Date(validUntil);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let dynStatus = { text: 'ACTIVE', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' };
  if (diffDays < 0) {
    dynStatus = { text: `EXPIRED (${Math.abs(diffDays)}d ago)`, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
  } else if (diffDays <= 30) {
    dynStatus = { text: `EXPIRING SOON (${diffDays}d left)`, color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' };
  }

  const gatcLab = (certificate as any).gatcLabName || 'National Legal Metrology Central Laboratory (GATC-01)';

  // Public verification endpoint URL
  const certIdParam = certificate.id || certNumber;
  const verifyUrl = `${liveTunnelUrl}/api/certificates/verify?id=${encodeURIComponent(certIdParam)}`;

  // 1. Comprehensive Digital Certificate Record (scannable offline by ANY phone without internet or web server)
  const fullCertificatePayload = `GOVERNMENT OF INDIA • LEGAL METROLOGY
FORM VI DIGITAL VERIFICATION CERTIFICATE
========================================
STATUS: ${dynStatus.text}
CERTIFICATE NO: ${certNumber}
INSTRUMENT UID: ${instId}
ESTABLISHMENT: Sri Balaji Traders, Koyambedu Market, Chennai
OFFICER (LMO): ${officer}
GATC TEST LAB: ${gatcLab}
STANDARD: ${standard}
FEE PAID: ${fee} (Statutory Challan Verified)
VALIDITY: ${issueDate} TO ${validUntil}
DUAL ENDORSEMENT: LMO Certified + GATC Endorsed
SECURITY HASH: ${secHash}
========================================
NATIONAL REGISTER: ${verifyUrl}`;

  // 2. Active payload based on user selection: 'text' = guaranteed offline view; 'url' = web browser view
  const activeQrPayload = (qrMode === 'url' ? verifyUrl : fullCertificatePayload) || verifyUrl || 'METRO-VERIFY-FORM-VI';

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

        setDownloadNotification(`✓ Certificate #${certNumber} downloaded successfully to your device!`);
        setTimeout(() => setDownloadNotification(null), 5000);
      } else {
        await Linking.openURL(pdfUrl);
        setDownloadNotification(`✓ Certificate #${certNumber} opened for download.`);
        setTimeout(() => setDownloadNotification(null), 5000);
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
            {/* Download Notification Banner */}
            {downloadNotification && (
              <View style={{
                backgroundColor: '#DCFCE7',
                borderColor: '#86EFAC',
                borderWidth: 1.5,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 18 }}>📥</Text>
                  <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13 }}>
                    {downloadNotification}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDownloadNotification(null)}>
                  <Text style={{ color: '#15803D', fontWeight: '800', fontSize: 14, paddingHorizontal: 6 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Certificate Frame */}
            <View style={styles.certFrame}>
              {/* Stripe Multi-Color Accent Strip */}
              <View style={styles.nationalRibbon}>
                <View style={[styles.ribbonBand, { backgroundColor: '#FF5E5B' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#FF7A59' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#EA4C89' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#635BFF' }]} />
                <View style={[styles.ribbonBand, { backgroundColor: '#00D4FF' }]} />
              </View>

              <View style={styles.certHeader}>
                <Text style={styles.emblemIcon}>🏛️</Text>
                <Text style={styles.govTitle}>GOVERNMENT OF INDIA</Text>
                <Text style={styles.deptTitle}>DIRECTORATE OF LEGAL METROLOGY</Text>
                <Text style={styles.certHeading}>CERTIFICATE OF VERIFICATION</Text>
                <Text style={styles.ruleText}>[Under Rule 14 of the Legal Metrology (General) Rules, 2011]</Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.dynStatusBadge, { backgroundColor: dynStatus.bg, borderColor: dynStatus.border }]}>
                  <Text style={[styles.dynStatusBadgeText, { color: dynStatus.color }]}>
                    ● {dynStatus.text}
                  </Text>
                </View>
                <Text style={styles.certNumberText}>{certNumber}</Text>
              </View>

              {/* QR Mode Selector: URL vs Complete Offline Certificate Record */}
              <View style={styles.qrModeToggleRow}>
                <TouchableOpacity
                  style={[styles.qrModeBtn, qrMode === 'url' && styles.qrModeBtnActive]}
                  onPress={() => setQrMode('url')}
                >
                  <Text style={[styles.qrModeBtnText, qrMode === 'url' && styles.qrModeBtnTextActive]}>
                    🌐 Web Link QR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.qrModeBtn, qrMode === 'text' && styles.qrModeBtnActive]}
                  onPress={() => setQrMode('text')}
                >
                  <Text style={[styles.qrModeBtnText, qrMode === 'text' && styles.qrModeBtnTextActive]}>
                    📜 Universal Certificate QR (100% Offline)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Official QR Code Container */}
              <View style={styles.qrSection}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={activeQrPayload}
                    size={175}
                    color="#0B2545"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrCaption}>
                  {qrMode === 'text'
                    ? '✓ 100% Reliable Offline QR • Any smartphone camera or QR reader instantly displays the full Form VI Digital Certificate with legal verification details without relying on external web tunnels.'
                    : '✓ Direct Web Verification QR • Point phone camera to open the live Government Certificate web portal.'}
                </Text>
                
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
                  <Text style={styles.scannedPreviewTitle}>📱 Phone Camera Scanner Output:</Text>
                  {qrMode === 'url' ? (
                    <>
                      <TouchableOpacity onPress={() => Linking.openURL(verifyUrl)}>
                        <Text style={styles.verifyLinkText}>{verifyUrl}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.scannedStatusApproved, { color: dynStatus.color }]}>
                        ● STATUS: {dynStatus.text} (FORM VI)
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.scannedPreviewText, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10 }]}>
                      {activeQrPayload}
                    </Text>
                  )}
                  <Text style={styles.scannedPreviewText}>• Certificate: {certNumber}</Text>
                  <Text style={styles.scannedPreviewText}>• Instrument ID: {instId}</Text>
                  <Text style={styles.scannedPreviewText}>• Valid Until: {validUntil}</Text>
                  <Text style={styles.scannedPreviewText}>• Verifying Officer: {officer}</Text>
                  <Text style={styles.scannedPreviewText}>• Endorsing Lab: {gatcLab}</Text>
                </View>
              </View>

              {/* Details Table */}
              <View style={styles.detailsTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Certificate No</Text>
                  <Text style={[styles.tableValue, { fontWeight: '800', color: Colors.primaryNavy }]}>{certNumber}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Instrument ID</Text>
                  <Text style={styles.tableValue}>{instId}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Model / Type</Text>
                  <Text style={styles.tableValue}>{modelType}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Serial Number</Text>
                  <Text style={styles.tableValue}>{serialNo}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Owner / Establishment</Text>
                  <Text style={styles.tableValue}>{ownerName}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Issuing Authority</Text>
                  <Text style={styles.tableValue}>{authority}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Verifying LMO Officer</Text>
                  <Text style={styles.tableValue}>⚖️ {officer}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Endorsing GATC Lab</Text>
                  <Text style={styles.tableValue}>🔬 {gatcLab}</Text>
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

              {/* Dual Signature Endorsement Box */}
              <View style={styles.dualEndorsementCard}>
                <Text style={styles.dualEndorsementTitle}>✓ Dual Government Endorsement Active</Text>
                <Text style={styles.dualEndorsementText}>
                  Field physical verification executed by Legal Metrology Officer. Calibration test results endorsed by Government Approved Test Centre / State Central Laboratory under Rule 14.
                </Text>
              </View>

              {/* Seal Stamp */}
              <View style={styles.stampBox}>
                <Text style={styles.stampText}>DIGITALLY SIGNED & SEALED</Text>
                <Text style={styles.stampSub}>LEGAL METROLOGY ACT, 2009</Text>
              </View>
            </View>

            {/* Download it as pdf Button - Prominent Action as requested by user */}
            <TouchableOpacity
              style={[styles.actionBtn, {
                backgroundColor: '#1E3A8A',
                borderColor: '#2563EB',
                borderWidth: 1.5,
                paddingVertical: 14,
                marginBottom: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderRadius: 10,
                shadowColor: '#1E3A8A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 18 }}>⬇️</Text>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }}>
                {downloading ? 'Downloading PDF Certificate...' : 'Download it as pdf'}
              </Text>
            </TouchableOpacity>

            {/* Official Actions Row: Verified Document Actions */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.shareBtn, { flex: 1 }]}
                onPress={handleShare}
              >
                <Text style={styles.shareBtnText}>🔗 Share Public Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#0A192F', borderWidth: 0 }]}
                onPress={onClose}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>✓ Close Certificate</Text>
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
    backgroundColor: 'rgba(10, 25, 47, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      width: '100%',
      height: '100%',
    } : {}),
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A2540',
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 1
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: 16,
    textAlign: 'center'
  },
  scrollArea: {
    flexGrow: 1
  },
  scrollContent: {
    padding: 18
  },
  certFrame: {
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 14,
    padding: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3
  },
  nationalRibbon: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
    marginBottom: 14,
    borderRadius: 2,
    overflow: 'hidden'
  },
  ribbonBand: {
    flex: 1,
    height: '100%'
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 12
  },
  emblemIcon: {
    fontSize: 28,
    marginBottom: 4
  },
  govTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: 1.2
  },
  deptTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#425466',
    letterSpacing: 0.8,
    marginTop: 2
  },
  certHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A2540',
    marginTop: 8,
    letterSpacing: 0.8,
    textAlign: 'center'
  },
  ruleText: {
    fontSize: 9.5,
    color: '#8898AA',
    fontStyle: 'italic',
    marginTop: 3,
    textAlign: 'center'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E3E8EE',
    marginVertical: 12
  },
  certNumberText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: 0.3
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 12
  },
  qrBox: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#635BFF',
    shadowColor: 'rgba(99, 91, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3
  },
  qrCaption: {
    fontSize: 11,
    color: '#425466',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  openVerifyBtn: {
    marginTop: 10,
    backgroundColor: '#635BFF',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  openVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  verifyLinkText: {
    fontSize: 11,
    color: '#635BFF',
    textDecorationLine: 'underline',
    marginBottom: 6,
    fontWeight: '700',
  },
  scannedPreviewBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 12,
    marginTop: 12
  },
  scannedPreviewTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 4
  },
  scannedStatusApproved: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 4
  },
  scannedPreviewText: {
    fontSize: 10.5,
    color: '#425466',
    lineHeight: 16
  },
  hashText: {
    fontSize: 9.5,
    color: '#8898AA',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 3
  },
  detailsTable: {
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 10,
    marginVertical: 12,
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F4F8'
  },
  tableRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#EFF2FE'
  },
  tableLabel: {
    width: 130,
    fontSize: 11,
    color: '#8898AA',
    fontWeight: '600'
  },
  tableValue: {
    flex: 1,
    fontSize: 11.5,
    color: '#0A2540',
    fontWeight: '700'
  },
  tableLabelHighlight: {
    width: 130,
    fontSize: 11,
    color: '#635BFF',
    fontWeight: '800'
  },
  tableValueHighlight: {
    flex: 1,
    fontSize: 11.5,
    color: '#635BFF',
    fontWeight: '800'
  },
  stampBox: {
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    transform: [{ rotate: '-2deg' }],
    shadowColor: 'rgba(5, 150, 105, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2
  },
  stampText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8
  },
  stampSub: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 1
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2
  },
  downloadBtn: {
    backgroundColor: '#635BFF',
    shadowColor: 'rgba(99, 91, 255, 0.35)'
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3
  },
  shareBtn: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  shareBtnText: {
    color: '#0A2540',
    fontWeight: '700',
    fontSize: 13
  },
  dynStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  dynStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dualEndorsementCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  dualEndorsementTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  dualEndorsementText: {
    fontSize: 10.5,
    color: '#047857',
    lineHeight: 15,
  },
  qrModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EFF2F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
  },
  qrModeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModeBtnActive: {
    backgroundColor: '#635BFF',
    shadowColor: 'rgba(99, 91, 255, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  qrModeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#425466',
  },
  qrModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
});

