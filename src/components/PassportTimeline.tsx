import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export interface TimelineNode {
  stage:
    | 'Registered'
    | 'Verification Requested'
    | 'Inspection Scheduled'
    | 'Field-Verified'
    | 'Certificate Issued'
    | 'Next Due';
  date: string;
  officerName: string;
  note: string;
  completed: boolean;
}

interface PassportTimelineProps {
  nodes: TimelineNode[];
}

const stageIcons: Record<string, string> = {
  'Registered': '📝',
  'Verification Requested': '📨',
  'Inspection Scheduled': '📅',
  'Field-Verified': '⚖️',
  'Certificate Issued': '📜',
  'Next Due': '⏳'
};

export const PassportTimeline: React.FC<PassportTimelineProps> = ({ nodes }) => {
  const safeNodes: TimelineNode[] = Array.isArray(nodes) && nodes.length > 0 ? nodes : [
    {
      stage: 'Registered',
      date: '2026-01-15',
      officerName: 'System Gateway',
      note: 'Instrument entered into Legal Metrology State Registry',
      completed: true,
    },
    {
      stage: 'Verification Requested',
      date: '2026-02-01',
      officerName: 'Trade Owner',
      note: 'Re-verification application submitted with statutory fees',
      completed: true,
    },
    {
      stage: 'Inspection Scheduled',
      date: '2026-02-10',
      officerName: 'Senior LMO Chennai',
      note: 'Physical premises calibration slot confirmed',
      completed: true,
    },
    {
      stage: 'Field-Verified',
      date: '2026-02-18',
      officerName: 'V. Ramanathan (LMO-101)',
      note: 'Verified with working standard weights and passed calibration',
      completed: true,
    },
    {
      stage: 'Certificate Issued',
      date: '2026-02-19',
      officerName: 'GATC Central Lab',
      note: 'Form VI Digital Certificate with QR security seal generated',
      completed: true,
    },
    {
      stage: 'Next Due',
      date: '2027-02-18',
      officerName: 'Annual Cycle',
      note: 'Mandatory statutory annual re-verification due per Rule 14',
      completed: false,
    },
  ];

  return (
    <View style={styles.container}>
      {safeNodes.map((node, index) => {
        const isLast = index === safeNodes.length - 1;
        const icon = stageIcons[node.stage] || '🔹';

        return (
          <View key={`${node.stage}-${index}`} style={styles.nodeRow}>
            {/* Timeline Line & Dot */}
            <View style={styles.leftColumn}>
              <View
                style={[
                  styles.nodeCircle,
                  node.completed ? styles.nodeCompleted : styles.nodePending
                ]}
              >
                <Text style={styles.nodeIconText}>{icon}</Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.verticalLine,
                    node.completed ? styles.lineCompleted : styles.linePending
                  ]}
                />
              )}
            </View>

            {/* Timeline Details */}
            <View style={[styles.rightCard, !node.completed && styles.cardPending]}>
              <View style={styles.headerRow}>
                <Text style={styles.stageTitle}>{node.stage}</Text>
                <View
                  style={[
                    styles.statusPill,
                    node.completed ? styles.statusPillDone : styles.statusPillPending
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      node.completed ? styles.textDone : styles.textPending
                    ]}
                  >
                    {node.completed ? 'COMPLETED' : 'PENDING'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.dateText}>📅 {node.date}</Text>
                <Text style={styles.officerText}>👤 {node.officerName}</Text>
              </View>

              <Text style={styles.noteText}>{node.note}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8
  },
  nodeRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  leftColumn: {
    alignItems: 'center',
    width: 44,
    marginRight: 10
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2
  },
  nodeCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669'
  },
  nodePending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8'
  },
  nodeIconText: {
    fontSize: 16
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4
  },
  lineCompleted: {
    backgroundColor: '#059669'
  },
  linePending: {
    backgroundColor: '#CBD5E1'
  },
  rightCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusPillDone: {
    backgroundColor: '#ECFDF5'
  },
  statusPillPending: {
    backgroundColor: '#F1F5F9'
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800'
  },
  textDone: {
    color: '#059669'
  },
  textPending: {
    color: '#64748B'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    flexWrap: 'wrap'
  },
  dateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500'
  },
  officerText: {
    fontSize: 11,
    color: Colors.primaryNavy,
    fontWeight: '600'
  },
  noteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 17
  }
});
