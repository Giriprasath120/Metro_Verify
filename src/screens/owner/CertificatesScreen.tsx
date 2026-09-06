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
  const [certificatesList, setCertificatesList] = useState<Certificate[]>(() =>
    currentOwnerId === 'OWN-101' ? mockCertificates.filter(c => c.ownerId === 'OWN-101') : []
  );

  const fetchCertificates = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.certificates}?ownerId=${currentOwnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.certificates)) {
          // Map DB certificates to component interface
          const mapped = data.certificates.map((c: any) => ({
            id: c.id,
            certificateNumber: c.certificateNumber,
            instrumentId: c.instrumentId,
            ownerId: c.ownerId,
            issuedDate: c.issueDate,
            validUntil: c.validUntil,
            issuingAuthority: 'Directorate of Legal Metrology, Government of Telangana',
            officerName: c.officerName,
            verificationStandard: 'Legal Metrology Act, 2009 (Rule 14)',
            verificationFee: '₹500',
            securityHash: c.id,
            qrPayload: c.qrCodeData,
            status: c.status === 'ACTIVE' ? 'Active' : 'Expired',
          }));
          setCertificatesList(mapped);
        }
      }
    } catch {
      // offline fallback
    }
  };

  React.useEffect(() => {
    fetchCertificates();
    const unsub = navigation.addListener('focus', fetchCertificates);
    return unsub;
  }, [navigation, currentOwnerId]);

  const myCertificates = certificatesList;

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
      } else {
        await Linking.openURL(pdfUrl);
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
        {/* Banner Explaining Statutory Certificate vs Digital Passport */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeIcon}>📜</Text>
          <View style={styles.noticeTextCol}>
            <Text style={styles.noticeTitle}>Statutory Verification Certificates</Text>
            <Text style={styles.noticeDesc}>
              Certificates certify a specific verification event under Rule 14, Legal Metrology (General) Rules, 2011. Each document contains an authentic QR code for field officer inspection.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>
            Issued Digital Certificates ({myCertificates.length})
          </Text>
        </View>

        <View style={styles.certList}>
          {myCertificates.map(cert => {
            const instrument = mockInstruments.find(i => i.id === cert.instrumentId);

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
                      {instrument?.model || cert.instrumentId} ({cert.instrumentId})
                    </Text>
                  </View>
                  <StatusBadge status={cert.status} size="sm" />
                </View>

                <View style={styles.divider} />

                {/* Metadata details */}
                <View style={styles.certBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Issuing Authority:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {cert.issuingAuthority}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Standard Rule:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {cert.verificationStandard}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Verifying Officer:</Text>
                    <Text style={styles.infoValue}>{cert.officerName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Validity Period:</Text>
                    <Text style={[styles.infoValue, { fontWeight: '700', color: Colors.primaryNavy }]}>
                      {cert.issuedDate} to {cert.validUntil}
                    </Text>
                  </View>
                </View>

                {/* Single Action: View Certificate (PDF download available inside viewer) */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewCertBtn}
                    onPress={() => setSelectedCert(cert)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewCertBtnText}>View Certificate (Form VI) ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
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
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  certEmblemBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  certEmblem: {
    fontSize: 20
  },
  certTitleInfo: {
    flex: 1
  },
  certNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  instrumentDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10
  },
  certBody: {
    gap: 4
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoLabel: {
    width: 115,
    fontSize: 11,
    color: Colors.textMuted
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  viewCertBtn: {
    flex: 1,
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewCertBtnText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700'
  },
  downloadPdfBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  downloadPdfBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  }
});
