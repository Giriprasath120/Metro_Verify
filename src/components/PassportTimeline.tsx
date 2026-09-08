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
    paddingVertical: 8,
  },
  nodeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leftColumn: {
    alignItems: 'center',
    width: 44,
    marginRight: 12,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#EFF2FE',
    borderColor: '#635BFF',
  },
  nodePending: {
    backgroundColor: '#F6F9FC',
    borderColor: '#E3E8EE',
  },
  nodeIconText: {
    fontSize: 16,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  lineCompleted: {
    backgroundColor: '#635BFF',
  },
  linePending: {
    backgroundColor: '#E3E8EE',
  },
  rightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPending: {
    backgroundColor: '#F6F9FC',
    borderColor: '#E3E8EE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A2540',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillDone: {
    backgroundColor: '#EFF2FE',
  },
  statusPillPending: {
    backgroundColor: '#F6F9FC',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  textDone: {
    color: '#635BFF',
  },
  textPending: {
    color: '#8898AA',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 11,
    color: '#8898AA',
    fontWeight: '500',
  },
  officerText: {
    fontSize: 11.5,
    color: '#635BFF',
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    color: '#425466',
    marginTop: 4,
    lineHeight: 18,
  },
});
