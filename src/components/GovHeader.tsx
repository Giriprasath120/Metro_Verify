import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { NotificationModal, AppNotification } from './NotificationModal';
import { API_ENDPOINTS } from '../config/api';
import { getActiveUser } from '../services/authService';

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
      const ownerQuery = activeUser?.id ? `?ownerId=${activeUser.id}` : '';
      const res = await fetch(`${API_ENDPOINTS.notifications}${ownerQuery}`);
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

      {/* Executive Gov-Tech Precision Accent Ribbon */}
      <View style={styles.topExecutiveAccent}>
        <View style={styles.executiveAccentGold} />
        <View style={styles.executiveAccentCyan} />
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050E1A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  apexGovBar: {
    backgroundColor: '#030811',
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  apexLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  apexFlag: {
    fontSize: 12
  },
  apexGovText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6
  },
  apexRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  apexMotto: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.8
  },
  topExecutiveAccent: {
    flexDirection: 'row',
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(2, 132, 199, 0.4)'
  },
  executiveAccentGold: {
    flex: 3,
    height: '100%',
    backgroundColor: '#D4AF37'
  },
  executiveAccentCyan: {
    flex: 2,
    height: '100%',
    backgroundColor: '#00F0FF'
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 12 : 14,
    paddingBottom: 14,
    backgroundColor: '#0A192F'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  emblemBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    position: 'relative'
  },
  emblemGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    zIndex: -1
  },
  emblemSymbol: {
    fontSize: 22
  },
  titleArea: {
    flex: 1
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  brandNameGold: {
    color: '#D4AF37',
    fontWeight: '900'
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    gap: 4
  },
  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F97316'
  },
  roleChipText: {
    color: '#FED7AA',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  subtitle: {
    color: 'rgba(203, 213, 225, 0.85)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500'
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 5
  },
  switchButtonIcon: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800'
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  screenTitleRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  screenTitleAccentBar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: '#D4AF37'
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  notifBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#050E1A',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});

