import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { mockInstruments, Instrument } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { calculateVerificationFee } from '../../config/pricing';
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

  // Instruments live state
  const [instruments, setInstruments] = useState<Instrument[]>(() =>
    currentOwnerId === 'OWN-101' ? mockInstruments.filter(i => i.ownerId === 'OWN-101') : []
  );

  const fetchInstruments = useCallback(async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.instruments}?ownerId=${currentOwnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.instruments && Array.isArray(data.instruments)) {
          setInstruments(data.instruments);
        }
      }
    } catch {
      // offline fallback
    }
  }, [currentOwnerId]);

  useEffect(() => {
    fetchInstruments();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInstruments();
    });
    return unsubscribe;
  }, [navigation, fetchInstruments]);

  // Single form state
  const [selectionMode, setSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedInstId, setSelectedInstId] = useState(instruments[0]?.id || 'INST-TS-01');

  // New instrument entry fields
  const [newModel, setNewModel] = useState('Essae Precision Bench Scale');
  const [newSerial, setNewSerial] = useState('SN-2026-7842');
  const [newCategory, setNewCategory] = useState('Non-Automatic Weighing Instrument');
  const [newCapacity, setNewCapacity] = useState('50 kg');
  const [newAccuracyClass, setNewAccuracyClass] = useState('Class III');
  const [newLocation, setNewLocation] = useState(
    activeUser?.address || (activeUser?.district ? `${activeUser.district}, ${activeUser.state || 'Telangana'}` : 'Bowenpally Agricultural Wholesale Yard')
  );

  const [preferredDate, setPreferredDate] = useState('2026-09-18');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('10:00 AM - 01:00 PM');
  const [remarks, setRemarks] = useState('Annual mandatory statutory re-verification');
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [singleSuccess, setSingleSuccess] = useState<any | null>(null);

  // Find selected instrument object
  const selectedInstrument = useMemo(() => {
    return instruments.find(i => i.id === selectedInstId) || instruments[0];
  }, [instruments, selectedInstId]);

  // Dynamically compute fee based on chosen instrument category and accuracy class
  const dynamicFeeBreakdown = useMemo(() => {
    if (selectionMode === 'new') {
      return calculateVerificationFee(newCategory, newAccuracyClass);
    }
    if (!selectedInstrument) {
      return calculateVerificationFee('Non-Automatic Weighing Instrument');
    }
    return calculateVerificationFee(selectedInstrument.category, selectedInstrument.accuracyClass);
  }, [selectionMode, newCategory, newAccuracyClass, selectedInstrument]);

  // Bulk form state
  const [bulkFacilityName, setBulkFacilityName] = useState('Bowenpally Agricultural Wholesale Yard');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>(
    instruments.map(i => i.id)
  );
  const [bulkCategory, setBulkCategory] = useState('Non-Automatic Weighing Instrument');
  const [bulkCountInput, setBulkCountInput] = useState(String(instruments.length || 10));
  const [bulkPreferredDate, setBulkPreferredDate] = useState('2026-09-25');
  const [bulkRemarks, setBulkRemarks] = useState('Bulk pre-procurement weighing verification');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<any | null>(null);

  const toggleSelectBulkItem = (id: string) => {
    if (selectedBulkIds.includes(id)) {
      const next = selectedBulkIds.filter(i => i !== id);
      setSelectedBulkIds(next);
      setBulkCountInput(String(next.length || 1));
    } else {
      const next = [...selectedBulkIds, id];
      setSelectedBulkIds(next);
      setBulkCountInput(String(next.length));
    }
  };

  // Bulk dynamic fee calculation
  const bulkTotalCount = parseInt(bulkCountInput, 10) || 1;
  const bulkUnitFee = useMemo(() => {
    return calculateVerificationFee(bulkCategory);
  }, [bulkCategory]);
  const bulkEstimatedTotal = bulkUnitFee.totalFee * bulkTotalCount;

  // Single Submission
  const handleSingleSubmit = async () => {
    if (selectionMode === 'existing' && !selectedInstrument) {
      Alert.alert('Selection Required', 'Please select an instrument to verify.');
      return;
    }
    if (selectionMode === 'new' && !newModel.trim()) {
      Alert.alert('Model Name Required', 'Please enter the model or equipment name.');
      return;
    }
    if (!preferredDate) {
      Alert.alert('Date Required', 'Please select a preferred inspection date.');
      return;
    }

    setSubmittingSingle(true);

    const payload = selectionMode === 'new' ? {
      instrumentId: 'NEW',
      instrumentName: newModel.trim(),
      serialNumber: newSerial.trim() || `SN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ownerId: currentOwnerId,
      category: newCategory,
      capacity: newCapacity,
      accuracyClass: newAccuracyClass,
      preferredDate,
      preferredTimeSlot,
      location: newLocation,
      remarks
    } : {
      instrumentId: selectedInstrument.id,
      instrumentName: selectedInstrument.model,
      ownerId: currentOwnerId,
      category: selectedInstrument.category,
      capacity: selectedInstrument.capacity,
      accuracyClass: selectedInstrument.accuracyClass || 'Class III',
      preferredDate,
      preferredTimeSlot,
      location: selectedInstrument.location,
      remarks
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
        // Refresh instruments registry immediately
        fetchInstruments();
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Submission Error', errData.error || 'Failed to submit request to database.');
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      Alert.alert(
        'Connection Error',
        'Could not reach Metro Verify backend server on http://localhost:4000. Please ensure server is running.'
      );
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Bulk Submission
  const handleBulkSubmit = async () => {
    if (bulkTotalCount < 1) {
      Alert.alert('Quantity Required', 'Please enter a valid count of instruments for bulk verification.');
      return;
    }

    setSubmittingBulk(true);

    const payload = {
      ownerId: currentOwnerId,
      facilityName: bulkFacilityName,
      category: bulkCategory,
      instrumentCount: bulkTotalCount,
      selectedInstrumentIds: selectedBulkIds,
      district: activeUser?.district || 'Hyderabad North',
      preferredDate: bulkPreferredDate,
      remarks: bulkRemarks
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
      Alert.alert('Connection Error', 'Could not reach Metro Verify backend server on http://localhost:4000.');
    } finally {
      setSubmittingBulk(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="New Verification Request"
        subtitle="Apply for Statutory Stamping & Calibration"
        roleLabel="Owner Actions"
        onSwitchRole={onSwitchRole}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Toggle Mode: Single vs Bulk */}
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
              Single Instrument
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
                Bulk Verification
              </Text>
              <View style={styles.clusterPill}>
                <Text style={styles.clusterPillText}>BATCH</Text>
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
                  <Text style={styles.summaryValStatus}>SCHEDULED IN REGISTRY</Text>
                </View>
                {singleSuccess.ruleReference && (
                  <Text style={styles.summaryRuleText}>⚖️ {singleSuccess.ruleReference}</Text>
                )}
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
              <Text style={styles.formTitle}>Single Verification Form</Text>
              <Text style={styles.formSubtitle}>
                Apply for statutory calibration & stamping for an individual instrument
              </Text>

              {/* Toggle Registered vs New Equipment */}
              <View style={styles.subToggleRow}>
                <TouchableOpacity
                  style={[styles.subToggleChip, selectionMode === 'existing' && styles.subToggleChipActive]}
                  onPress={() => setSelectionMode('existing')}
                >
                  <Text style={[styles.subToggleChipText, selectionMode === 'existing' && styles.subToggleChipTextActive]}>
                    📋 Registered Equipment ({instruments.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subToggleChip, selectionMode === 'new' && styles.subToggleChipActive]}
                  onPress={() => setSelectionMode('new')}
                >
                  <Text style={[styles.subToggleChipText, selectionMode === 'new' && styles.subToggleChipTextActive]}>
                    ➕ Register New Equipment
                  </Text>
                </TouchableOpacity>
              </View>

              {selectionMode === 'existing' ? (
                <>
                  <Text style={styles.inputLabel}>Select Instrument from Your Registry</Text>
                  <View style={styles.instrumentSelector}>
                    {instruments.map(item => {
                      const isSelected = item.id === selectedInstId;
                      const itemFee = calculateVerificationFee(item.category, item.accuracyClass);

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                          onPress={() => setSelectedInstId(item.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.radioCircle}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <View style={styles.selectTextCol}>
                            <View style={styles.optionHeaderRow}>
                              <Text style={[styles.selectOptionTitle, isSelected && styles.textBold]}>
                                {item.model}
                              </Text>
                              <Text style={styles.unitFeeTag}>₹ {itemFee.totalFee.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.optionSubRow}>
                              <View style={styles.idBadgeHighlight}>
                                <Text style={styles.idBadgeIcon}>🏷️</Text>
                                <Text style={styles.idBadgeLabel}>UID:</Text>
                                <Text style={styles.idBadgeValue}>{item.id}</Text>
                              </View>
                              <Text style={styles.selectOptionSub}>
                                {item.category} • Expiry: {item.expiryDate}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                /* New Equipment Input Fields */
                <View style={styles.newEquipmentContainer}>
                  <Text style={styles.inputLabel}>Model / Equipment Make</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newModel}
                    onChangeText={setNewModel}
                    placeholder="e.g. Avery Weigh-Tronix 50T Pitless"
                  />

                  <Text style={styles.inputLabel}>Serial / Machine Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newSerial}
                    onChangeText={setNewSerial}
                    placeholder="e.g. SN-2026-9481"
                  />

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
                        style={[styles.catChip, newCategory === cat && styles.catChipActive]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <Text style={styles.inputLabel}>Capacity</Text>
                      <TextInput
                        style={styles.textInput}
                        value={newCapacity}
                        onChangeText={setNewCapacity}
                        placeholder="e.g. 50 kg or 60 Tonnes"
                      />
                    </View>
                    <View style={styles.colHalf}>
                      <Text style={styles.inputLabel}>Accuracy Class</Text>
                      <View style={styles.classChipsRow}>
                        {['Class II', 'Class III', 'Class IV'].map(cls => (
                          <TouchableOpacity
                            key={cls}
                            style={[styles.classChip, newAccuracyClass === cls && styles.classChipActive]}
                            onPress={() => setNewAccuracyClass(cls)}
                          >
                            <Text style={[styles.classChipText, newAccuracyClass === cls && styles.classChipTextActive]}>
                              {cls}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Physical Premises Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newLocation}
                    onChangeText={setNewLocation}
                    placeholder="e.g. Gate 3, Bowenpally Wholesale Mandi"
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>Preferred Inspection Date</Text>
              <TextInput
                style={styles.textInput}
                value={preferredDate}
                onChangeText={setPreferredDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Preferred Inspection Time Slot</Text>
              <View style={styles.slotRow}>
                {['10:00 AM - 01:00 PM', '02:00 PM - 05:00 PM'].map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotChip, preferredTimeSlot === slot && styles.slotChipActive]}
                    onPress={() => setPreferredTimeSlot(slot)}
                  >
                    <Text style={[styles.slotText, preferredTimeSlot === slot && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Remarks / Special Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={2}
                placeholder="e.g. Weighbridge pit accessible via Gate 2"
              />

              {/* DYNAMIC FEE BREAKDOWN SECTION (Schedule IX) */}
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
                  {submittingSingle ? 'Submitting Application...' : 'Submit Verification Request ›'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          /* ================= BULK FORM & PROGRESS ================= */
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

              {/* Progress Monitor */}
              <View style={styles.progressMonitorBox}>
                <View style={styles.progressMonitorHeader}>
                  <Text style={styles.progressMonitorTitle}>Batch Verification Progress</Text>
                  <Text style={styles.progressMonitorCount}>0 / {bulkSuccess.instrumentCount} Verified</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '0%' }]} />
                </View>
                <Text style={styles.progressMonitorCaption}>Status: PENDING_ALLOCATION</Text>
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Facility:</Text>
                  <Text style={styles.summaryVal}>{bulkFacilityName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Target Date:</Text>
                  <Text style={styles.summaryVal}>{bulkSuccess.preferredDate}</Text>
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
                Request inspection for multiple scales across Mandis, Warehouses, or Supermarkets
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

              <Text style={styles.inputLabel}>Total Quantity of Instruments in Batch</Text>
              <TextInput
                style={styles.textInput}
                value={bulkCountInput}
                onChangeText={setBulkCountInput}
                keyboardType="numeric"
                placeholder="e.g. 15"
              />

              <Text style={styles.inputLabel}>Select Registered Instruments (Optional Checklist)</Text>
              <View style={styles.bulkChecklist}>
                {instruments.map((item: Instrument) => {
                  const isChecked = selectedBulkIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.checkOption, isChecked && styles.checkOptionActive]}
                      onPress={() => toggleSelectBulkItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.checkTextCol}>
                        <Text style={styles.checkTitle}>{item.model}</Text>
                        <View style={styles.optionSubRow}>
                          <View style={styles.idBadgeHighlight}>
                            <Text style={styles.idBadgeIcon}>🏷️</Text>
                            <Text style={styles.idBadgeLabel}>UID:</Text>
                            <Text style={styles.idBadgeValue}>{item.id}</Text>
                          </View>
                          <Text style={styles.checkSub}>• {item.location}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Preferred Date for Bulk Inspection Visit</Text>
              <TextInput
                style={styles.textInput}
                value={bulkPreferredDate}
                onChangeText={setBulkPreferredDate}
                placeholder="YYYY-MM-DD"
              />

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
                  <Text style={styles.feeTitle}>Bulk Fee Calculation</Text>
                  <Text style={styles.feeLawBadge}>{bulkTotalCount} Units</Text>
                </View>
                <Text style={styles.feeRuleDescription}>{bulkUnitFee.ruleReference}</Text>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Statutory Unit Fee</Text>
                  <Text style={styles.feeVal}>₹ {bulkUnitFee.totalFee.toLocaleString('en-IN')} / unit</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRowTotal}>
                  <Text style={styles.feeTotalLabel}>Estimated Total Statutory Challan</Text>
                  <Text style={styles.feeTotalVal}>₹ {bulkEstimatedTotal.toLocaleString('en-IN')}.00</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submittingBulk && styles.btnDisabled]}
                onPress={handleBulkSubmit}
                disabled={submittingBulk}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {submittingBulk ? 'Submitting Bulk Request...' : 'Submit Bulk Verification Request ›'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  toggleTextActive: {
    color: Colors.primaryNavy
  },
  bulkTagRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  clusterPill: {
    backgroundColor: Colors.accentAmber,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6
  },
  clusterPillText: {
    color: Colors.textWhite,
    fontSize: 8,
    fontWeight: '800'
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  formSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.textPrimary
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top'
  },
  instrumentSelector: {
    gap: 8,
    marginBottom: 6
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF'
  },
  selectOptionActive: {
    borderColor: Colors.primaryNavy,
    backgroundColor: '#F0F9FF'
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryNavy
  },
  selectTextCol: {
    flex: 1
  },
  optionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  unitFeeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  textBold: {
    fontWeight: '800',
    color: Colors.primaryNavy
  },
  selectOptionSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8
  },
  slotChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  slotChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  slotText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  slotTextActive: {
    color: Colors.textWhite,
    fontWeight: '700'
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  catPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  catPillActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  catPillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  catPillTextActive: {
    color: Colors.textWhite,
    fontWeight: '700'
  },
  bulkChecklist: {
    gap: 6,
    marginBottom: 6
  },
  checkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF'
  },
  checkOptionActive: {
    borderColor: Colors.primaryNavy,
    backgroundColor: '#F8FAFC'
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  checkboxActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  checkmark: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: 'bold'
  },
  checkTextCol: {
    flex: 1
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  checkSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1
  },
  feeBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginTop: 14,
    marginBottom: 14
  },
  feeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  feeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  feeLawBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primaryNavy,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  feeRuleDescription: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  feeLabel: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  feeVal: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8
  },
  feeRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  feeTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  feeTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857'
  },
  submitBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  btnDisabled: {
    opacity: 0.6
  },
  submitBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    padding: 20,
    alignItems: 'center'
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10
  },
  successIcon: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 14,
    marginRight: 6
  },
  successTitle: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12
  },
  appIdResult: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryNavy,
    marginBottom: 4
  },
  successBatchNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentAmber,
    marginBottom: 6
  },
  successDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16
  },
  progressMonitorBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 14
  },
  progressMonitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  progressMonitorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  progressMonitorCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4
  },
  progressMonitorCaption: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic'
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary
  },
  summaryValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857'
  },
  summaryValStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706'
  },
  summaryRuleText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8
  },
  primaryActionBtn: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryActionText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  secondaryActionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  secondaryActionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  subToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  subToggleChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  subToggleChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  subToggleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  subToggleChipTextActive: {
    color: Colors.textWhite,
    fontWeight: '700'
  },
  optionSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap'
  },
  idBadgeHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3
  },
  idBadgeIcon: {
    fontSize: 10
  },
  idBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5
  },
  idBadgeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5
  },
  newEquipmentContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    gap: 6
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border
  },
  catChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  catChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  catChipTextActive: {
    color: Colors.textWhite,
    fontWeight: '700'
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10
  },
  colHalf: {
    flex: 1
  },
  classChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2
  },
  classChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  classChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  classChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  classChipTextActive: {
    color: Colors.textWhite,
    fontWeight: '700'
  }
});
