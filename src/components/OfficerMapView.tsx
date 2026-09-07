import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';

interface InspectionSite {
  id: string; // Assignment ID or App ID
  applicationId?: string;
  instrumentId: string;
  instrumentModel: string;
  category?: string;
  ownerName: string;
  businessName: string;
  address: string;
  district: string;
  phone?: string;
  scheduledDate: string;
  timeSlot: string;
  status: string;
  lat: number;
  lng: number;
}

interface OfficerMapViewProps {
  assignments: any[];
  officerDistrict?: string;
  onSelectInspection: (item: any) => void;
  onStartVerification: (item: any) => void;
}

export const OfficerMapView: React.FC<OfficerMapViewProps> = ({
  assignments,
  officerDistrict = 'Chennai',
  onSelectInspection,
  onStartVerification,
}) => {
  // Coordinates mapping for districts and locations
  const sampleCoordinates: Record<string, { lat: number; lng: number; label: string }> = {
    'Koyambedu': { lat: 17.4700, lng: 78.4800, label: 'Koyambedu Wholesale Market Complex, Chennai' },
    'Begumpet': { lat: 17.4448, lng: 78.4682, label: 'Begumpet Industrial Estate' },
    'Guindy': { lat: 17.4399, lng: 78.4983, label: 'General Market Guindy' },
    'Sanathnagar': { lat: 17.4566, lng: 78.4411, label: 'Sanathnagar Logistics Hub' },
    'Charminar': { lat: 17.3616, lng: 78.4747, label: 'Laad Bazaar Jewellers Precinct' },
    'Cyberabad': { lat: 17.4435, lng: 78.3772, label: 'Madhapur Tech Zone' },
  };

  // Transform assignments into InspectionSites
  const sites: InspectionSite[] = assignments.map((asg, index) => {
    const app = asg.application || asg;
    const inst = asg.instrument || app.instrument || {};
    const owner = asg.owner || app.owner || {};

    const distKey = Object.keys(sampleCoordinates)[index % Object.keys(sampleCoordinates).length];
    const defaultCoords = sampleCoordinates[distKey] || { lat: 17.4485, lng: 78.487, label: 'Chennai' };

    return {
      id: asg.id || app.id,
      applicationId: app.id || asg.applicationId,
      instrumentId: inst.id || asg.instrumentId || `INST-${index + 1}`,
      instrumentModel: inst.model || asg.instrumentModel || 'Commercial Weighing Instrument',
      category: inst.category || asg.category || 'Non-Automatic Weighing Instrument',
      ownerName: owner.name || 'Owner',
      businessName: owner.businessName || `${owner.name || 'Trader'} Enterprises`,
      address: owner.address || inst.location || `${distKey} Commercial Cluster, Chennai`,
      district: inst.district || owner.district || officerDistrict,
      phone: owner.phone || asg.ownerPhone || '+91 98480 22338',
      scheduledDate: asg.scheduledDate || app.preferredDate || '2026-09-18',
      timeSlot: asg.timeSlot || '10:00 AM - 01:00 PM',
      status: asg.status || app.status || 'SCHEDULED',
      lat: inst.lat || defaultCoords.lat,
      lng: inst.lng || defaultCoords.lng,
    };
  });

  const [selectedSiteIndex, setSelectedSiteIndex] = useState<number>(0);
  const activeSite = sites[selectedSiteIndex] || sites[0];

  const handleOpenGoogleMaps = (site: InspectionSite) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot Open Maps', `Coordinates: ${site.lat}, ${site.lng}`);
    });
  };

  const handleMakeCall = (phone?: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Call Failed', `Could not open dialer for ${phone}`);
    });
  };

  // If no sites are available
  if (sites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>🗺️</Text>
        <Text style={styles.emptyTitle}>No Assigned Inspection Sites</Text>
        <Text style={styles.emptySub}>
          When verification requests are allocated to you by Admin, their physical locations will appear on this interactive territory map.
        </Text>
      </View>
    );
  }

  // Generate OpenStreetMap Embed URL centered on active site
  const mapCenterLat = activeSite ? activeSite.lat : 17.4485;
  const mapCenterLng = activeSite ? activeSite.lng : 78.4870;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenterLng - 0.04}%2C${mapCenterLat - 0.03}%2C${mapCenterLng + 0.04}%2C${mapCenterLat + 0.03}&layer=mapnik&marker=${mapCenterLat}%2C${mapCenterLng}`;

  return (
    <View style={styles.mapCard}>
      {/* Territory Map Header */}
      <View style={styles.mapHeaderRow}>
        <View>
          <View style={styles.mapBadgeRow}>
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsBadgeText}>🛰️ GPS ENFORCEMENT ROUTE</Text>
            </View>
            <Text style={styles.sitesCountText}>{sites.length} SITES ASSIGNED</Text>
          </View>
          <Text style={styles.mapTitle}>Owner Premises & Inspection Territory Map</Text>
          <Text style={styles.mapSubtitle}>
            Live geo-coordinates for scheduled physical verifications in {officerDistrict}
          </Text>
        </View>
      </View>

      {/* Interactive Map Canvas / Embed */}
      <View style={styles.mapFrameWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            title="Inspection Route Map"
            src={osmEmbedUrl}
            style={{
              width: '100%',
              height: 320,
              border: 'none',
              borderRadius: 12,
            }}
          />
        ) : (
          <View style={styles.mapNativePlaceholder}>
            <Text style={{ fontSize: 40 }}>📍</Text>
            <Text style={styles.placeholderTitle}>{activeSite.businessName}</Text>
            <Text style={styles.placeholderSub}>
              GPS Coordinates: {activeSite.lat.toFixed(4)}° N, {activeSite.lng.toFixed(4)}° E
            </Text>
          </View>
        )}

        {/* Top-Right Quick Switch Floating Overlay */}
        <View style={styles.floatingNavOverlay}>
          <TouchableOpacity
            style={styles.floatingNavBtn}
            onPress={() => handleOpenGoogleMaps(activeSite)}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingNavText}>🧭 Open GPS Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Site Selector Carousel */}
      <Text style={styles.selectorLabel}>Select Assigned Location ({sites.length}):</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitesScrollRow}>
        {sites.map((site, index) => {
          const isSelected = index === selectedSiteIndex;
          return (
            <TouchableOpacity
              key={site.id}
              style={[styles.siteChip, isSelected && styles.siteChipActive]}
              onPress={() => setSelectedSiteIndex(index)}
              activeOpacity={0.8}
            >
              <View style={styles.siteChipHeader}>
                <Text style={styles.sitePinIcon}>{isSelected ? '📍' : '📌'}</Text>
                <Text style={[styles.siteChipName, isSelected && styles.textWhite]} numberOfLines={1}>
                  {site.businessName}
                </Text>
              </View>
              <Text style={[styles.siteChipInst, isSelected && styles.textWhiteMuted]} numberOfLines={1}>
                {site.instrumentModel}
              </Text>
              <View style={styles.siteChipFooter}>
                <Text style={[styles.siteChipSlot, isSelected && styles.textWhiteMuted]}>
                  {site.timeSlot.split('-')[0]}
                </Text>
                <View style={[styles.siteStatusDot, { backgroundColor: site.status === 'COMPLETED' ? '#10B981' : '#F59E0B' }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Selected Site Action Card */}
      {activeSite && (
        <View style={styles.activeSiteCard}>
          <View style={styles.activeSiteTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.activeSiteBadgeRow}>
                <View style={styles.activeSiteBadge}>
                  <Text style={styles.activeSiteBadgeText}>SELECTED VERIFICATION SITE</Text>
                </View>
                <Text style={styles.activeSiteSlotText}>📅 {activeSite.scheduledDate} • {activeSite.timeSlot}</Text>
              </View>
              <Text style={styles.activeSiteTitle}>{activeSite.businessName}</Text>
              <Text style={styles.activeSiteOwner}>Proprietor: {activeSite.ownerName}</Text>
              <Text style={styles.activeSiteAddress}>📍 {activeSite.address}</Text>
            </View>
          </View>

          {/* Instrument Details Strip */}
          <View style={styles.instrumentMetaStrip}>
            <View style={styles.instMetaCol}>
              <Text style={styles.instMetaLabel}>Target Equipment</Text>
              <Text style={styles.instMetaVal}>{activeSite.instrumentModel}</Text>
            </View>
            <View style={styles.instMetaCol}>
              <Text style={styles.instMetaLabel}>Unique ID (UID)</Text>
              <Text style={styles.instMetaValHighlight}>{activeSite.instrumentId}</Text>
            </View>
            <View style={styles.instMetaCol}>
              <Text style={styles.instMetaLabel}>GPS Coordinates</Text>
              <Text style={styles.instMetaVal}>{activeSite.lat.toFixed(4)}° N, {activeSite.lng.toFixed(4)}° E</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionBtnCall}
              onPress={() => handleMakeCall(activeSite.phone)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnCallText}>📞 Call Owner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnNav}
              onPress={() => handleOpenGoogleMaps(activeSite)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnNavText}>🧭 Navigation Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnVerify}
              onPress={() => onStartVerification(activeSite)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnVerifyText}>🚀 Start Field Verification ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mapBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gpsBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsBadgeText: {
    color: '#1E40AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sitesCountText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  mapTitle: {
    color: Colors.primaryNavy,
    fontSize: 17,
    fontWeight: '800',
  },
  mapSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  mapFrameWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  mapNativePlaceholder: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    color: Colors.primaryNavy,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  placeholderSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  floatingNavOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  floatingNavBtn: {
    backgroundColor: 'rgba(11, 37, 69, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingNavText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  selectorLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  sitesScrollRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  siteChip: {
    width: 170,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginRight: 10,
  },
  siteChipActive: {
    backgroundColor: Colors.primaryNavy,
    borderColor: Colors.primaryNavy,
  },
  siteChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  sitePinIcon: {
    fontSize: 13,
  },
  siteChipName: {
    flex: 1,
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
  siteChipInst: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 6,
  },
  siteChipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteChipSlot: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  siteStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeSiteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  activeSiteTopRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activeSiteBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeSiteBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeSiteBadgeText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
  },
  activeSiteSlotText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  activeSiteTitle: {
    color: Colors.primaryNavy,
    fontSize: 16,
    fontWeight: '800',
  },
  activeSiteOwner: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  activeSiteAddress: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  instrumentMetaStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  instMetaCol: {
    flex: 1,
  },
  instMetaLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  instMetaVal: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  instMetaValHighlight: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnCall: {
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnNav: {
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnNavText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnVerify: {
    flex: 1,
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnVerifyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyTitle: {
    color: Colors.primaryNavy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 380,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textWhiteMuted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
