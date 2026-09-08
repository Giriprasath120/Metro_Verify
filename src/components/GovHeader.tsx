import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { NotificationModal, AppNotification } from './NotificationModal';
import { API_ENDPOINTS } from '../config/api';
import { getActiveUser } from '../services/authService';
import { navigationRef } from '../navigation/navigationService';

interface GovHeaderProps {
  title: string;
  subtitle?: string;
  roleLabel?: string;
  onSwitchRole?: () => void;
  rightAction?: React.ReactNode;
}

export const GovHeader: React.FC<GovHeaderProps> = ({
  title,
  subtitle = 'Government of Tamil Nadu • Legal Metrology Directorate',
  roleLabel,
  onSwitchRole,
  rightAction
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'NOTIF-INIT-1',
      type: 'EXPIRY',
      level: 'WARNING',
      title: 'Annual Stamping Renewal Approaching',
      message: 'Instruments in Chennai North trade jurisdiction due for verification renewal within 30 days.',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: 'NewRequest',
      actionText: 'Apply Renewal'
    },
    {
      id: 'NOTIF-INIT-2',
      type: 'ENDORSEMENT',
      level: 'INFO',
      title: 'GATC Central Lab Inspection Completed',
      message: 'Tamil Nadu State Central Metrology Laboratory has endorsed 2 digital Form VI certificates.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: true,
      actionUrl: 'Certificates',
      actionText: 'View Certificates'
    }
  ]);

  const activeUser = getActiveUser();

  const fetchNotifications = async () => {
    try {
      const isOfficer = activeUser?.role === 'officer' || activeUser?.role === 'LMO' || activeUser?.role === 'GATC' ||
        activeUser?.id?.startsWith('LMO-') || activeUser?.id?.startsWith('GATC-') ||
        roleLabel?.toLowerCase().includes('officer') || roleLabel?.toLowerCase().includes('lmo');

      let queryParam = '';
      if (activeUser?.id) {
        if (isOfficer) {
          queryParam = `?officerId=${encodeURIComponent(activeUser.id)}&role=officer`;
        } else {
          queryParam = `?ownerId=${encodeURIComponent(activeUser.id)}`;
        }
      }
      const res = await fetch(`${API_ENDPOINTS.notifications}${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
          setNotifications(data.notifications);
        }
      }
    } catch {
      // offline fallback maintains local alerts
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Official Apex Government Identity Strip */}
      <View style={styles.apexGovBar}>
        <View style={styles.apexLeft}>
          <Text style={styles.apexFlag}>🇮🇳</Text>
          <Text style={styles.apexGovText}>
            GOVERNMENT OF INDIA  |  GOVERNMENT OF TAMIL NADU
          </Text>
        </View>
        <View style={styles.apexRight}>
          <Text style={styles.apexMotto}>DIRECTORATE OF LEGAL METROLOGY • CHENNAI</Text>
        </View>
      </View>

      {/* Stripe Signature Multi-Color Gradient Swoosh Ribbon */}
      <View style={styles.topExecutiveAccent}>
        <View style={[styles.gradientBar, { backgroundColor: '#FF5E5B', flex: 1.5 }]} />
        <View style={[styles.gradientBar, { backgroundColor: '#FF7A59', flex: 1.5 }]} />
        <View style={[styles.gradientBar, { backgroundColor: '#EA4C89', flex: 2 }]} />
        <View style={[styles.gradientBar, { backgroundColor: '#635BFF', flex: 3 }]} />
        <View style={[styles.gradientBar, { backgroundColor: '#00D4FF', flex: 2 }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          {/* Official Emblem Shield */}
          <View style={styles.emblemBadge}>
            <Text style={styles.emblemSymbol}>🏛️</Text>
            <View style={styles.emblemGlow} />
          </View>

          <View style={styles.titleArea}>
            <View style={styles.headerTagRow}>
              <Text style={styles.brandName}>METRO <Text style={styles.brandNameGold}>VERIFY</Text></Text>
              {roleLabel && (
                <View style={styles.roleChip}>
                  <View style={styles.roleDot} />
                  <Text style={styles.roleChipText}>{roleLabel}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {/* Action Area: Notification Bell + Role Switch */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.notifBellBtn}
              onPress={() => setShowNotifs(true)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {onSwitchRole ? (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={onSwitchRole}
                activeOpacity={0.8}
              >
                <Text style={styles.switchButtonIcon}>⇄</Text>
                <Text style={styles.switchButtonText}>Switch Role</Text>
              </TouchableOpacity>
            ) : (
              rightAction
            )}
          </View>
        </View>

        {title !== 'METRO VERIFY' && (
          <View style={styles.screenTitleRow}>
            <View style={styles.screenTitleAccentBar} />
            <Text style={styles.screenTitle}>{title}</Text>
          </View>
        )}
      </View>

      {/* In-App Notification Center Modal */}
      <NotificationModal
        visible={showNotifs}
        notifications={notifications}
        onClose={() => setShowNotifs(false)}
        onSelectAction={(actionUrl, notif) => {
          setShowNotifs(false);
          try {
            if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
              if (notif?.instrumentId || actionUrl === 'MyInstruments' || actionUrl === 'Passport') {
                navigationRef.navigate('Instruments', {
                  screen: 'Passport',
                  params: {
                    instrument: {
                      id: notif?.instrumentId || 'INST-TS-01',
                      model: notif?.title ? notif.title.replace(/^[^\w]+/, '').trim() : 'Legal Metrology Instrument',
                    },
                  },
                });
              } else if (actionUrl === 'Certificates') {
                navigationRef.navigate('Certificates');
              } else if (actionUrl === 'NewRequest') {
                navigationRef.navigate('NewRequest');
              } else if (actionUrl === 'Schedule') {
                navigationRef.navigate('Schedule');
              } else if (actionUrl === 'Dashboard') {
                navigationRef.navigate('Dashboard');
              } else {
                navigationRef.navigate(actionUrl as any);
              }
            }
          } catch (navErr) {
            console.warn('Notification navigation error:', navErr);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  apexGovBar: {
    backgroundColor: '#FAFCFD',
    paddingHorizontal: 20,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  apexLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apexFlag: {
    fontSize: 12,
  },
  apexGovText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#62788D',
    letterSpacing: 0.6,
  },
  apexRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  apexMotto: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#425466',
    letterSpacing: 0.8,
  },
  topExecutiveAccent: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  gradientBar: {
    height: '100%',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emblemBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D8DEFE',
    position: 'relative',
  },
  emblemGlow: {
    display: 'none',
  },
  emblemSymbol: {
    fontSize: 20,
  },
  titleArea: {
    flex: 1,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandName: {
    color: '#0A2540',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandNameGold: {
    color: '#635BFF',
    fontWeight: '900',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF2FE',
    borderWidth: 1,
    borderColor: '#D8DEFE',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#635BFF',
  },
  roleChipText: {
    color: '#4B45C6',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#62788D',
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    gap: 5,
  },
  switchButtonIcon: {
    color: '#635BFF',
    fontSize: 13,
    fontWeight: '800',
  },
  switchButtonText: {
    color: '#0A2540',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  screenTitleRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitleAccentBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#635BFF',
  },
  screenTitle: {
    color: '#0A2540',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  notifBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#635BFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});

