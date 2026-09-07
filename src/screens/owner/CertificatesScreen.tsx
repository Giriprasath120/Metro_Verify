import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { CertificateModal } from '../../components/CertificateModal';
import { mockCertificates, Certificate, mockInstruments } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser } from '../../services/authService';

interface CertificatesScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const CertificatesScreen: React.FC<CertificatesScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const currentOwnerId = activeUser?.id || 'OWN-101';

  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificatesList, setCertificatesList] = useState<Certificate[]>(() => {
    const defaultCerts = mockCertificates.filter(c => c.ownerId === currentOwnerId);
    return defaultCerts.length > 0 ? defaultCerts : mockCertificates.slice(0, 2);
  });

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.certificates}?ownerId=${currentOwnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.certificates) && data.certificates.length > 0) {
          // Map DB certificates to component interface
          const mapped = data.certificates.map((c: any) => ({
            id: c.id,
            certificateNumber: c.certificateNumber,
            instrumentId: c.instrumentId,
            ownerId: c.ownerId,
            issuedDate: c.issueDate,
            validUntil: c.validUntil,
            issuingAuthority: 'Directorate of Legal Metrology, Government of Tamil Nadu',
            officerName: c.officerName || 'Legal Metrology Officer',
            verificationStandard: 'Legal Metrology Act, 2009 (Rule 14)',
            verificationFee: '₹500',
            securityHash: c.id,
            qrPayload: c.qrCodeData,
            status: c.status === 'ACTIVE' ? 'Active' : (c.status === 'EXPIRED' ? 'Expired' : 'Expiring Soon'),
            gatcLabName: c.gatcLabName || 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
            gatcApproved: c.gatcApproved !== undefined ? Boolean(c.gatcApproved) : true,
            gatcApprovalDate: c.gatcApprovalDate || c.issueDate,
            instrumentType: c.instrument?.model || c.instrumentType || 'Weighing/Measuring Instrument',
          }));
          setCertificatesList(mapped);
        } else {
          // Fallback to local mocks matching current owner or default
          const fallback = mockCertificates.filter(c => c.ownerId === currentOwnerId);
          setCertificatesList(fallback.length > 0 ? fallback : mockCertificates.slice(0, 3));
        }
      } else {
        const fallback = mockCertificates.filter(c => c.ownerId === currentOwnerId);
        setCertificatesList(fallback.length > 0 ? fallback : mockCertificates.slice(0, 3));
      }
    } catch {
      // offline fallback
      const fallback = mockCertificates.filter(c => c.ownerId === currentOwnerId);
      setCertificatesList(fallback.length > 0 ? fallback : mockCertificates.slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCertificates();
    const unsub = navigation.addListener('focus', fetchCertificates);
    return unsub;
  }, [navigation, currentOwnerId]);

  const myCertificates = certificatesList;

  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  const handleDownloadPdf = async (cert: Certificate) => {
    setDownloadingId(cert.id);
    const pdfUrl = API_ENDPOINTS.certificatePdf(cert.id);
    const safeNumber = cert.certificateNumber.replace(/[\/\\:]/g, '-');
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

        setDownloadNotification(`✓ Certificate #${cert.certificateNumber} downloaded successfully!`);
        setTimeout(() => setDownloadNotification(null), 5000);
      } else {
        await Linking.openURL(pdfUrl);
        setDownloadNotification(`✓ Certificate #${cert.certificateNumber} opened for download.`);
        setTimeout(() => setDownloadNotification(null), 5000);
      }
    } catch (err: any) {
      Alert.alert(
        'PDF Download Failed',
        `Could not retrieve certificate file: ${err.message || 'Network error'}. Please check if the backend server is running.`
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Digital Certificates"
        subtitle="Verifiable Legal Verification Documents (Form VI)"
        roleLabel="Issued Certificates"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Instant Download Success Notification */}
        {downloadNotification && (
          <View style={{
            backgroundColor: '#DCFCE7',
            borderColor: '#86EFAC',
            borderWidth: 1.5,
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
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
        {/* Banner Explaining Statutory Certificate vs Digital Passport */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeIcon}>📜</Text>
          <View style={styles.noticeTextCol}>
            <Text style={styles.noticeTitle}>Statutory Verification Certificates</Text>
            <Text style={styles.noticeDesc}>
              Certificates certify a specific verification event under Rule 14, Legal Metrology (General) Rules, 2011. Each document is verified by Field LMO and endorsed by GATC Central Testing Lab with authentic QR codes.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>
            Issued Digital Certificates ({myCertificates.length})
          </Text>
        </View>

        {myCertificates.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>📜</Text>
            </View>
            <Text style={styles.emptyTitle}>No certificates available yet.</Text>
            <Text style={styles.emptySubtitle}>
              When your weighing or measuring instruments are inspected and certified by the Legal Metrology Officer (LMO) and endorsed by GATC Central Lab, your official Form VI certificates will appear here.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => navigation.navigate('NewRequest')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>+ Apply for Verification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.certList}>
            {myCertificates.map(cert => {
              const instrument = mockInstruments.find(i => i.id === cert.instrumentId);
              const instType = (cert as any).instrumentType || instrument?.model || 'Commercial Scale';

              return (
                <View key={cert.id} style={styles.certCard}>
                  {/* Header Row */}
                  <View style={styles.certHeaderRow}>
                    <View style={styles.certEmblemBox}>
                      <Text style={styles.certEmblem}>🏛️</Text>
                    </View>
                    <View style={styles.certTitleInfo}>
                      <Text style={styles.certNumber}>{cert.certificateNumber}</Text>
                      <Text style={styles.instrumentDesc}>
                        {instType} ({cert.instrumentId})
                      </Text>
                    </View>
                    <StatusBadge status={cert.status} size="sm" />
                  </View>

                  {/* GATC Laboratory Endorsement Badge */}
                  <View style={styles.gatcEndorsedBadgeRow}>
                    <Text style={styles.gatcEndorsedBadgeText}>
                      🔬 GATC CENTRAL LAB ENDORSED • FORM VI
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Metadata details */}
                  <View style={styles.certBody}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Certificate No:</Text>
                      <Text style={styles.infoValue}>{cert.certificateNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Instrument ID:</Text>
                      <Text style={styles.infoValue}>{cert.instrumentId}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Instrument Type:</Text>
                      <Text style={styles.infoValue}>{instType}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Issue Date:</Text>
                      <Text style={styles.infoValue}>{cert.issuedDate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Valid Until:</Text>
                      <Text style={[styles.infoValue, { fontWeight: '700', color: Colors.primaryNavy }]}>
                        {cert.validUntil}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Verifying LMO:</Text>
                      <Text style={styles.infoValue}>⚖️ {cert.officerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Endorsing Lab:</Text>
                      <Text style={styles.infoValue}>🔬 {(cert as any).gatcLabName || 'Tamil Nadu State Central Metrology Lab'}</Text>
                    </View>
                  </View>

                  {/* Primary Action: View & Generate Official Form VI Digital Certificate & QR */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.viewCertBtn}
                      onPress={() => setSelectedCert(cert)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewCertBtnText}>View & Generate Certificate ›</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Single Certificate Modal with Embedded QR Code */}
      <CertificateModal
        visible={Boolean(selectedCert)}
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
      />
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
  noticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16
  },
  noticeIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2
  },
  noticeTextCol: {
    flex: 1
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A'
  },
  noticeDesc: {
    fontSize: 11,
    color: '#2563EB',
    marginTop: 2,
    lineHeight: 15
  },
  sectionHeader: {
    marginBottom: 10
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  certList: {
    gap: 12
  },
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  certEmblemBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  certEmblem: {
    fontSize: 22
  },
  certTitleInfo: {
    flex: 1
  },
  certNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A192F',
    letterSpacing: 0.3
  },
  instrumentDesc: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12
  },
  certBody: {
    gap: 6
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoLabel: {
    width: 120,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  infoValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A'
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  viewCertBtn: {
    flex: 1,
    backgroundColor: '#0A192F',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  viewCertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  downloadPdfBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  downloadPdfBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700'
  },
  gatcEndorsedBadgeRow: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  gatcEndorsedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.3,
  },
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 20,
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  emptyActionBtn: {
    backgroundColor: '#0A192F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
