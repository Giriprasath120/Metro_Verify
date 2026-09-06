import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export type VerificationStatus =
  | 'Pending'
  | 'Scheduled'
  | 'In Progress'
  | 'Verified'
  | 'Expiring Soon'
  | 'Expired';

interface StatusBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').trim().toLowerCase();
  
  let config = Colors.status.pending;

  if (normalized === 'verified' || normalized === 'active') {
    config = Colors.status.verified;
  } else if (normalized === 'scheduled') {
    config = Colors.status.scheduled;
  } else if (normalized === 'in progress' || normalized === 'in_progress') {
    config = Colors.status.inProgress;
  } else if (normalized === 'expiring soon' || normalized === 'expiring_soon') {
    config = Colors.status.expiringSoon;
  } else if (normalized === 'expired' || normalized === 'rejected') {
    config = Colors.status.expired;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        isSmall && styles.badgeSmall
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }, isSmall && styles.dotSmall]} />
      <Text style={[styles.text, { color: config.text }, isSmall && styles.textSmall]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5
  },
  dotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  textSmall: {
    fontSize: 10
  }
});
