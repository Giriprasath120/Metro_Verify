import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { loginUser, registerUser, UserRole, UserProfile } from '../../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (role: 'owner' | 'officer' | 'admin', user: UserProfile) => void;
}

type AuthMode = 'login' | 'register';
type SelectedRole = 'owner' | 'officer' | 'gatc' | 'admin';

const DEMO_ACCOUNTS = [
  { label: '🏪 Owner (Rajesh Kumar)', role: 'owner' as SelectedRole, id: 'OWN-101', name: 'Rajesh Kumar' },
  { label: '🏪 Owner (Giriprasath B)', role: 'owner' as SelectedRole, id: 'OWN-483', name: 'Giriprasath B' },
  { label: '⚖️ LMO-101 (V. Ramanathan)', role: 'officer' as SelectedRole, id: 'LMO-101', name: 'V. Ramanathan' },
  { label: '⚖️ LMO-102 (Sunita Rao)', role: 'officer' as SelectedRole, id: 'LMO-102', name: 'Sunita Rao' },
  { label: '⚖️ LMO-103 (A. Kumar)', role: 'officer' as SelectedRole, id: 'LMO-103', name: 'A. Kumar' },
  { label: '⚖️ LMO-104 (K. Priya)', role: 'officer' as SelectedRole, id: 'LMO-104', name: 'K. Priya' },
  { label: '🔬 GATC-01 (State Lab)', role: 'gatc' as SelectedRole, id: 'GATC-01', name: 'State Central Lab' },
  { label: '🏛️ State Admin', role: 'admin' as SelectedRole, id: 'ADMIN-101', name: 'Controller Admin' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('owner');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('OWN-101');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regState, setRegState] = useState('Tamil Nadu');
  const [regDistrict, setRegDistrict] = useState('Chennai');
  const [regAddress, setRegAddress] = useState('');
  const [regBadge, setRegBadge] = useState('');
  const [regPassword, setRegPassword] = useState('password123');
  const [regConfirmPassword, setRegConfirmPassword] = useState('password123');

  // Switch role and update default identifier
  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    if (role === 'owner') setLoginIdentifier('OWN-101');
    else if (role === 'officer') setLoginIdentifier('LMO-101');
    else if (role === 'gatc') setLoginIdentifier('GATC-01');
    else if (role === 'admin') setLoginIdentifier('ADMIN-101');
  };

  const handleSelectDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedRole(demo.role);
    setLoginIdentifier(demo.id);
    setLoginPassword('password123');
  };

  const handleLogin = async () => {
    if (!loginIdentifier.trim()) {
      Alert.alert('Identifier Required', 'Please enter your User ID, Email, or Badge Number.');
      return;
    }
    setLoading(true);

    const targetRole =
      selectedRole === 'gatc' ? 'officer' :
      selectedRole === 'admin' ? 'admin' :
      selectedRole === 'officer' ? 'officer' : 'owner';

    const result = await loginUser(targetRole, loginIdentifier.trim(), loginPassword);
    setLoading(false);

    if (result.success && result.user) {
      const canonical = result.role as 'owner' | 'officer' | 'admin';
      onLoginSuccess(canonical, result.user);
    } else {
      Alert.alert('Sign In Failed', result.error || 'Invalid credentials or user not found.');
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim()) {
      Alert.alert('Required Fields Missing', 'Full Name and Email Address are required.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);

    const payloadRole = selectedRole === 'admin' ? 'owner' : selectedRole;

    const result = await registerUser({
      role: payloadRole as 'owner' | 'officer' | 'gatc',
      name: regName.trim(),
      businessName: regBusiness.trim() || undefined,
      email: regEmail.trim(),
      phone: regPhone.trim() || undefined,
      password: regPassword,
      state: regState.trim(),
      district: regDistrict.trim(),
      address: regAddress.trim() || undefined,
      badgeNumber: regBadge.trim() || undefined,
    });

    setLoading(false);

    if (result.success && result.user) {
      setLoginIdentifier(result.user.id || result.user.email || regEmail.trim());
      Alert.alert(
        'Account Registered Successfully',
        `Welcome to Metro Verify, ${result.user.name}!\n\nYour account is officially registered in the National Legal Metrology database.\n\n• Assigned ID: ${result.user.id}\n• Business: ${result.user.businessName || result.user.name}\n• District: ${result.user.district || regDistrict}`,
        [
          {
            text: 'Proceed to Dashboard',
            onPress: () => {
              const canonical = result.role as 'owner' | 'officer' | 'admin';
              onLoginSuccess(canonical, result.user!);
            },
          },
        ]
      );
    } else {
      Alert.alert('Registration Failed', result.error || 'Could not complete registration.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryNavy} />

      {/* Executive Gov-Tech Accent Strip */}
      <View style={styles.topTricolor}>
        <View style={[styles.tricolorBand, { backgroundColor: '#D4AF37' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#0A192F' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#1E3A8A' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Official Header */}
        <View style={styles.header}>
          <Text style={styles.emblemIcon}>🏛️</Text>
          <Text style={styles.govTitle}>GOVERNMENT OF INDIA</Text>
          <Text style={styles.deptTitle}>MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</Text>
          <Text style={styles.deptSub}>DIRECTORATE OF LEGAL METROLOGY • NATIONAL VERIFICATION PORTAL</Text>

          <View style={styles.appTitleCard}>
            <Text style={styles.appTitle}>METRO VERIFY</Text>
            <Text style={styles.appSubtitle}>
              Official Legal Metrology Verification & Stamping Lifecycle Management Gateway
            </Text>
            <View style={styles.sihBadge}>
              <Text style={styles.sihBadgeText}>SMART INDIA HACKATHON 2026 • SIH26036</Text>
            </View>
          </View>
        </View>

        {/* Mode Toggle: Sign In vs Register */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
            onPress={() => setMode('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
              🔐 Sign In to Portal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
            onPress={() => setMode('register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
              ✍️ Register New Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Role Selector Tabs */}
        <Text style={styles.sectionHeading}>
          {mode === 'login' ? 'Select Verification Role to Sign In' : 'Select Account Type to Register'}
        </Text>

        <View style={styles.roleTabsGrid}>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'owner' && styles.roleTabSelected]}
            onPress={() => handleRoleSelect('owner')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleTabIcon}>🏪</Text>
            <Text style={[styles.roleTabLabel, selectedRole === 'owner' && styles.roleTabLabelSelected]}>
              Instrument Owner
            </Text>
            <Text style={styles.roleTabSub}>Trader / Industry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'officer' && styles.roleTabSelected]}
            onPress={() => handleRoleSelect('officer')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleTabIcon}>⚖️</Text>
            <Text style={[styles.roleTabLabel, selectedRole === 'officer' && styles.roleTabLabelSelected]}>
              LMO Officer
            </Text>
            <Text style={styles.roleTabSub}>Field Inspector</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'gatc' && styles.roleTabSelected]}
            onPress={() => handleRoleSelect('gatc')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleTabIcon}>🔬</Text>
            <Text style={[styles.roleTabLabel, selectedRole === 'gatc' && styles.roleTabLabelSelected]}>
              GATC Lab
            </Text>
            <Text style={styles.roleTabSub}>Central Testing</Text>
          </TouchableOpacity>

          {mode === 'login' && (
            <TouchableOpacity
              style={[styles.roleTab, selectedRole === 'admin' && styles.roleTabSelected]}
              onPress={() => handleRoleSelect('admin')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleTabIcon}>🏛️</Text>
              <Text style={[styles.roleTabLabel, selectedRole === 'admin' && styles.roleTabLabelSelected]}>
                State Admin
              </Text>
              <Text style={styles.roleTabSub}>Controller HQ</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign In Form */}
        {mode === 'login' && (
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>
                {selectedRole === 'owner' ? 'Instrument Owner Authentication' :
                 selectedRole === 'officer' ? 'LMO Officer Verification Login' :
                 selectedRole === 'gatc' ? 'GATC Lab Officer Login' :
                 'State Metrology Controller Administration'}
              </Text>
              <Text style={styles.sslBadge}>🔒 SSL / 256-bit Encrypted</Text>
            </View>

            <Text style={styles.inputLabel}>
              {selectedRole === 'owner' ? 'Owner ID, Registered Email, or Phone' :
               selectedRole === 'officer' ? 'Officer ID, Badge No, or Official Email' :
               selectedRole === 'gatc' ? 'Lab ID (e.g. GATC-01) or Email' :
               'Admin ID (e.g. ADMIN-101)'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={loginIdentifier}
              onChangeText={setLoginIdentifier}
              placeholder={
                selectedRole === 'owner' ? 'e.g. OWN-483, giri@gmail.com, or 7373567885' :
                selectedRole === 'officer' ? 'e.g. LMO-101 or LM-HYD-042' :
                selectedRole === 'gatc' ? 'e.g. GATC-01' : 'e.g. ADMIN-101'
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Account Password</Text>
            <TextInput
              style={styles.textInput}
              value={loginPassword}
              onChangeText={setLoginPassword}
              placeholder="Enter your secure password"
              secureTextEntry
            />

            {/* Submit Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textWhite} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In & Open Dashboard ›</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>
                {selectedRole === 'owner' ? 'Register New Instrument Owner Account' :
                 selectedRole === 'officer' ? 'Register New Legal Metrology Officer' :
                 'Register New GATC Testing Lab Profile'}
              </Text>
              <Text style={styles.sslBadge}>✓ Official Registration</Text>
            </View>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={regName}
              onChangeText={setRegName}
              placeholder="e.g. Rajesh Kumar"
            />

            {selectedRole === 'owner' ? (
              <>
                <Text style={styles.inputLabel}>Business / Establishment Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={regBusiness}
                  onChangeText={setRegBusiness}
                  placeholder="e.g. Kumar Weighbridge & Trading Co."
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Official Badge Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={regBadge}
                  onChangeText={setRegBadge}
                  placeholder="e.g. LM-HYD-099"
                />
              </>
            )}

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.textInput}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="e.g. rajesh@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={regPhone}
                  onChangeText={setRegPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={regState}
                  onChangeText={setRegState}
                  placeholder="Tamil Nadu"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>District</Text>
                <TextInput
                  style={styles.textInput}
                  value={regDistrict}
                  onChangeText={setRegDistrict}
                  placeholder="Chennai"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Trading Premises / Office Address</Text>
            <TextInput
              style={styles.textInput}
              value={regAddress}
              onChangeText={setRegAddress}
              placeholder="e.g. Plot 14, George Town Commercial Yard, Chennai"
            />

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Password *</Text>
                <TextInput
                  style={styles.textInput}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                  placeholder="Min 6 characters"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <TextInput
                  style={styles.textInput}
                  value={regConfirmPassword}
                  onChangeText={setRegConfirmPassword}
                  secureTextEntry
                  placeholder="Repeat password"
                />
              </View>
            </View>

            {/* Submit Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textWhite} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Complete Registration & Issue Credentials ›
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  topTricolor: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  tricolorBand: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  emblemIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  govTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryNavy,
    letterSpacing: 1.5,
  },
  deptTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  deptSub: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  appTitleCard: {
    backgroundColor: '#0A192F',
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.5,
  },
  appSubtitle: {
    fontSize: 11.5,
    color: 'rgba(203, 213, 225, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  sihBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  sihBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 0.8,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#0A192F',
    fontWeight: '900',
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0A192F',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  roleTabsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  roleTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  roleTabSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  roleTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  roleTabLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  roleTabSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A192F',
    flex: 1,
  },
  sslBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputHint: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  quickAccountsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickAccountsTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  demoChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  demoChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  demoChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  primaryButton: {
    backgroundColor: '#0A192F',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

});

