import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors } from '../theme/colors';

interface ComplianceGaugeProps {
  score: number;
  size?: number;
  showGrade?: boolean;
}

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({
  score = 92,
  size = 110,
  showGrade = true
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

  // Determine health color band
  let strokeColor = '#10B981'; // Green
  let grade = 'Tier A';
  let ratingText = 'Excellent';
  let badgeBg = '#ECFDF5';
  let badgeText = '#047857';

  if (clampedScore < 75) {
    strokeColor = '#EF4444'; // Red
    grade = 'Tier C';
    ratingText = 'High Risk';
    badgeBg = '#FEF2F2';
    badgeText = '#B91C1C';
  } else if (clampedScore < 90) {
    strokeColor = '#F59E0B'; // Amber
    grade = 'Tier B';
    ratingText = 'Standard';
    badgeBg = '#FFFBEB';
    badgeText = '#B45309';
  }

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background Ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Active Gauge Progress */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={strokeColor}
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
          <View style={[styles.gradeBadge, { backgroundColor: badgeBg }]}>
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
    paddingVertical: 6
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary
  },
  scaleText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: -2
  },
  gradeContainer: {
    alignItems: 'center',
    marginTop: 6
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  ratingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2
  }
});
