import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Platform
} from 'react-native';
import { GovHeader } from '../../components/GovHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { mockInstruments, Instrument } from '../../../data/mockData';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser } from '../../services/authService';

interface MyInstrumentsScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const MyInstrumentsScreen: React.FC<MyInstrumentsScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const currentOwnerId = activeUser?.id || 'OWN-101';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'Expiring Soon' | 'Pending' | 'Scheduled'>('All');
  const [instruments, setInstruments] = useState<Instrument[]>(() =>
    currentOwnerId === 'OWN-101' ? mockInstruments.filter(i => i.ownerId === 'OWN-101') : []
  );
  const [refreshing, setRefreshing] = useState(false);

  // Fetch live instruments from backend
  const fetchInstruments = useCallback(async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.instruments}?ownerId=${currentOwnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.instruments && Array.isArray(data.instruments)) {
          setInstruments(data.instruments);
        }
      }
    } catch {
      // Keep existing instruments if offline
    }
  }, [currentOwnerId]);

  useEffect(() => {
    fetchInstruments();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInstruments();
    });
    return unsubscribe;
  }, [navigation, fetchInstruments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInstruments();
    setRefreshing(false);
  };

  const filteredInstruments = instruments.filter(item => {
    const matchesSearch =
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    return item.status === activeFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="My Instruments"
        subtitle="Permanent Registry of Weighing & Measuring Equipment"
        roleLabel="Owner Registry"
        onSwitchRole={onSwitchRole}
      />

      <View style={styles.container}>
        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by ID, Model, or Location..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['All', 'Verified', 'Expiring Soon', 'Pending', 'Scheduled'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Registry Count Banner */}
        <View style={styles.countBanner}>
          <Text style={styles.countText}>
            Showing <Text style={styles.bold}>{filteredInstruments.length}</Text> registered instruments
          </Text>
          <TouchableOpacity onPress={fetchInstruments} style={styles.refreshBadge}>
            <Text style={styles.refreshBadgeText}>🔄 Refresh Registry</Text>
          </TouchableOpacity>
        </View>

        {/* Data Table / Card List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primaryNavy]}
            />
          }
        >
          {filteredInstruments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No matching instruments found</Text>
              <Text style={styles.emptySub}>Try adjusting your search query or filters.</Text>
            </View>
          ) : (
            filteredInstruments.map((inst, index) => (
              <View
                key={inst.id}
                style={styles.tableRowCard}
              >
                {/* Header Row: Model, Unique ID Badge, and Status */}
                <View style={styles.rowTop}>
                  <View style={styles.srNumberBadge}>
                    <Text style={styles.srNumberText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.titleInfo}>
                    <Text style={styles.modelNameText}>{inst.model}</Text>
                    <View style={styles.idBadgeHighlight}>
                      <Text style={styles.idBadgeIcon}>🏷️</Text>
                      <Text style={styles.idBadgeLabel}>UID:</Text>
                      <Text style={styles.idBadgeValue}>{inst.id}</Text>
                    </View>
                  </View>
                  <StatusBadge status={inst.status} size="sm" />
                </View>

                {/* Details Grid: Type & Serial Number */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Type / Category</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {inst.category} {inst.subCategory ? `• ${inst.subCategory}` : ''}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Serial Number</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {inst.serialNumber}
                    </Text>
                  </View>
                </View>

                {/* Details Grid: Capacity & Location & Expiry */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Capacity & Class</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {inst.capacity} ({inst.accuracyClass || 'Standard'})
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Expiry / Due Date</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        inst.status === 'Expiring Soon' && { color: '#C2410C', fontWeight: 'bold' },
                        inst.status === 'Expired' && { color: '#B91C1C', fontWeight: 'bold' }
                      ]}
                    >
                      📅 {inst.expiryDate}
                    </Text>
                  </View>
                </View>

                {/* Footer Strip: Registered Location only */}
                <View style={styles.rowFooter}>
                  <Text style={styles.lastVerifiedText}>
                    📍 {inst.location}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary
  },
  clearText: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: 4
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border
  },
  filterChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary
  },
  filterTextActive: {
    color: Colors.textWhite
  },
  countBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  countText: {
    fontSize: 11,
    color: Colors.textSecondary
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary
  },
  refreshBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  refreshBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  addSmallBtn: {
    backgroundColor: Colors.accentAmber,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  addSmallText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: 24,
    gap: 10
  },
  tableRowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  srNumberBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8
  },
  srNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  titleInfo: {
    flex: 1
  },
  modelNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  idBadgeHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4
  },
  idBadgeIcon: {
    fontSize: 10
  },
  idBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5
  },
  idBadgeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  detailCol: {
    flex: 1
  },
  detailLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  detailValue: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  lastVerifiedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500'
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    marginTop: 20
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary
  },
  emptySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2
  }
});
