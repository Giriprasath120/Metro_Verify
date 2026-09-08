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
  type: 'EXPIRY' | 'WARNING' | 'ENDORSEMENT' | 'SYSTEM' | 'DOWNLOAD' | 'ALLOCATION';
  level: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  actionUrl?: string;
  actionText?: string;
  instrumentId?: string;
  applicationId?: string;
  officerName?: string;
  officerContact?: string;
  officerBadge?: string;
}

interface NotificationModalProps {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onSelectAction?: (actionUrl: string, notification?: AppNotification) => void;
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
                          onSelectAction(n.actionUrl, n);
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
            <Text style={styles.footerText}>Government of India • Directorate of Legal Metrology</Text>
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
    backgroundColor: 'rgba(10, 37, 64, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EE',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2540',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#425466',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#425466',
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
    color: '#0A2540',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#425466',
    textAlign: 'center',
  },
  notifItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 12,
    padding: 14,
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(99, 91, 255, 0.25)',
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
    color: '#8898AA',
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 12,
    color: '#425466',
    lineHeight: 18,
    marginBottom: 8,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#635BFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E3E8EE',
    backgroundColor: '#F6F9FC',
  },
  footerText: {
    fontSize: 11.5,
    color: '#8898AA',
    fontWeight: '600',
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#635BFF',
  },
  doneBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
