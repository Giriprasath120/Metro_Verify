import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  Image
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { Colors } from '../../theme/colors';
import { calculateVerificationFee } from '../../config/pricing';
import { PaymentModal } from '../../components/PaymentModal';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser } from '../../services/authService';

interface NewRequestScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const NewRequestScreen: React.FC<NewRequestScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const currentOwnerId = activeUser?.id || 'OWN-101';

  const [requestMode, setRequestMode] = useState<'single' | 'bulk'>('single');

  // Single form state
  const [model, setModel] = useState('Essae Precision Bench Scale');
  const [serial, setSerial] = useState('SN-2026-7842');
  const [category, setCategory] = useState('Non-Automatic Weighing Instrument');
  const [capacity, setCapacity] = useState('50 kg');
  const [location, setLocation] = useState(
    activeUser?.address || (activeUser?.district ? `${activeUser.district}, ${activeUser.state || 'Tamil Nadu'}` : 'Koyambedu Wholesale Market Complex, Chennai')
  );
  const [remarks, setRemarks] = useState('Annual mandatory statutory re-verification');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [singleSuccess, setSingleSuccess] = useState<any | null>(null);

  // Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pendingPaymentType, setPendingPaymentType] = useState<'single' | 'bulk'>('single');

  // Hidden file input ref for camera / image selection on Web
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerCamera = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      Alert.alert('Camera Capture', 'Camera capture initialized.');
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Dynamically compute statutory fee based on chosen category AND capacity
  const dynamicFeeBreakdown = useMemo(() => {
    return calculateVerificationFee(category, 'Class III', capacity);
  }, [category, capacity]);

  // Bulk form state
  const [bulkFacilityName, setBulkFacilityName] = useState('Koyambedu Wholesale Market Complex, Chennai');
  const [bulkCategory, setBulkCategory] = useState('Non-Automatic Weighing Instrument');
  const [bulkCapacity, setBulkCapacity] = useState('50 kg');
  const [bulkCountInput, setBulkCountInput] = useState('100');
  const [bulkRemarks, setBulkRemarks] = useState('Bulk pre-procurement weighing verification');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<any | null>(null);

  // Bulk dynamic fee calculation based on bulkCategory AND bulkCapacity
  const bulkTotalCount = parseInt(bulkCountInput, 10) || 1;
  const bulkUnitFee = useMemo(() => {
    return calculateVerificationFee(bulkCategory, 'Class III', bulkCapacity);
  }, [bulkCategory, bulkCapacity]);
  const bulkEstimatedTotal = bulkUnitFee.totalFee * bulkTotalCount;

  // Single Submission Trigger: opens Razorpay Payment Portal
  const handleSingleSubmit = () => {
    if (!model.trim()) {
      Alert.alert('Model Name Required', 'Please enter the model or equipment name.');
      return;
    }
    setPendingPaymentType('single');
    setPaymentModalVisible(true);
  };

  // Perform actual API submission after payment verification
  const executeActualSingleSubmit = async (paymentTxId?: string) => {
    setSubmittingSingle(true);
    const autoScheduledDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
    const autoTimeSlot = '10:00 AM - 01:00 PM';

    const payload = {
      instrumentId: 'NEW',
      instrumentName: model.trim(),
      serialNumber: serial.trim() || `SN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ownerId: currentOwnerId,
      category,
      capacity,
      accuracyClass: 'Class III',
      preferredDate: autoScheduledDate,
      preferredTimeSlot: autoTimeSlot,
      location,
      remarks: remarks ? `${remarks} (Paid via Razorpay: ${paymentTxId || 'Verified'})` : `Paid via Razorpay: ${paymentTxId || 'Verified'}`,
      photoUrl: capturedPhoto || undefined,
    };

    try {
      const res = await fetch(API_ENDPOINTS.applications, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSingleSuccess(data.application);
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Submission Error', errData.error || 'Failed to submit request to database.');
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      Alert.alert(
        'Connection Error',
        'Could not reach Metro Verify backend server on http://localhost:4000.'
      );
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Bulk Submission Trigger: opens Razorpay Payment Portal
  const handleBulkSubmit = () => {
    if (bulkTotalCount < 1) {
      Alert.alert('Quantity Required', 'Please enter a valid count of instruments for bulk verification.');
      return;
    }
    setPendingPaymentType('bulk');
    setPaymentModalVisible(true);
  };

  // Perform actual Bulk API submission after payment verification
  const executeActualBulkSubmit = async (paymentTxId?: string) => {
    setSubmittingBulk(true);
    const autoScheduledDate = new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0];

    const payload = {
      ownerId: currentOwnerId,
      facilityName: bulkFacilityName,
      category: `${bulkCategory} (${bulkCapacity})`,
      instrumentCount: bulkTotalCount,
      district: activeUser?.district || 'Chennai North',
      preferredDate: autoScheduledDate,
      remarks: bulkRemarks ? `${bulkRemarks} (Paid via Razorpay: ${paymentTxId || 'Verified'})` : `Paid via Razorpay: ${paymentTxId || 'Verified'}`
    };

    try {
      const res = await fetch(API_ENDPOINTS.bulkRequests, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setBulkSuccess(data.bulkRequest);
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Bulk Submission Error', errData.error || 'Failed to submit bulk request.');
      }
    } catch (err: any) {
      console.error('Bulk submission failed:', err);
      Alert.alert(
        'Connection Error',
        'Could not reach Metro Verify backend server on http://localhost:4000.'
      );
    } finally {
      setSubmittingBulk(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="Verification Application"
        subtitle="Directorate of Legal Metrology • Statutory Service Gateway"
        roleLabel="Service Request"
        onSwitchRole={onSwitchRole}
      />

      {/* Hidden Web Input for Camera Capture */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef as any}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}

      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Mode Segmented Switcher */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, requestMode === 'single' && styles.toggleBtnActive]}
            onPress={() => {
              setRequestMode('single');
              setSingleSuccess(null);
              setBulkSuccess(null);
            }}
          >
            <Text style={[styles.toggleText, requestMode === 'single' && styles.toggleTextActive]}>
              🎯 Single Instrument
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, requestMode === 'bulk' && styles.toggleBtnActive]}
            onPress={() => {
              setRequestMode('bulk');
              setSingleSuccess(null);
              setBulkSuccess(null);
            }}
          >
            <View style={styles.bulkTagRow}>
              <Text style={[styles.toggleText, requestMode === 'bulk' && styles.toggleTextActive]}>
                📦 Bulk Verification
              </Text>
              <View style={styles.clusterPill}>
                <Text style={styles.clusterPillText}>MULTI-UNIT</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {requestMode === 'single' ? (
          /* ================= SINGLE FORM ================= */
          singleSuccess ? (
            /* Single Success Card */
            <View style={styles.successCard}>
              <View style={styles.successBadge}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>APPLICATION SUBMITTED</Text>
              </View>

              <Text style={styles.appIdResult}>{singleSuccess.id}</Text>
              <Text style={styles.successDesc}>
                Your statutory verification application has been recorded in the State Legal Metrology Portal.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Equipment:</Text>
                  <Text style={styles.summaryVal}>{singleSuccess.instrumentName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Assigned Unique ID:</Text>
                  <View style={styles.idBadgeHighlight}>
                    <Text style={styles.idBadgeIcon}>🏷️</Text>
                    <Text style={styles.idBadgeLabel}>UID:</Text>
                    <Text style={styles.idBadgeValue}>{singleSuccess.instrumentId}</Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scheduled Date:</Text>
                  <Text style={styles.summaryVal}>{singleSuccess.preferredDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Statutory Fee:</Text>
                  <Text style={styles.summaryValHighlight}>₹ {singleSuccess.fee?.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Registry Status:</Text>
                  <Text style={[styles.summaryValStatus, { color: '#D97706', backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                    SUBMITTED (Awaiting Officer Allocation)
                  </Text>
                </View>
                <View style={{ marginTop: 12, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Text style={{ fontSize: 11, color: '#1E40AF', lineHeight: 16 }}>
                    ℹ️ <Text style={{ fontWeight: '700' }}>Next Step:</Text> Your application is waiting in the Department administrative queue. The Admin will allocate a field Legal Metrology Officer (LMO). You will receive an official notification with the assigned officer details once allocated.
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtonsCol}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => navigation.navigate('Dashboard')}
                >
                  <Text style={styles.primaryActionText}>View on Owner Dashboard ›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => setSingleSuccess(null)}
                >
                  <Text style={styles.secondaryActionText}>Submit Another Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Single Input Form */
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <View>
                  <Text style={styles.formTitle}>Single Instrument Verification</Text>
                  <Text style={styles.formSubtitle}>
                    Apply for statutory calibration & stamping for an individual instrument
                  </Text>
                </View>
              </View>

              {/* Equipment Model Name */}
              <Text style={styles.inputLabel}>Model / Equipment Make</Text>
              <TextInput
                style={styles.textInput}
                value={model}
                onChangeText={setModel}
                placeholder="e.g. Essae Precision Bench Scale"
              />

              {/* Serial Number */}
              <Text style={styles.inputLabel}>Serial / Machine Number</Text>
              <TextInput
                style={styles.textInput}
                value={serial}
                onChangeText={setSerial}
                placeholder="e.g. SN-2026-7842"
              />

              {/* Category Chips */}
              <Text style={styles.inputLabel}>Instrument Category</Text>
              <View style={styles.categoryChipsGrid}>
                {[
                  'Non-Automatic Weighing Instrument',
                  'Electronic Weighbridge',
                  'Fuel Dispenser / Flow Meter',
                  'Automatic Gravimetric Filling Instrument'
                ].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && styles.catChipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Capacity & Location */}
              <Text style={styles.inputLabel}>Capacity</Text>
              <TextInput
                style={styles.textInput}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 50 kg or 60 Tonnes"
              />

              <Text style={styles.inputLabel}>Physical Premises Location</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Koyambedu Wholesale Market Complex, Chennai"
              />

              {/* CAMERA / PHOTO CAPTURE FEATURE */}
              <Text style={styles.inputLabel}>Instrument Physical Photo (Statutory Record)</Text>
              {capturedPhoto ? (
                <View style={styles.photoPreviewCard}>
                  <Image
                    source={{ uri: capturedPhoto }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  {/* Official Metrology Stamp Overlay */}
                  <View style={styles.photoStampOverlay}>
                    <View style={styles.stampHeader}>
                      <Text style={styles.stampIcon}>🏛️</Text>
                      <Text style={styles.stampTitle}>LEGAL METROLOGY ACT - REGISTERED EQUIPMENT PHOTO</Text>
                    </View>
                    <Text style={styles.stampMeta}>Model: {model} • SN: {serial}</Text>
                    <Text style={styles.stampTime}>Timestamp: {new Date().toLocaleDateString('en-IN')} • Verified Secure</Text>
                  </View>

                  <View style={styles.photoActionRow}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={handleTriggerCamera}>
                      <Text style={styles.retakeBtnText}>📸 Retake Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setCapturedPhoto(null)}>
                      <Text style={styles.removePhotoBtnText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraCaptureBox}
                  onPress={handleTriggerCamera}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>📷</Text>
                  <Text style={styles.cameraBoxTitle}>Capture Equipment Photo</Text>
                  <Text style={styles.cameraBoxSub}>
                    Tap to use device camera or upload image of the measuring instrument for statutory verification records
                  </Text>
                </TouchableOpacity>
              )}

              {/* Remarks */}
              <Text style={styles.inputLabel}>Remarks / Special Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={2}
                placeholder="e.g. Scale is accessible at counter 4"
              />

              {/* DYNAMIC FEE BREAKDOWN */}
              <View style={styles.feeBreakdownBox}>
                <View style={styles.feeHeaderRow}>
                  <Text style={styles.feeTitle}>Statutory Fee Schedule (Dynamic)</Text>
                  <Text style={styles.feeLawBadge}>Schedule IX</Text>
                </View>
                <Text style={styles.feeRuleDescription}>
                  {dynamicFeeBreakdown.ruleReference}
                </Text>

                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Statutory Verification Fee</Text>
                  <Text style={styles.feeVal}>₹ {dynamicFeeBreakdown.statutoryFee.toLocaleString('en-IN')}.00</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Test Standard & Haulage Surcharge</Text>
                  <Text style={styles.feeVal}>₹ {dynamicFeeBreakdown.haulageFee.toLocaleString('en-IN')}.00</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRowTotal}>
                  <Text style={styles.feeTotalLabel}>Total Challan Amount</Text>
                  <Text style={styles.feeTotalVal}>₹ {dynamicFeeBreakdown.totalFee.toLocaleString('en-IN')}.00</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submittingSingle && styles.btnDisabled]}
                onPress={handleSingleSubmit}
                disabled={submittingSingle}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {submittingSingle ? 'Submitting Application...' : `Proceed to Pay ₹${dynamicFeeBreakdown.totalFee.toLocaleString('en-IN')} via Razorpay ›`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* ================= BULK FORM ================= */
          bulkSuccess ? (
            /* Bulk Success Card */
            <View style={styles.successCard}>
              <View style={styles.successBadge}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>BULK BATCH REGISTERED</Text>
              </View>

              <Text style={styles.appIdResult}>{bulkSuccess.id}</Text>
              <Text style={styles.successBatchNumber}>Batch Code: {bulkSuccess.bulkBatchNumber}</Text>
              <Text style={styles.successDesc}>
                Bulk verification request for {bulkSuccess.instrumentCount} instruments recorded.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Facility:</Text>
                  <Text style={styles.summaryVal}>{bulkFacilityName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Quantity:</Text>
                  <Text style={styles.summaryValHighlight}>{bulkSuccess.instrumentCount} Units</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Estimated Fee:</Text>
                  <Text style={styles.summaryValHighlight}>
                    ₹ {bulkSuccess.estimatedFee?.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtonsCol}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => navigation.navigate('Dashboard')}
                >
                  <Text style={styles.primaryActionText}>View on Owner Dashboard ›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => setBulkSuccess(null)}
                >
                  <Text style={styles.secondaryActionText}>Submit Another Bulk Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Bulk Input Form */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Bulk Verification Submission</Text>
              <Text style={styles.formSubtitle}>
                Request parallel inspection for multiple scales across Mandis, Warehouses, or Supermarkets
              </Text>

              <Text style={styles.inputLabel}>Facility / Premises Location</Text>
              <TextInput
                style={styles.textInput}
                value={bulkFacilityName}
                onChangeText={setBulkFacilityName}
                placeholder="Facility or Market Yard Name"
              />

              <Text style={styles.inputLabel}>Equipment Category for Batch</Text>
              <View style={styles.categoryPillsRow}>
                {[
                  'Non-Automatic Weighing Instrument',
                  'Electronic Weighbridge',
                  'Flow Meter',
                  'Weights of All Categories'
                ].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, bulkCategory === cat && styles.catPillActive]}
                    onPress={() => setBulkCategory(cat)}
                  >
                    <Text style={[styles.catPillText, bulkCategory === cat && styles.catPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Batch Instrument Nominal Capacity</Text>
              <TextInput
                style={styles.textInput}
                value={bulkCapacity}
                onChangeText={setBulkCapacity}
                placeholder="e.g. 50 kg, 500 kg, or 60 Tonnes"
              />

              <Text style={styles.inputLabel}>Total Quantity of Instruments in Batch</Text>
              <TextInput
                style={styles.textInput}
                value={bulkCountInput}
                onChangeText={setBulkCountInput}
                keyboardType="numeric"
                placeholder="e.g. 250 (up to 5,000 units)"
              />

              {/* Quick Count Selection Chips */}
              <View style={styles.quickCountRow}>
                <Text style={styles.quickCountLabel}>Quick Fleet Size:</Text>
                {[25, 50, 100, 250, 500, 1000].map(qty => (
                  <TouchableOpacity
                    key={qty}
                    style={[styles.quickCountChip, bulkCountInput === String(qty) && styles.quickCountChipActive]}
                    onPress={() => setBulkCountInput(String(qty))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickCountText, bulkCountInput === String(qty) && styles.quickCountTextActive]}>
                      {qty} Units
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Batch Notes / Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bulkRemarks}
                onChangeText={setBulkRemarks}
                multiline
                numberOfLines={2}
                placeholder="Instructions for testing officer team"
              />

              {/* Dynamic Bulk Fee Box */}
              <View style={styles.feeBreakdownBox}>
                <View style={styles.feeHeaderRow}>
                  <Text style={styles.feeTitle}>Bulk Fee Calculation (Dynamic)</Text>
                  <Text style={styles.feeLawBadge}>{bulkTotalCount} Units Total</Text>
                </View>
                <Text style={styles.feeRuleDescription}>{bulkUnitFee.ruleReference}</Text>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Statutory Unit Fee ({bulkCapacity})</Text>
                  <Text style={styles.feeVal}>₹ {bulkUnitFee.totalFee.toLocaleString('en-IN')} / unit</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Base Verification (per machine)</Text>
                  <Text style={styles.feeVal}>₹ {bulkUnitFee.statutoryFee.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Haulage / Standards Surcharge</Text>
                  <Text style={styles.feeVal}>₹ {bulkUnitFee.haulageFee.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRowTotal}>
                  <Text style={styles.feeTotalLabel}>Total Estimated Statutory Challan</Text>
                  <Text style={styles.feeTotalVal}>₹ {bulkEstimatedTotal.toLocaleString('en-IN')}.00</Text>
                </View>

                {/* Multi-Officer Allocation Note */}
                <View style={styles.fleetAllocationNoteBox}>
                  <Text style={styles.fleetAllocationNoteText}>
                    ⚡ <Text style={{ fontWeight: '800' }}>Smart Fleet Division:</Text> Upon submission, admin will auto-split these {bulkTotalCount} machines evenly across the 4 active Legal Metrology Officers (approx. {Math.ceil(bulkTotalCount / 4)} units each) for simultaneous field testing.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submittingBulk && styles.btnDisabled]}
                onPress={handleBulkSubmit}
                disabled={submittingBulk}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {submittingBulk ? 'Submitting Bulk Request...' : `Proceed to Pay ₹${bulkEstimatedTotal.toLocaleString('en-IN')} via Razorpay ›`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>

      {/* Razorpay / UPI Statutory Fee Payment Modal */}
      <PaymentModal
        visible={paymentModalVisible}
        amount={pendingPaymentType === 'single' ? dynamicFeeBreakdown.totalFee : bulkEstimatedTotal}
        purpose={
          pendingPaymentType === 'single'
            ? `Statutory Verification: ${model} (${capacity})`
            : `Bulk Verification Challan: ${bulkTotalCount} Units (${bulkCategory}, ${bulkCapacity})`
        }
        applicantName={activeUser?.name || 'Authorized Instrument Owner'}
        onPaymentSuccess={(txId) => {
          setPaymentModalVisible(false);
          if (pendingPaymentType === 'single') {
            executeActualSingleSubmit(txId);
          } else {
            executeActualBulkSubmit(txId);
          }
        }}
        onClose={() => setPaymentModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FC'
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center'
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFF2F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  toggleBtnActive: {
    backgroundColor: '#635BFF',
    shadowColor: 'rgba(99, 91, 255, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#425466'
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  bulkTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  clusterPill: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DFE5FE'
  },
  clusterPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#635BFF'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2
  },
  formHeaderRow: {
    marginBottom: 16
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540'
  },
  formSubtitle: {
    fontSize: 12,
    color: '#425466',
    marginTop: 2
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A2540',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0A2540'
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top'
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  catChip: {
    backgroundColor: '#F6F9FC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  catChipActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF'
  },
  catChipText: {
    fontSize: 11,
    color: '#425466',
    fontWeight: '600'
  },
  catChipTextActive: {
    color: '#FFFFFF'
  },
  cameraCaptureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#635BFF',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  cameraBoxTitle: {
    color: '#0A2540',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraBoxSub: {
    color: '#8898AA',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 380,
  },
  photoPreviewCard: {
    backgroundColor: '#0A2540',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E8EE',
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  photoStampOverlay: {
    backgroundColor: 'rgba(10, 37, 64, 0.92)',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E3A8A',
  },
  stampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stampIcon: {
    fontSize: 12,
  },
  stampTitle: {
    color: '#00D4FF',
    fontSize: 10,
    fontWeight: '800',
  },
  stampMeta: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  stampTime: {
    color: '#8898AA',
    fontSize: 10,
    marginTop: 2,
  },
  photoActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#0A2540',
  },
  retakeBtn: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  removePhotoBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  feeBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 16,
    marginTop: 18,
  },
  feeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  feeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: 0.2
  },
  feeLawBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#635BFF',
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#DFE5FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6
  },
  feeRuleDescription: {
    fontSize: 10.5,
    color: '#425466',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  feeLabel: {
    fontSize: 11.5,
    color: '#425466',
    fontWeight: '500'
  },
  feeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A2540'
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E3E8EE',
    marginVertical: 10
  },
  feeRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  feeTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540'
  },
  feeTotalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#635BFF'
  },
  submitBtn: {
    backgroundColor: '#635BFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  btnDisabled: {
    opacity: 0.6
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12
  },
  successIcon: {
    color: '#059669',
    fontWeight: '900',
    marginRight: 6
  },
  successTitle: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 12
  },
  appIdResult: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 6
  },
  successBatchNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#635BFF',
    marginBottom: 6
  },
  successDesc: {
    fontSize: 12,
    color: '#425466',
    textAlign: 'center',
    marginBottom: 16
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4
  },
  summaryLabel: {
    fontSize: 11,
    color: '#425466'
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A2540'
  },
  summaryValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#635BFF'
  },
  summaryValStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  idBadgeHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#635BFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4
  },
  idBadgeIcon: {
    fontSize: 10
  },
  idBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#635BFF'
  },
  idBadgeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A2540',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8
  },
  primaryActionBtn: {
    backgroundColor: '#635BFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  secondaryActionBtn: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  secondaryActionText: {
    color: '#0A2540',
    fontWeight: '600',
    fontSize: 13
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  catPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  catPillActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF'
  },
  catPillText: {
    fontSize: 11,
    color: '#425466',
    fontWeight: '600'
  },
  catPillTextActive: {
    color: '#FFFFFF'
  },
  quickCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8
  },
  quickCountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#425466'
  },
  quickCountChip: {
    backgroundColor: '#F6F9FC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8EE'
  },
  quickCountChipActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF'
  },
  quickCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#425466'
  },
  quickCountTextActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  fleetAllocationNoteBox: {
    backgroundColor: '#EFF2FE',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DFE5FE'
  },
  fleetAllocationNoteText: {
    fontSize: 10.5,
    color: '#635BFF',
    lineHeight: 15
  }
});
