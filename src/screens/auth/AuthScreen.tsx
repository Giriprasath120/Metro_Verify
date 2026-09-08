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

      {/* Stripe Signature Multi-Color Gradient Swoosh Ribbon */}
      <View style={styles.topTricolor}>
        <View style={[styles.tricolorBand, { backgroundColor: '#FF5E5B', flex: 1.5 }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#FF7A59', flex: 1.5 }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#EA4C89', flex: 2 }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#635BFF', flex: 3 }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#00D4FF', flex: 2 }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Stripe Hero Header */}
        <View style={styles.header}>
          <View style={styles.heroPreBadge}>
            <Text style={styles.heroPreBadgeText}>
              🏛️ State Metrology Infrastructure: <Text style={styles.heroPreBadgeHighlight}>Tamil Nadu Legal Metrology</Text> • SIH26036
            </Text>
          </View>

          <Text style={styles.stripeHeroHeadline}>
            Legal metrology infrastructure to <Text style={styles.stripeHeroGradientText}>ensure trade accuracy.</Text>
          </Text>
          <Text style={styles.stripeHeroSubtitle}>
            Verify instruments, issue digital Form VI certificates, schedule field officers, and inspect tamper-proof 3D digital twins—from your first weighing scale to statewide bulk batches.
          </Text>
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
                <Text style={styles.primaryButtonText}>Sign In to Metro Verify ›</Text>
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

        {/* Stripe-style Standards & Statutory Trust Strip */}
        <View style={styles.trustBarContainer}>
          <Text style={styles.trustBarLabel}>GOVERNMENT OF TAMIL NADU • STATUTORY COMPLIANCE NETWORK</Text>
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <Text style={styles.trustItemIcon}>⚖️</Text>
              <Text style={styles.trustItemText}>Legal Metrology Act 2009</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustItemIcon}>📜</Text>
              <Text style={styles.trustItemText}>Form VI Digital Stamping</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustItemIcon}>🔬</Text>
              <Text style={styles.trustItemText}>NABL / ISO 17025 Labs</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={styles.trustItemIcon}>🔒</Text>
              <Text style={styles.trustItemText}>HMAC-SHA256 Encrypted QR</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  container: {
    padding: 24,
    paddingBottom: 60,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  topTricolor: {
    flexDirection: 'row',
    height: 3.5,
    width: '100%',
  },
  tricolorBand: {
    height: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  heroPreBadge: {
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#D8DEFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroPreBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#425466',
    letterSpacing: 0.2,
  },
  heroPreBadgeHighlight: {
    color: '#635BFF',
    fontWeight: '900',
  },
  stripeHeroHeadline: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0A2540',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  stripeHeroGradientText: {
    color: '#635BFF',
  },
  stripeHeroSubtitle: {
    fontSize: 13.5,
    color: '#425466',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    maxWidth: 540,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F8',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3E8EE',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#62788D',
  },
  modeTabTextActive: {
    color: '#0A2540',
    fontWeight: '900',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  roleTabsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleTabSelected: {
    borderColor: '#635BFF',
    backgroundColor: '#EFF2FE',
    shadowColor: 'rgba(99, 91, 255, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    color: '#425466',
    textAlign: 'center',
  },
  roleTabLabelSelected: {
    color: '#4B45C6',
    fontWeight: '900',
  },
  roleTabSub: {
    fontSize: 9.5,
    color: '#62788D',
    marginTop: 2,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    padding: 22,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  formTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0A2540',
    flex: 1,
  },
  sslBadge: {
    fontSize: 10,
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
    fontSize: 11,
    fontWeight: '800',
    color: '#425466',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputHint: {
    fontSize: 10.5,
    color: '#62788D',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0A2540',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#635BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E3E8EE',
  },
  dividerText: {
    fontSize: 11,
    color: '#62788D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  demoChip: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  demoChipActive: {
    backgroundColor: '#EFF2FE',
    borderColor: '#635BFF',
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#425466',
  },
  demoChipTextActive: {
    color: '#635BFF',
    fontWeight: '900',
  },
  trustBarContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E3E8EE',
    alignItems: 'center',
  },
  trustBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#62788D',
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 580,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trustItemIcon: {
    fontSize: 14,
  },
  trustItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A2540',
  },
});

