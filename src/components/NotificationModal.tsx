import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export interface AppNotification {
  id: string;
  type: 'EXPIRY' | 'WARNING' | 'ENDORSEMENT' | 'SYSTEM' | 'DOWNLOAD';
  level: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationModalProps {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onSelectAction?: (actionUrl: string) => void;
  onClearAll?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  notifications,
  onClose,
  onSelectAction,
  onClearAll
}) => {
  const getIcon = (type: string, level: string) => {
    if (level === 'CRITICAL') return '🚨';
    if (level === 'WARNING') return '⚠️';
    if (type === 'ENDORSEMENT') return '🔬';
    if (type === 'DOWNLOAD') return '📥';
    return '🔔';
  };

  const getBorderColor = (level: string) => {
    if (level === 'CRITICAL') return '#FCA5A5';
    if (level === 'WARNING') return '#FCD34D';
    if (level === 'SUCCESS') return '#86EFAC';
    return '#CBD5E1';
  };

  const getBadgeBg = (level: string) => {
    if (level === 'CRITICAL') return '#FEE2E2';
    if (level === 'WARNING') return '#FEF3C7';
    if (level === 'SUCCESS') return '#DCFCE7';
    return '#F1F5F9';
  };

  const getBadgeColor = (level: string) => {
    if (level === 'CRITICAL') return '#DC2626';
    if (level === 'WARNING') return '#D97706';
    if (level === 'SUCCESS') return '#15803D';
    return '#475569';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bellIconBox}>
                <Text style={{ fontSize: 18 }}>🔔</Text>
              </View>
              <View>
                <Text style={styles.title}>Notification Center</Text>
                <Text style={styles.subtitle}>
                  Statutory alerts, inspection & certificate updates
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView contentContainerStyle={styles.listContainer}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🔕</Text>
                <Text style={styles.emptyTitle}>No New Notifications</Text>
                <Text style={styles.emptySub}>You are completely up to date with statutory requirements.</Text>
              </View>
            ) : (
              notifications.map(n => (
                <View
                  key={n.id}
                  style={[
                    styles.notifItem,
                    { borderColor: getBorderColor(n.level) },
                    !n.read && styles.unreadItem
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTypeRow}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>{getIcon(n.type, n.level)}</Text>
                      <View style={[styles.badge, { backgroundColor: getBadgeBg(n.level) }]}>
                        <Text style={[styles.badgeText, { color: getBadgeColor(n.level) }]}>
                          {n.level}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.timestamp}>
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMessage}>{n.message}</Text>

                  {n.actionText && n.actionUrl && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        onClose();
                        if (onSelectAction && n.actionUrl) {
                          onSelectAction(n.actionUrl);
                        }
                      }}
                    >
                      <Text style={styles.actionBtnText}>{n.actionText} ›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Government of Tamil Nadu • Legal Metrology</Text>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 14, 26, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 520,
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A192F',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  notifItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadItem: {
    backgroundColor: '#FAFCFF',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A192F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});
