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

  if (normalized === 'pending' || normalized === 'not started' || normalized === 'not_started') {
    config = {
      bg: '#FEF2F2',
      border: '#FCA5A5',
      text: '#DC2626',
      dot: '#EF4444'
    };
    displayText = '⚠️ Pending / Not Started';
  } else if (normalized === 'verified' || normalized === 'active' || normalized === 'gatc endorsed' || normalized === 'gatc_approved') {
    config = Colors.status.verified;
    displayText = normalized === 'active' ? 'Active (Form VI)' : 'Verified (GATC)';
  } else if (normalized.includes('passed to gatc') || normalized.includes('passed_to_gatc') || normalized === 'gatc_queue' || normalized === 'certified_by_lmo') {
    config = {
      bg: '#DCFCE7',
      border: '#86EFAC',
      text: '#15803D',
      dot: '#22C55E'
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
    config = {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#2563EB',
      dot: '#3B82F6'
    };
    displayText = '⏳ In Progress';
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
      <View style={[styles.dotWrapper, isSmall && styles.dotWrapperSmall]}>
        <View style={[styles.dotGlow, { backgroundColor: config.dot }]} />
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
      </View>
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.2,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1
  },
  dotWrapper: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    position: 'relative'
  },
  dotWrapperSmall: {
    width: 6,
    height: 6,
    marginRight: 4
  },
  dotGlow: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.35
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  text: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  textSmall: {
    fontSize: 10,
    letterSpacing: 0.2
  }
});

