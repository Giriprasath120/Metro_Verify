import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import { AuthScreen } from '../screens/auth/AuthScreen';
import { getActiveRole, getActiveUser, logoutUser, UserProfile } from '../services/authService';

// Owner Screens
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { MyInstrumentsScreen } from '../screens/owner/MyInstrumentsScreen';
import { InstrumentPassportScreen } from '../screens/owner/InstrumentPassportScreen';
import { NewRequestScreen } from '../screens/owner/NewRequestScreen';
import { CertificatesScreen } from '../screens/owner/CertificatesScreen';
import { AIChatScreen } from '../screens/owner/AIChatScreen';

// Officer Screens
import { OfficerDashboardScreen } from '../screens/officer/OfficerDashboardScreen';
import { FieldVerificationScreen } from '../screens/officer/FieldVerificationScreen';
import { OfflineQueueScreen } from '../screens/officer/OfflineQueueScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminRequestsScreen } from '../screens/admin/AdminRequestsScreen';
import { AdminStatusScreen } from '../screens/admin/AdminStatusScreen';
import { AdminOfficersScreen } from '../screens/admin/AdminOfficersScreen';
import { SmartAllocationScreen } from '../screens/admin/SmartAllocationScreen';
import { ComplianceAlertsScreen } from '../screens/admin/ComplianceAlertsScreen';
import { BulkBatchMonitorScreen } from '../screens/admin/BulkBatchMonitorScreen';

import { Colors } from '../theme/colors';
import { Platform, TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Deep linking configuration for multi-page web browser URL routing
const linking = {
  prefixes: ['/', 'http://localhost:8081', 'https://metro-verify.gov.in'],
  config: {
    screens: {
      Dashboard: 'dashboard',
      Instruments: 'instruments',
      NewRequest: 'new-request',
      Certificates: 'certificates',
      AIAssistant: 'ai-chat',
      Schedule: 'officer/schedule',
      OfflineQueue: 'officer/offline-queue',
      AdminDashboard: 'admin/overview',
      AdminRequests: 'admin/requests',
      AdminStatus: 'admin/status',
      AdminOfficers: 'admin/officers',
      SmartAllocation: 'admin/smart-allocation',
      ComplianceAlerts: 'admin/alerts',
    },
  },
};

// 1. Owner Stack Navigator (Allows drilling down into Passport from Dashboard)
const OwnerStack = createNativeStackNavigator();
function OwnerStackNavigator({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <OwnerStack.Navigator screenOptions={{ headerShown: false }}>
      <OwnerStack.Screen name="OwnerDashboard">
        {props => <OwnerDashboardScreen {...props} onSwitchRole={onSwitchRole} />}
      </OwnerStack.Screen>
      <OwnerStack.Screen name="Passport">
        {props => <InstrumentPassportScreen {...props} onSwitchRole={onSwitchRole} />}
      </OwnerStack.Screen>
    </OwnerStack.Navigator>
  );
}

// 2. Instruments Stack Navigator (Allows drilling down into Passport from Instruments tab)
const InstrumentsStack = createNativeStackNavigator();
function InstrumentsStackNavigator({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <InstrumentsStack.Navigator screenOptions={{ headerShown: false }}>
      <InstrumentsStack.Screen name="InstrumentsList">
        {props => <MyInstrumentsScreen {...props} onSwitchRole={onSwitchRole} />}
      </InstrumentsStack.Screen>
      <InstrumentsStack.Screen name="Passport">
        {props => <InstrumentPassportScreen {...props} onSwitchRole={onSwitchRole} />}
      </InstrumentsStack.Screen>
    </InstrumentsStack.Navigator>
  );
}

// Web Top Government Navigation Bar for desktop multi-page portal feel
const WebPortalNavBar: React.FC<{
  currentRole: string;
  activeTab: string;
  onNavigate: (tabName: string) => void;
  onSwitchRole: () => void;
}> = ({ currentRole, activeTab, onNavigate, onSwitchRole }) => {
  if (Platform.OS !== 'web') return null;

  const ownerTabs = [
    { key: 'Dashboard', label: 'Dashboard', icon: '🏪' },
    { key: 'Instruments', label: 'My Instruments', icon: '⚖️' },
    { key: 'NewRequest', label: 'New Verification Request', icon: '➕' },
    { key: 'Certificates', label: 'Digital Certificates', icon: '📜' },
    { key: 'AIAssistant', label: 'AI Assistant', icon: '✨' },
  ];

  const officerTabs = [
    { key: 'Schedule', label: 'Inspection Schedule', icon: '📋' },
    { key: 'OfflineQueue', label: 'Offline Sync Queue', icon: '📡' },
  ];

  const adminTabs = [
    { key: 'AdminDashboard', label: 'Overview', icon: '📊' },
    { key: 'AdminRequests', label: 'Requests', icon: '📥' },
    { key: 'AdminStatus', label: 'Status', icon: '📑' },
    { key: 'AdminOfficers', label: 'Officers & Labs', icon: '👥' },
    { key: 'ComplianceAlerts', label: 'Risk Alerts', icon: '⚠️' },
  ];

  const tabs = currentRole === 'owner' ? ownerTabs : currentRole === 'officer' ? officerTabs : adminTabs;

  return (
    <View style={styles.webNavBar}>
      <View style={styles.webNavContainer}>
        <View style={styles.webNavBrand}>
          <Text style={styles.webNavEmblem}>🏛️</Text>
          <View>
            <Text style={styles.webNavTitle}>METRO VERIFY PORTAL</Text>
            <Text style={styles.webNavSub}>Government of Tamil Nadu • Legal Metrology Directorate</Text>
          </View>
        </View>

        <View style={styles.webNavTabs}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.webTabBtn, isActive && styles.webTabBtnActive]}
                onPress={() => onNavigate(tab.key)}
              >
                <Text style={styles.webTabIcon}>{tab.icon}</Text>
                <Text style={[styles.webTabText, isActive && styles.webTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.webLogoutBtn} onPress={onSwitchRole}>
          <Text style={styles.webLogoutText}>Switch Role / Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 3. Owner Bottom Tab Navigator
function OwnerTabNavigator({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accentAmber,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏪</Text>
        }}
      >
        {props => <OwnerStackNavigator {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="Instruments"
        options={{
          tabBarLabel: 'Instruments',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚖️</Text>
        }}
      >
        {props => <InstrumentsStackNavigator {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="NewRequest"
        options={{
          tabBarLabel: 'New Request',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>➕</Text>
        }}
      >
        {props => <NewRequestScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="Certificates"
        options={{
          tabBarLabel: 'Certificates',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📜</Text>
        }}
      >
        {props => <CertificatesScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="AIAssistant"
        options={{
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>✨</Text>
        }}
      >
        {props => <AIChatScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// 4. Officer Schedule Stack Navigator (Allows opening Field Verification from Schedule)
const OfficerStack = createNativeStackNavigator();
function OfficerScheduleStackNavigator({
  onSwitchRole,
  isOfflineMode,
  setIsOfflineMode
}: {
  onSwitchRole: () => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
}) {
  return (
    <OfficerStack.Navigator screenOptions={{ headerShown: false }}>
      <OfficerStack.Screen name="OfficerSchedule">
        {props => (
          <OfficerDashboardScreen
            {...props}
            onSwitchRole={onSwitchRole}
            isOfflineMode={isOfflineMode}
            setIsOfflineMode={setIsOfflineMode}
          />
        )}
      </OfficerStack.Screen>
      <OfficerStack.Screen name="FieldVerification">
        {props => (
          <FieldVerificationScreen
            {...props}
            onSwitchRole={onSwitchRole}
          />
        )}
      </OfficerStack.Screen>
    </OfficerStack.Navigator>
  );
}

// 5. Officer Bottom Tab Navigator (Strictly: Schedule & Offline Queue)
function OfficerTabNavigator({
  onSwitchRole,
  isOfflineMode,
  setIsOfflineMode
}: {
  onSwitchRole: () => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
}) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryNavy,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tab.Screen
        name="Schedule"
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📋</Text>
        }}
      >
        {props => (
          <OfficerScheduleStackNavigator
            {...props}
            onSwitchRole={onSwitchRole}
            isOfflineMode={isOfflineMode}
            setIsOfflineMode={setIsOfflineMode}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="OfflineQueue"
        options={{
          tabBarLabel: 'Offline Queue',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📡</Text>
        }}
      >
        {props => <OfflineQueueScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// 6. Admin Bottom Tab Navigator
function AdminTabNavigator({ onSwitchRole }: { onSwitchRole: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryNavy,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text>
        }}
      >
        {props => <AdminDashboardScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="AdminRequests"
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📥</Text>
        }}
      >
        {props => <AdminRequestsScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="AdminStatus"
        options={{
          tabBarLabel: 'Status',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📑</Text>
        }}
      >
        {props => <AdminStatusScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="AdminOfficers"
        options={{
          tabBarLabel: 'Officers',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👥</Text>
        }}
      >
        {props => <AdminOfficersScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>

      <Tab.Screen
        name="ComplianceAlerts"
        options={{
          tabBarLabel: 'Risk Alerts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚠️</Text>
        }}
      >
        {props => <ComplianceAlertsScreen {...props} onSwitchRole={onSwitchRole} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Root Navigator Managing Roles & Authentication Gateway
export const RootNavigator: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'none' | 'owner' | 'officer' | 'admin'>('none');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Initialize session from saved storage
  React.useEffect(() => {
    const savedRole = getActiveRole();
    const savedUser = getActiveUser();
    if (savedRole && savedRole !== 'none' && savedUser) {
      setCurrentRole(savedRole as any);
      setCurrentUser(savedUser);
    }
  }, []);

  const handleLoginSuccess = (role: 'owner' | 'officer' | 'admin', user: UserProfile) => {
    setCurrentRole(role);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentRole('none');
    setCurrentUser(null);
  };

  return (
    <NavigationContainer linking={linking}>
      {currentRole === 'none' && (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {currentRole === 'owner' && (
        <OwnerTabNavigator key={currentUser?.id || 'owner'} onSwitchRole={handleLogout} />
      )}

      {currentRole === 'officer' && (
        <OfficerTabNavigator
          key={currentUser?.id || 'officer'}
          onSwitchRole={handleLogout}
          isOfflineMode={isOfflineMode}
          setIsOfflineMode={setIsOfflineMode}
        />
      )}

      {currentRole === 'admin' && (
        <AdminTabNavigator onSwitchRole={handleLogout} />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8
  },
  tabBarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2
  },
  webNavBar: {
    backgroundColor: '#050E1A',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(212, 175, 55, 0.4)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  webNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1440,
    marginHorizontal: 'auto',
    width: '100%',
  },
  webNavBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webNavEmblem: {
    fontSize: 28,
  },
  webNavTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  webNavSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  webNavTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  webTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
  },
  webTabBtnActive: {
    backgroundColor: Colors.accentAmber,
    shadowColor: Colors.accentAmber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  webTabIcon: {
    fontSize: 14,
  },
  webTabText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  webTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  webLogoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  webLogoutText: {
    color: '#F87171',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

