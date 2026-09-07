import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../theme/colors';

interface ComplianceGaugeProps {
  score: number;
  size?: number;
  showGrade?: boolean;
}

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({
  score = 92,
  size = 120,
  showGrade = true
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

  // Determine health color band
  let strokeColor = '#059669'; // Emerald
  let grade = 'Tier A';
  let ratingText = 'Statutory Compliant';
  let badgeBg = '#ECFDF5';
  let badgeText = '#047857';
  let badgeBorder = '#A7F3D0';

  if (clampedScore < 75) {
    strokeColor = '#DC2626'; // Ruby
    grade = 'Tier C';
    ratingText = 'High Risk Audit';
    badgeBg = '#FEF2F2';
    badgeText = '#991B1B';
    badgeBorder = '#FECACA';
  } else if (clampedScore < 90) {
    strokeColor = '#D97706'; // Amber
    grade = 'Tier B';
    ratingText = 'Renewal Due Soon';
    badgeBg = '#FFFBEB';
    badgeText = '#92400E';
    badgeBorder = '#FDE68A';
  }

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={strokeColor === '#059669' ? '#10B981' : strokeColor === '#D97706' ? '#F59E0B' : '#EF4444'} stopOpacity="0.8" />
            </LinearGradient>
          </Defs>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              strokeDasharray="4, 4"
              fill="none"
            />
            {/* Active Gauge Progress */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#gaugeGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>

        <View style={styles.centerTextContainer}>
          <Text style={styles.scoreText}>{clampedScore}</Text>
          <Text style={styles.scaleText}>/ 100</Text>
        </View>
      </View>

      {showGrade && (
        <View style={styles.gradeContainer}>
          <View style={[styles.gradeBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <View style={[styles.gradeDot, { backgroundColor: strokeColor }]} />
            <Text style={[styles.gradeText, { color: badgeText }]}>{grade}</Text>
          </View>
          <Text style={styles.ratingText}>{ratingText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0A192F',
    letterSpacing: -0.5
  },
  scaleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: -2
  },
  gradeContainer: {
    alignItems: 'center',
    marginTop: 8
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5
  },
  gradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3
  }
});

