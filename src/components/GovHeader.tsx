import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../theme/colors';

interface GovHeaderProps {
  title: string;
  subtitle?: string;
  roleLabel?: string;
  onSwitchRole?: () => void;
  rightAction?: React.ReactNode;
}

export const GovHeader: React.FC<GovHeaderProps> = ({
  title,
  subtitle = 'Government of India • Legal Metrology Directorate',
  roleLabel,
  onSwitchRole,
  rightAction
}) => {
  return (
    <View style={styles.container}>
      {/* Top National Identity Ribbon */}
      <View style={styles.topTricolor}>
        <View style={[styles.tricolorBand, { backgroundColor: '#FF9933' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.tricolorBand, { backgroundColor: '#138808' }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          {/* Official Emblem Shield Placeholder */}
          <View style={styles.emblemBadge}>
            <Text style={styles.emblemSymbol}>🏛️</Text>
          </View>

          <View style={styles.titleArea}>
            <View style={styles.headerTagRow}>
              <Text style={styles.brandName}>METRO VERIFY</Text>
              {roleLabel && (
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{roleLabel}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {onSwitchRole ? (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={onSwitchRole}
              activeOpacity={0.8}
            >
              <Text style={styles.switchButtonText}>Switch Role</Text>
            </TouchableOpacity>
          ) : (
            rightAction
          )}
        </View>

        {title !== 'METRO VERIFY' && (
          <View style={styles.screenTitleRow}>
            <Text style={styles.screenTitle}>{title}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryNavy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  topTricolor: {
    flexDirection: 'row',
    height: 3,
    width: '100%'
  },
  tricolorBand: {
    flex: 1,
    height: '100%'
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
    paddingBottom: 12
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  emblemBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  emblemSymbol: {
    fontSize: 20
  },
  titleArea: {
    flex: 1
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandName: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  roleChip: {
    backgroundColor: Colors.accentAmber,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8
  },
  roleChipText: {
    color: Colors.textWhite,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    marginTop: 1
  },
  switchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  switchButtonText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '600'
  },
  screenTitleRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  screenTitle: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700'
  }
});
