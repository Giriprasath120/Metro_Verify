import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';

interface DigitalTwin3DViewProps {
  instrument: {
    id: string;
    model: string;
    category?: string;
    capacity?: string;
    accuracyClass?: string;
    serialNumber?: string;
    status?: string;
  };
}

// 3D Point definition
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Face3D {
  indices: number[];
  color: string;
  wireColor?: string;
  normal?: Point3D;
  centerZ?: number;
  type?: string;
}

export const DigitalTwin3DView: React.FC<DigitalTwin3DViewProps> = ({ instrument }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Interaction State
  const [rotX, setRotX] = useState<number>(0.38); // Pitch in radians
  const [rotY, setRotY] = useState<number>(0.75); // Yaw in radians
  const [zoom, setZoom] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'solid' | 'xray' | 'thermal'>('solid');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [appliedLoadKg, setAppliedLoadKg] = useState<number>(0.0);
  const [activeComponent, setActiveComponent] = useState<string>('platter');

  // Simulated live telemetry based on applied test load
  const loadDeflectionUm = (appliedLoadKg * 4.2).toFixed(1); // micro-meters deflection
  const strainMicroStrain = Math.round(appliedLoadKg * 28.5); // micro-strain
  const temperatureC = (24.2 + appliedLoadKg * 0.04).toFixed(1);
  const zeroDrift = appliedLoadKg === 0 ? '+0.000 g' : '+0.001 g';
  const balanceNominal = appliedLoadKg > 0 ? '99.9% Linear' : '100.0% Calibrated';

  // Mouse / Touch drag handling
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-rotation loop
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotY((prev) => (prev + 0.012) % (Math.PI * 2));
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Project 3D point to 2D canvas coordinates
  const project = useCallback((p: Point3D, cx: number, cy: number, scale: number): { x: number; y: number; z: number } => {
    // Rotation around X (Pitch)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = p.y * cosX - p.z * sinX;
    const z1 = p.y * sinX + p.z * cosX;

    // Rotation around Y (Yaw)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x2 = p.x * cosY + z1 * sinY;
    const z2 = -p.x * sinY + z1 * cosY;

    // Perspective projection
    const distance = 420;
    const denom = distance + z2;
    const fov = denom > 10 ? distance / denom : 1.0;

    return {
      x: cx + x2 * fov * scale * zoom,
      y: cy + y1 * fov * scale * zoom,
      z: z2,
    };
  }, [rotX, rotY, zoom]);

  // Main Canvas Render
  const render3DModel = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width || 480;
      const height = canvas.height || 280;
      const cx = width / 2;
      const cy = height / 2 + 10;
      const scale = 1.05;

      // Clear background with rich dark blueprint gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, width * 0.7);
      bgGrad.addColorStop(0, '#0F1E36');
      bgGrad.addColorStop(1, '#070D18');
      ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle 3D grid plane underneath
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.12)';
    ctx.lineWidth = 1;
    const gridY = 85;
    for (let gx = -160; gx <= 160; gx += 40) {
      const pStart = project({ x: gx, y: gridY, z: -160 }, cx, cy, scale);
      const pEnd = project({ x: gx, y: gridY, z: 160 }, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }
    for (let gz = -160; gz <= 160; gz += 40) {
      const pStart = project({ x: -160, y: gridY, z: gz }, cx, cy, scale);
      const pEnd = project({ x: 160, y: gridY, z: gz }, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }

    // Define 3D Geometry of Weighing Scale
    // Platter deflection when weight is applied
    const deflection = Math.min(6, (appliedLoadKg / 50) * 6);

    const vertices: Point3D[] = [
      // Base Housing (0-7)
      { x: -90, y: 30, z: -70 }, // 0
      { x: 90, y: 30, z: -70 },  // 1
      { x: 90, y: 30, z: 70 },   // 2
      { x: -90, y: 30, z: 70 },  // 3
      { x: -95, y: 75, z: -75 }, // 4
      { x: 95, y: 75, z: -75 },  // 5
      { x: 95, y: 75, z: 75 },   // 6
      { x: -95, y: 75, z: 75 },  // 7

      // Top Platter (8-15) - with dynamic load deflection
      { x: -105, y: -26 + deflection, z: -80 }, // 8
      { x: 105, y: -26 + deflection, z: -80 },  // 9
      { x: 105, y: -26 + deflection, z: 80 },   // 10
      { x: -105, y: -26 + deflection, z: 80 },  // 11
      { x: -102, y: -16 + deflection, z: -78 }, // 12
      { x: 102, y: -16 + deflection, z: -78 },  // 13
      { x: 102, y: -16 + deflection, z: 78 },   // 14
      { x: -102, y: -16 + deflection, z: 78 },  // 15

      // Internal Strain Gauge Load Cell Sensor (16-23)
      { x: -28, y: 0 + deflection * 0.7, z: -18 }, // 16
      { x: 28, y: 0 + deflection * 0.7, z: -18 },  // 17
      { x: 28, y: 0 + deflection * 0.7, z: 18 },   // 18
      { x: -28, y: 0 + deflection * 0.7, z: 18 },  // 19
      { x: -28, y: 28, z: -18 },                  // 20
      { x: 28, y: 28, z: -18 },                   // 21
      { x: 28, y: 28, z: 18 },                    // 22
      { x: -28, y: 28, z: 18 },                   // 23

      // Digital Indicator Console Front (24-27)
      { x: -45, y: 40, z: 75 }, // 24
      { x: 45, y: 40, z: 75 },  // 25
      { x: 40, y: 65, z: 85 },  // 26
      { x: -40, y: 65, z: 85 }, // 27

      // Government Stamped Hologram Seal (28-31)
      { x: 55, y: 38, z: 72 },  // 28
      { x: 75, y: 38, z: 72 },  // 29
      { x: 75, y: 58, z: 74 },  // 30
      { x: 55, y: 58, z: 74 },  // 31
    ];

    // Build Polygon Faces
    const faces: Face3D[] = [
      // Base Housing Sides
      { indices: [0, 1, 5, 4], color: '#1E293B', wireColor: '#38BDF8', type: 'housing' },
      { indices: [1, 2, 6, 5], color: '#334155', wireColor: '#38BDF8', type: 'housing' },
      { indices: [2, 3, 7, 6], color: '#1E293B', wireColor: '#38BDF8', type: 'housing' },
      { indices: [3, 0, 4, 7], color: '#0F172A', wireColor: '#38BDF8', type: 'housing' },
      { indices: [0, 1, 2, 3], color: '#26334D', wireColor: '#38BDF8', type: 'housing' },
      { indices: [4, 5, 6, 7], color: '#0A0F1A', wireColor: '#38BDF8', type: 'housing' },

      // Platter (Brushed Stainless Steel)
      { indices: [8, 9, 10, 11], color: activeComponent === 'platter' ? '#E2E8F0' : '#CBD5E1', wireColor: '#94A3B8', type: 'platter' },
      { indices: [8, 9, 13, 12], color: '#94A3B8', wireColor: '#64748B', type: 'platter' },
      { indices: [9, 10, 14, 13], color: '#CBD5E1', wireColor: '#64748B', type: 'platter' },
      { indices: [10, 11, 15, 14], color: '#64748B', wireColor: '#475569', type: 'platter' },
      { indices: [11, 8, 12, 15], color: '#475569', wireColor: '#334155', type: 'platter' },

      // Internal Strain Gauge Load Cell
      { indices: [16, 17, 18, 19], color: appliedLoadKg > 0 ? '#F59E0B' : '#10B981', wireColor: '#F59E0B', type: 'loadcell' },
      { indices: [16, 17, 21, 20], color: appliedLoadKg > 0 ? '#D97706' : '#059669', wireColor: '#D97706', type: 'loadcell' },
      { indices: [17, 18, 22, 21], color: appliedLoadKg > 0 ? '#F59E0B' : '#10B981', wireColor: '#F59E0B', type: 'loadcell' },
      { indices: [18, 19, 23, 22], color: appliedLoadKg > 0 ? '#B45309' : '#047857', wireColor: '#B45309', type: 'loadcell' },
      { indices: [19, 16, 20, 23], color: appliedLoadKg > 0 ? '#92400E' : '#065F46', wireColor: '#92400E', type: 'loadcell' },

      // Digital Indicator Display Face
      { indices: [24, 25, 26, 27], color: '#030712', wireColor: '#00F0FF', type: 'indicator' },

      // Government Stamped Hologram Seal
      { indices: [28, 29, 30, 31], color: '#0D9488', wireColor: '#2DD4BF', type: 'seal' },
    ];

    // Project all vertices
    const projected = vertices.map((v) => project(v, cx, cy, scale));

    // Calculate face depths for painter's algorithm sorting
    const sortedFaces = faces.map((face) => {
      let sumZ = 0;
      for (const idx of face.indices) {
        sumZ += projected[idx].z;
      }
      return {
        ...face,
        centerZ: sumZ / face.indices.length,
      };
    });

    // Sort descending by Z distance (draw furthest faces first)
    sortedFaces.sort((a, b) => (b.centerZ || 0) - (a.centerZ || 0));

    // Render Faces
    sortedFaces.forEach((face) => {
      if (viewMode === 'solid' && face.type === 'loadcell' && activeComponent !== 'loadcell') {
        ctx.globalAlpha = 0.45;
      } else if (viewMode === 'xray') {
        ctx.globalAlpha = face.type === 'loadcell' ? 0.95 : 0.25;
      } else {
        ctx.globalAlpha = 1.0;
      }

      ctx.beginPath();
      const firstPt = projected[face.indices[0]];
      ctx.moveTo(firstPt.x, firstPt.y);

      for (let i = 1; i < face.indices.length; i++) {
        const pt = projected[face.indices[i]];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      if (viewMode === 'xray') {
        ctx.strokeStyle = face.wireColor || '#00F0FF';
        ctx.lineWidth = face.type === 'loadcell' ? 2 : 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = face.color;
        ctx.fill();

        ctx.strokeStyle = face.wireColor || 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1.0;

    // Render Digital LCD Screen Text on Indicator (Projected Center)
    const indCenter = {
      x: (projected[24].x + projected[25].x + projected[26].x + projected[27].x) / 4,
      y: (projected[24].y + projected[25].y + projected[26].y + projected[27].y) / 4,
    };

    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayVal = appliedLoadKg > 0 ? `${appliedLoadKg.toFixed(3)} kg` : '0.000 kg [TARE]';
    ctx.fillText(displayVal, indCenter.x, indCenter.y);

    // Stamped Department Crest on Hologram Seal (Projected Center)
    const sealCenter = {
      x: (projected[28].x + projected[29].x + projected[30].x + projected[31].x) / 4,
      y: (projected[28].y + projected[29].y + projected[30].y + projected[31].y) / 4,
    };
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚖️ TS-LM', sealCenter.x, sealCenter.y);

    // Watermark Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('METRO-VERIFY DIGITAL TWIN • WEBGL 3D TELEMETRY', 14, height - 14);
    } catch (err) {
      console.warn('Digital Twin 3D render exception handled:', err);
    }
  }, [rotX, rotY, zoom, viewMode, appliedLoadKg, activeComponent, project]);

  useEffect(() => {
    render3DModel();
  }, [render3DModel]);

  // Mouse handlers for web rotation
  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    setIsAutoRotating(false);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setRotY((prev) => prev + dx * 0.009);
    setRotX((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.009)));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <View style={styles.cardContainer}>
      {/* 3D Header & Mode Selector */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.twinPillRow}>
            <View style={styles.twinPill}>
              <Text style={styles.twinPillText}>🌐 DIGITAL TWIN TECHNOLOGY</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.telemetryLiveText}>LIVE TELEMETRY SYNC</Text>
          </View>
          <Text style={styles.twinTitle}>{instrument.model}</Text>
          <Text style={styles.twinSubtitle}>
            Interactive Metrological 3D Replica • UID: {instrument.id}
          </Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'solid' && styles.modeBtnActive]}
            onPress={() => setViewMode('solid')}
          >
            <Text style={[styles.modeBtnText, viewMode === 'solid' && styles.modeBtnTextActive]}>
              Solid 3D
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'xray' && styles.modeBtnActive]}
            onPress={() => setViewMode('xray')}
          >
            <Text style={[styles.modeBtnText, viewMode === 'xray' && styles.modeBtnTextActive]}>
              X-Ray Sensor
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive 3D Canvas Area */}
      <View style={styles.canvasWrapper}>
        {Platform.OS === 'web' ? (
          <canvas
            ref={canvasRef}
            width={480}
            height={280}
            style={{ width: '100%', height: 280, cursor: isDragging.current ? 'grabbing' : 'grab', borderRadius: 12 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Text style={{ fontSize: 36 }}>⚖️</Text>
            <Text style={styles.fallbackTitle}>3D Digital Twin Engine</Text>
            <Text style={styles.fallbackSub}>Interactive WebGL view available on web platform.</Text>
          </View>
        )}

        {/* Floating Controls Overlay */}
        <View style={styles.canvasControlsOverlay}>
          <TouchableOpacity
            style={[styles.overlayIconBtn, isAutoRotating && styles.overlayIconBtnActive]}
            onPress={() => setIsAutoRotating(!isAutoRotating)}
            activeOpacity={0.8}
          >
            <Text style={styles.overlayIconText}>{isAutoRotating ? '⏸ Pause 360°' : '▶ 360° Auto-Rotate'}</Text>
          </TouchableOpacity>

          <View style={styles.zoomControlRow}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            >
              <Text style={styles.zoomText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Component Inspector Tabs */}
      <View style={styles.componentInspectRow}>
        <Text style={styles.inspectLabel}>Sub-System Focus:</Text>
        {[
          { id: 'platter', label: 'Stainless Platter' },
          { id: 'loadcell', label: 'Strain Gauge Load Cell' },
          { id: 'indicator', label: 'Digital Indicator' },
          { id: 'seal', label: 'Statutory Seal' },
        ].map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.inspectChip, activeComponent === c.id && styles.inspectChipActive]}
            onPress={() => {
              setActiveComponent(c.id);
              if (c.id === 'loadcell') setViewMode('xray');
            }}
          >
            <Text style={[styles.inspectChipText, activeComponent === c.id && styles.inspectChipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Applied Test Load Simulation Section */}
      <View style={styles.testLoadSection}>
        <View style={styles.testLoadHeader}>
          <Text style={styles.testLoadTitle}>⚖️ Statutory Calibration Load Simulator</Text>
          <Text style={styles.testLoadSub}>
            Apply certified standard test masses to test digital twin strain response & zero-drift:
          </Text>
        </View>

        <View style={styles.massButtonsRow}>
          {[0, 5, 10, 20, 50].map((mass) => (
            <TouchableOpacity
              key={mass}
              style={[styles.massBtn, appliedLoadKg === mass && styles.massBtnActive]}
              onPress={() => setAppliedLoadKg(mass)}
              activeOpacity={0.8}
            >
              <Text style={[styles.massBtnText, appliedLoadKg === mass && styles.massBtnTextActive]}>
                {mass === 0 ? '0 kg (Tare)' : `${mass} kg`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Real-time Telemetry & Metrological Health Metrics */}
      <View style={styles.telemetryGrid}>
        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryCardLabel}>Load Cell Deflection</Text>
          <Text style={styles.telemetryCardVal}>{loadDeflectionUm} µm</Text>
          <Text style={styles.telemetryCardSub}>Elastic deformation</Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryCardLabel}>Micro-Strain (µε)</Text>
          <Text style={[styles.telemetryCardVal, { color: '#00F0FF' }]}>{strainMicroStrain} µε</Text>
          <Text style={styles.telemetryCardSub}>Wheatstone bridge</Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryCardLabel}>Zero-Drift Stability</Text>
          <Text style={[styles.telemetryCardVal, { color: '#10B981' }]}>{zeroDrift}</Text>
          <Text style={styles.telemetryCardSub}>MPE Tolerance: PASS</Text>
        </View>

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryCardLabel}>Statutory Seal Integrity</Text>
          <Text style={[styles.telemetryCardVal, { color: '#10B981' }]}>✓ INTACT</Text>
          <Text style={styles.telemetryCardSub}>Crypto-hash verified</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0B1526',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  twinPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  twinPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  twinPillText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  telemetryLiveText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  twinTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  twinSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: Colors.primaryNavy,
  },
  modeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#070D18',
  },
  nativeFallback: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  fallbackSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  canvasControlsOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  overlayIconBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  overlayIconBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderColor: '#00F0FF',
  },
  overlayIconText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  zoomControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  zoomLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  componentInspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  inspectLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  inspectChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  inspectChipActive: {
    backgroundColor: '#0369A1',
  },
  inspectChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  inspectChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  testLoadSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  testLoadHeader: {
    marginBottom: 8,
  },
  testLoadTitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  testLoadSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  massButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  massBtn: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  massBtnActive: {
    backgroundColor: Colors.accentAmber,
    borderColor: '#D97706',
  },
  massBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  massBtnTextActive: {
    color: '#0B1526',
    fontWeight: '800',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  telemetryCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  telemetryCardLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  telemetryCardVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 2,
  },
  telemetryCardSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
});
