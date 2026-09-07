import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';

interface PaymentModalProps {
  visible: boolean;
  amount: number;
  purpose: string;
  applicantName: string;
  orderId?: string;
  onPaymentSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  amount,
  purpose,
  applicantName,
  orderId = `ORD-PAY-${Math.floor(100000 + Math.random() * 900000)}`,
  onPaymentSuccess,
  onClose
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txId, setTxId] = useState('');

  const handlePayNow = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const generatedTx = `pay_rzp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      setTxId(generatedTx);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        onPaymentSuccess(generatedTx);
      }, 1400);
    }, 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Razorpay Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.brandRow}>
              <View style={styles.rzpBadge}>
                <Text style={styles.rzpBadgeText}>Razorpay</Text>
              </View>
              <Text style={styles.securedText}>🔒 256-Bit Encrypted Statutory Gateway</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount and Beneficiary */}
          <View style={styles.challanSummaryBox}>
            <Text style={styles.govTitle}>GOVERNMENT OF TAMIL NADU • LEGAL METROLOGY</Text>
            <Text style={styles.challanPurpose}>{purpose}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <Text style={styles.amountValue}>{amount.toLocaleString('en-IN')}</Text>
              <Text style={styles.amountDecimal}>.00</Text>
            </View>
            <Text style={styles.challanMeta}>Challan Order: {orderId} • Applicant: {applicantName}</Text>
          </View>

          {paymentSuccess ? (
            <View style={styles.successStateBox}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successHeading}>Payment Successful!</Text>
              <Text style={styles.successSub}>Official Statutory Challan Receipt Generated</Text>
              <Text style={styles.txText}>Transaction ID: {txId}</Text>
              <ActivityIndicator color="#10B981" style={{ marginTop: 12 }} />
            </View>
          ) : (
            <>
              {/* Payment Method Selector */}
              <View style={styles.methodTabs}>
                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'upi' && styles.methodTabActive]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <Text style={[styles.methodTabText, paymentMethod === 'upi' && styles.methodTabTextActive]}>
                    ⚡ UPI / QR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'card' && styles.methodTabActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Text style={[styles.methodTabText, paymentMethod === 'card' && styles.methodTabTextActive]}>
                    💳 Cards
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'netbanking' && styles.methodTabActive]}
                  onPress={() => setPaymentMethod('netbanking')}
                >
                  <Text style={[styles.methodTabText, paymentMethod === 'netbanking' && styles.methodTabTextActive]}>
                    🏦 Net Banking
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'upi' && (
                <View style={styles.upiContainer}>
                  <Text style={styles.sectionLabel}>Select Preferred UPI App</Text>
                  <View style={styles.upiGrid}>
                    {[
                      { id: 'gpay', label: 'Google Pay', icon: '🔵' },
                      { id: 'phonepe', label: 'PhonePe', icon: '🟣' },
                      { id: 'paytm', label: 'Paytm UPI', icon: '🔷' },
                      { id: 'bhim', label: 'BHIM UPI', icon: '🇮🇳' },
                    ].map((app) => (
                      <TouchableOpacity
                        key={app.id}
                        style={[
                          styles.upiOptionCard,
                          selectedUpiApp === app.id && styles.upiOptionCardSelected
                        ]}
                        onPress={() => setSelectedUpiApp(app.id as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 24, marginBottom: 4 }}>{app.icon}</Text>
                        <Text style={[styles.upiAppText, selectedUpiApp === app.id && styles.upiAppTextActive]}>
                          {app.label}
                        </Text>
                        {selectedUpiApp === app.id && <View style={styles.checkDot} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {paymentMethod === 'card' && (
                <View style={styles.mockFormBox}>
                  <Text style={styles.sectionLabel}>Debit / Credit Card</Text>
                  <View style={styles.mockInput}>
                    <Text style={styles.mockInputText}>4532 •••• •••• 8821  (Visa / RuPay)</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={[styles.mockInput, { flex: 1 }]}>
                      <Text style={styles.mockInputText}>09 / 28</Text>
                    </View>
                    <View style={[styles.mockInput, { flex: 1 }]}>
                      <Text style={styles.mockInputText}>CVV: •••</Text>
                    </View>
                  </View>
                </View>
              )}

              {paymentMethod === 'netbanking' && (
                <View style={styles.mockFormBox}>
                  <Text style={styles.sectionLabel}>Popular Banks (Direct e-Treasury)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Canara Bank'].map((b) => (
                      <View key={b} style={styles.bankChip}>
                        <Text style={styles.bankChipText}>🏛️ {b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Pay Button */}
              <TouchableOpacity
                style={[styles.paySubmitBtn, processing && { opacity: 0.7 }]}
                onPress={handlePayNow}
                disabled={processing}
                activeOpacity={0.85}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.paySubmitBtnText}>
                    Pay ₹{amount.toLocaleString('en-IN')}.00 via Razorpay ›
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.footerNote}>
            Direct Treasury Credit • Cyber Treasury Portal, Finance Dept.
          </Text>
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
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rzpBadge: {
    backgroundColor: '#0C2340',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  rzpBadgeText: {
    color: '#00BAF2',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5
  },
  securedText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  closeBtn: {
    padding: 4
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700'
  },
  challanSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  govTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.6,
    marginBottom: 4
  },
  challanPurpose: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B2545',
    marginRight: 2
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B2545'
  },
  amountDecimal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B'
  },
  challanMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14
  },
  methodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  methodTabTextActive: {
    color: '#0B2545',
    fontWeight: '700'
  },
  upiContainer: {
    marginBottom: 16
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8
  },
  upiGrid: {
    flexDirection: 'row',
    gap: 8
  },
  upiOptionCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative'
  },
  upiOptionCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF'
  },
  upiAppText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569'
  },
  upiAppTextActive: {
    color: '#0369A1',
    fontWeight: '700'
  },
  checkDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284C7'
  },
  mockFormBox: {
    marginBottom: 16
  },
  mockInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10
  },
  mockInputText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500'
  },
  bankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9'
  },
  bankChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600'
  },
  paySubmitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6
  },
  paySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  successStateBox: {
    alignItems: 'center',
    paddingVertical: 20
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 10
  },
  successHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
    marginBottom: 4
  },
  successSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6
  },
  txText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  footerNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12
  }
});
