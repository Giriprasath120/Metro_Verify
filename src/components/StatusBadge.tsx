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
  let displayText = status;

  if (normalized === 'verified' || normalized === 'active' || normalized === 'gatc endorsed' || normalized === 'gatc_approved') {
    config = Colors.status.verified;
    displayText = normalized === 'active' ? 'Active (Form VI)' : 'Verified (GATC)';
  } else if (normalized.includes('passed to gatc') || normalized.includes('passed_to_gatc') || normalized === 'gatc_queue' || normalized === 'certified_by_lmo') {
    config = {
      bg: '#FAF5FF',
      border: '#E9D5FF',
      text: '#7E22CE',
      dot: '#A855F7'
    };
    displayText = '🔬 Passed to GATC';
  } else if (normalized === 'submitted' || normalized === 'request submitted') {
    config = {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      dot: '#3B82F6'
    };
    displayText = '📋 Request Submitted';
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
        {displayText}
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
