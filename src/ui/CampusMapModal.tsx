import React, { useMemo, useState } from 'react';
import { Layers, Maximize2, Minimize2, X } from 'lucide-react';
import {
  BUILDING_MAP_BOUNDS,
  CAMPUS_DATA,
  FLOOR_LABELS,
  type RoomDefinition,
  getFloorFromY,
  worldToMinimapNormalized,
} from '../utils/CampusLayout';
import type { MinimapNpcMarker } from './Minimap';

interface CampusMapModalProps {
  playerX: number;
  playerY?: number;
  playerZ: number;
  visitedRooms: string[];
  npcs: MinimapNpcMarker[];
  onClose: () => void;
}

const FLOORS = [0, 1, 2, 3] as const;

interface LabelSpec {
  lines: string[];
  fontSize: number;
  rotated: boolean;
}

const EXTERIOR_ROOMS = CAMPUS_DATA.rooms.filter((room) => room.type === 'exterior');

const INTERIOR_ROOMS_BY_FLOOR: Record<number, RoomDefinition[]> = {
  0: CAMPUS_DATA.rooms.filter((room) => room.floor === 0 && room.type !== 'exterior'),
  1: CAMPUS_DATA.rooms.filter((room) => room.floor === 1 && room.type !== 'exterior'),
  2: CAMPUS_DATA.rooms.filter((room) => room.floor === 2 && room.type !== 'exterior'),
  3: CAMPUS_DATA.rooms.filter((room) => room.floor === 3 && room.type !== 'exterior'),
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  lobby: 'Hall / Galerie',
  corridor: 'Circulation',
  classroom: 'Salle de classe',
  lab: 'Laboratoire',
  library: 'Bibliothèque / Étude',
  dining: 'Restauration / Détente',
  club: 'Club étudiant',
  admin: 'Administration',
  restroom: 'Sanitaires',
  stairs: 'Escalier',
  elevator: 'Ascenseur',
  atrium: 'Atrium ouvert',
  exterior: 'Extérieur',
};

const ROOM_PALETTE: Record<string, { visited: string; unvisited: string; stroke: string }> = {
  lobby: { visited: '#fbcfe8', unvisited: '#fce7f3', stroke: '#be185d' },
  corridor: { visited: '#e2e8f0', unvisited: '#f1f5f9', stroke: '#64748b' },
  classroom: { visited: '#c7d2fe', unvisited: '#e0e7ff', stroke: '#4338ca' },
  lab: { visited: '#a7f3d0', unvisited: '#d1fae5', stroke: '#047857' },
  library: { visited: '#fde68a', unvisited: '#fef3c7', stroke: '#b45309' },
  dining: { visited: '#fed7aa', unvisited: '#ffedd5', stroke: '#c2410c' },
  club: { visited: '#e9d5ff', unvisited: '#f3e8ff', stroke: '#7e22ce' },
  admin: { visited: '#fecdd3', unvisited: '#ffe4e6', stroke: '#be123c' },
  restroom: { visited: '#bae6fd', unvisited: '#e0f2fe', stroke: '#0369a1' },
  stairs: { visited: '#cbd5e1', unvisited: '#e2e8f0', stroke: '#475569' },
  elevator: { visited: '#cbd5e1', unvisited: '#e2e8f0', stroke: '#475569' },
  atrium: { visited: '#e2e8f0', unvisited: '#e2e8f0', stroke: '#64748b' },
};

const EXPLICIT_LABEL_LINES: Record<string, string[]> = {
  "Hall d'Accueil": ["Hall d'Accueil"],
  'Atrium Intérieur & Grand Escalier': ['Atrium Central', '& Grand Escalier'],
  'Direction / Bureau du Proviseur': ['Bureau du', 'Proviseur'],
  "Conseillère d'Orientation": ['Conseillère', "d'Orientation"],
  Infirmerie: ['Infirmerie'],
  Conciergerie: ['Concier-', 'gerie'],
  'Archive / Local': ['Archives', '& Local'],
  Cafétéria: ['Cafétéria'],
  'Cuisine Cafétéria': ['Cuisine', 'Cafétéria'],
  'Escalier Ouest': ['Escalier', 'Ouest'],
  'Escalier Est': ['Escalier', 'Est'],
  'Ascenseur Ouest': ['Asc. Ouest'],
  'Ascenseur Est': ['Asc. Est'],
  'Toilettes H': ['Toilettes H'],
  'Toilettes F': ['Toilettes F'],
  'Vide sur Atrium': ['Vide sur', 'Atrium'],
  "Galerie Sud de l'Atrium": ['Galerie Sud', "de l'Atrium"],
  'Galerie Sud des Clubs': ['Galerie Sud', 'des Clubs'],
  Bibliothèque: ['Bibliothèque'],
  'Bibliothèque Annexe': ['Bibliothèque', 'Annexe'],
  "Salle d'Anglais": ['Salle', "d'Anglais"],
  'Salle de Maths': ['Salle de', 'Maths'],
  'Salle de Philo': ['Salle de', 'Philo'],
  'Salle de Sciences': ['Salle de', 'Sciences'],
  'Study Room': ['Study Room'],
  'Langues Vivantes': ['Langues', 'Vivantes'],
  "Salle d'Histoire": ['Salle', "d'Histoire"],
  'Salle Informatique': ['Salle', 'Info.'],
  'Labo Sciences & Chimie': ['Labo', 'Chimie'],
  "Salle d'Art": ["Salle d'Art"],
  'Club Journalisme': ['Club', 'Journalisme'],
  'Club Robotique': ['Club', 'Robotique'],
  'Game Room': ['Game Room'],
  'Club Échecs & Jeux': ['Club Échecs', '& Jeux'],
  'Student Lounge': ['Student Lounge'],
  'Salle de Musique': ['Salle de', 'Musique'],
  'Club Théâtre': ['Club', 'Théâtre'],
  'Club Photo & Média': ['Club Photo', '& Média'],
  'Club Débat': ['Club', 'Débat'],
  'Lounge Détente': ['Lounge', 'Détente'],
  'Atelier Arts Plastiques': ['Atelier Arts', 'Plastiques'],
  'Salle Polyvalente Ouest': ['Salle', 'Polyvalente'],
  'Club Musique': ['Club', 'Musique'],
  'Salle de Conférence': ['Salle de', 'Conférence'],
  'Club Sciences': ['Club', 'Sciences'],
  'Salle de Réunion': ['Salle de', 'Réunion'],
  "Salle d'Étude Supérieure": ["Salle d'Étude", 'Supérieure'],
  'Salle Examens Ouest': ['Salle Examens', 'Ouest'],
  'Salle Examens Est': ['Salle Examens', 'Est'],
  'Grand Hall Nord': ['Grand Hall', 'Nord'],
  'Réserve Campus': ['Réserve', 'Campus'],
};

function getRoomColors(type: string, visited: boolean) {
  const entry = ROOM_PALETTE[type] ?? ROOM_PALETTE.classroom;
  return {
    fill: visited ? entry.visited : entry.unvisited,
    stroke: entry.stroke,
  };
}

function getRoomLabelSpec(room: RoomDefinition, rw: number, rd: number): LabelSpec {
  if (room.type === 'corridor') {
    return {
      lines: [room.name],
      fontSize: 10,
      rotated: false,
    };
  }

  const clean = room.name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (rw < 48 && rd > rw * 1.15) {
    return {
      lines: EXPLICIT_LABEL_LINES[clean] ?? [clean],
      fontSize: 9.5,
      rotated: true,
    };
  }

  const lines = EXPLICIT_LABEL_LINES[clean] ?? [clean];
  if (rw >= 105) {
    return { lines, fontSize: 11, rotated: false };
  }
  if (rw >= 72) {
    return { lines, fontSize: 10, rotated: false };
  }
  return { lines, fontSize: 9, rotated: false };
}

export const CampusMapModal: React.FC<CampusMapModalProps> = ({
  playerX,
  playerY = 0.05,
  playerZ,
  visitedRooms,
  npcs,
  onClose,
}) => {
  const playerFloor = getFloorFromY(playerY);
  const [activeFloor, setActiveFloor] = useState<number>(playerFloor);
  const [viewMode, setViewMode] = useState<'building' | 'campus'>('building');
  const [selectedRoom, setSelectedRoom] = useState<RoomDefinition | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<RoomDefinition | null>(null);

  const w = 920;
  const h = 500;
  const activeBounds = viewMode === 'building' ? BUILDING_MAP_BOUNDS : CAMPUS_DATA.bounds;
  const spanX = activeBounds.maxX - activeBounds.minX;
  const spanZ = activeBounds.maxZ - activeBounds.minZ;

  const toSvg = (wx: number, wz: number) => ({
    x: ((wx - activeBounds.minX) / spanX) * w,
    y: ((wz - activeBounds.minZ) / spanZ) * h,
  });

  const visitedSet = useMemo(() => new Set(visitedRooms), [visitedRooms]);
  const playerNorm = worldToMinimapNormalized(playerX, playerZ, activeBounds);
  const interiorRoomsOnFloor = INTERIOR_ROOMS_BY_FLOOR[activeFloor] ?? INTERIOR_ROOMS_BY_FLOOR[0];

  // Architectural courtyard landmarks
  const courtyardRect = toSvg(-48, -11);
  const nsWalkRect = toSvg(-3, -11);
  const ewWalkRect = toSvg(-22, 11.75);
  const southCoverRect = toSvg(-22, 25);
  const fountainCenter = toSvg(0, 15.5);
  const statueCenter = toSvg(-5.5, 1.5);
  const flagCenter = toSvg(5.5, 1.5);
  const pergolaWest = toSvg(-11.3, 8.25);
  const pergolaEast = toSvg(6.3, 8.25);
  const bldgFootprint = toSvg(-66, -37);
  const porticoFootprint = toSvg(-12, -11);

  const activeInspectionRoom = hoveredRoom ?? selectedRoom;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(20, 16, 28, 0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Carte complète de Maplewood High School"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl border-2 border-rose-200 p-4 md:p-6 text-[#1e1b2e] shadow-2xl flex flex-col gap-3.5"
        style={{
          backgroundColor: '#fffaf7',
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 27px, rgba(244, 63, 94, 0.055) 28px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar matching SettingsMenu & HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rose-200">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1e1b2e] leading-tight">
              Plan du Campus — Maplewood High School
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5c516b] mt-0.5 tabular-nums">
              <span>
                Zones explorées :{' '}
                <strong className="text-rose-600 font-semibold">
                  {visitedRooms.length} / {CAMPUS_DATA.rooms.length}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Ta position :{' '}
                <strong className="text-[#1e1b2e] font-semibold">
                  {FLOOR_LABELS[playerFloor]}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>Clique sur une salle pour voir ses détails</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === 'building' ? 'campus' : 'building'))
              }
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:border-rose-400 text-xs font-semibold text-[#1e1b2e] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              {viewMode === 'building' ? (
                <Minimize2 size={14} className="text-rose-600" />
              ) : (
                <Maximize2 size={14} className="text-rose-600" />
              )}
              <span>{viewMode === 'building' ? 'Campus complet' : 'Zoom Bâtiment'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <X size={14} />
              <span>Fermer [M]</span>
            </button>
          </div>
        </div>

        {/* Floor Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-rose-200 rounded-xl shadow-xs">
            <span className="px-2.5 text-xs font-semibold text-[#5c516b] flex items-center gap-1.5 whitespace-nowrap">
              <Layers size={13} className="text-rose-600" />
              Niveau :
            </span>
            {FLOORS.map((fl) => {
              const active = activeFloor === fl;
              const isHere = playerFloor === fl;
              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => {
                    setActiveFloor(fl);
                    if (
                      selectedRoom &&
                      selectedRoom.floor !== fl &&
                      selectedRoom.type !== 'exterior'
                    ) {
                      setSelectedRoom(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-[#3b334a] hover:text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  {FLOOR_LABELS[fl]}
                  {isHere ? ' (Toi)' : ''}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-[#5c516b] tabular-nums">
            {activeInspectionRoom ? (
              <span>
                <strong className="text-rose-600 font-semibold">
                  {activeInspectionRoom.name}
                </strong>{' '}
                · {activeInspectionRoom.building}
              </span>
            ) : (
              <span>
                Bâtiment Principal (132 m × 26 m) · {interiorRoomsOnFloor.length} espaces sur ce niveau
              </span>
            )}
          </div>
        </div>

        {/* Main Split: Spacious Blueprint SVG + Details Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_285px] gap-4 items-start">
          <div className="rounded-2xl border border-rose-200 overflow-hidden bg-[#f4f7f1] shadow-inner">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block select-none">
              <defs>
                <pattern
                  id="atrium-hatch"
                  width="8"
                  height="8"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="8" height="8" fill="#e2e8f0" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
                </pattern>
              </defs>

              {/* Exterior Campus Zones */}
              {EXTERIOR_ROOMS.map((room) => {
                const pos = toSvg(
                  room.position.x - room.size.w * 0.5,
                  room.position.z - room.size.d * 0.5
                );
                const rw = (room.size.w / spanX) * w;
                const rd = (room.size.d / spanZ) * h;
                const isSelected = selectedRoom?.id === room.id;

                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    onMouseEnter={() => setHoveredRoom(room)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className="cursor-pointer"
                  >
                    <title>{room.name}</title>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={rw}
                      height={rd}
                      fill={
                        room.id === 'courtyard'
                          ? 'rgba(187, 224, 179, 0.52)'
                          : 'rgba(167, 212, 162, 0.42)'
                      }
                      stroke={isSelected ? '#e11d48' : 'rgba(100, 148, 102, 0.42)'}
                      strokeWidth={isSelected ? 2.4 : 0.9}
                    />
                  </g>
                );
              })}

              {/* Courtyard Architectural Paths & Fountain Landmark */}
              <g pointerEvents="none" opacity={activeFloor === 0 ? 1 : 0.58}>
                <rect
                  x={courtyardRect.x}
                  y={courtyardRect.y}
                  width={(96 / spanX) * w}
                  height={(42 / spanZ) * h}
                  fill="none"
                  stroke="rgba(100, 116, 139, 0.35)"
                  strokeWidth={1}
                />
                {/* North-South & East-West Walkways */}
                <rect
                  x={nsWalkRect.x}
                  y={nsWalkRect.y}
                  width={(6 / spanX) * w}
                  height={(38 / spanZ) * h}
                  fill="#faf6f2"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />
                <rect
                  x={ewWalkRect.x}
                  y={ewWalkRect.y}
                  width={(44 / spanX) * w}
                  height={(4.5 / spanZ) * h}
                  fill="#faf6f2"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                />
                {/* Covered South Walkway */}
                <rect
                  x={southCoverRect.x}
                  y={southCoverRect.y}
                  width={(44 / spanX) * w}
                  height={(3.6 / spanZ) * h}
                  fill="#f1ebe6"
                  stroke="#94a3b8"
                  strokeWidth={0.9}
                />
                {/* Pergolas */}
                <rect
                  x={pergolaWest.x}
                  y={pergolaWest.y}
                  width={(5 / spanX) * w}
                  height={(3.2 / spanZ) * h}
                  fill="#fde68a"
                  fillOpacity={0.75}
                  stroke="#b45309"
                  strokeWidth={0.8}
                />
                <rect
                  x={pergolaEast.x}
                  y={pergolaEast.y}
                  width={(5 / spanX) * w}
                  height={(3.2 / spanZ) * h}
                  fill="#fde68a"
                  fillOpacity={0.75}
                  stroke="#b45309"
                  strokeWidth={0.8}
                />
                {/* Central Fountain */}
                <circle
                  cx={fountainCenter.x}
                  cy={fountainCenter.y}
                  r={(5.8 / spanX) * w}
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth={1.1}
                />
                <circle
                  cx={fountainCenter.x}
                  cy={fountainCenter.y}
                  r={(3.0 / spanX) * w}
                  fill="#38bdf8"
                  fillOpacity={0.78}
                  stroke="#0284c7"
                  strokeWidth={0.7}
                />
                {viewMode === 'building' && (
                  <>
                    <circle
                      cx={statueCenter.x}
                      cy={statueCenter.y}
                      r={3.5}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                    <circle
                      cx={flagCenter.x}
                      cy={flagCenter.y}
                      r={3.5}
                      fill="#e11d48"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                    <text
                      x={fountainCenter.x}
                      y={fountainCenter.y + (9.6 / spanZ) * h}
                      textAnchor="middle"
                      fill="#1e1b2e"
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      fontSize={10.5}
                      fontWeight="700"
                    >
                      Fontaine · Cour Centrale
                    </text>
                    <text
                      x={toSvg(-29, 2.5).x}
                      y={toSvg(-29, 2.5).y}
                      textAnchor="middle"
                      fill="#334155"
                      stroke="#ffffff"
                      strokeWidth={2.6}
                      paintOrder="stroke"
                      fontSize={10}
                      fontWeight="700"
                    >
                      Pelouse Ouest
                    </text>
                    <text
                      x={toSvg(29, 2.5).x}
                      y={toSvg(29, 2.5).y}
                      textAnchor="middle"
                      fill="#334155"
                      stroke="#ffffff"
                      strokeWidth={2.6}
                      paintOrder="stroke"
                      fontSize={10}
                      fontWeight="700"
                    >
                      Pelouse Est
                    </text>
                  </>
                )}
              </g>

              {/* Exterior Zone Labels in Campus Complet mode */}
              {viewMode === 'campus' && (
                <g pointerEvents="none">
                  {[
                    { id: 'sports-field', label: 'Parc Nord & Terrains', x: 0, z: -96 },
                    { id: 'campus-west-garden', label: 'Jardins Ouest', x: -72, z: 8 },
                    { id: 'campus-east-garden', label: 'Jardins Est', x: 72, z: 8 },
                    { id: 'courtyard', label: 'Cour Centrale', x: 0, z: 16 },
                    { id: 'campus-entrance', label: 'Parvis & Entrée Sud', x: 0, z: 40 },
                  ].map((item) => {
                    const p = toSvg(item.x, item.z);
                    return (
                      <text
                        key={item.id}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e1b2e"
                        stroke="#ffffff"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                        strokeLinejoin="round"
                        fontSize={12}
                        fontWeight="700"
                      >
                        {item.label}
                      </text>
                    );
                  })}
                </g>
              )}

              {/* MainBuilding Exterior Shell & South Portico */}
              <rect
                x={bldgFootprint.x}
                y={bldgFootprint.y}
                width={(132 / spanX) * w}
                height={(26 / spanZ) * h}
                fill="#fffaf7"
                stroke="#be123c"
                strokeWidth={2}
              />
              <rect
                x={porticoFootprint.x}
                y={porticoFootprint.y}
                width={(24 / spanX) * w}
                height={(3.2 / spanZ) * h}
                fill="#ffe4e6"
                stroke="#be123c"
                strokeWidth={1.2}
              />

              {/* Interior Rooms on Active Floor */}
              {interiorRoomsOnFloor.map((room) => {
                const pos = toSvg(
                  room.position.x - room.size.w * 0.5,
                  room.position.z - room.size.d * 0.5
                );
                const rw = (room.size.w / spanX) * w;
                const rd = (room.size.d / spanZ) * h;
                const isSelected = selectedRoom?.id === room.id;
                const isHovered = hoveredRoom?.id === room.id;
                const visited = visitedSet.has(room.id);
                const isVoid = room.type === 'atrium';
                const colors = getRoomColors(room.type, visited);
                const labelSpec =
                  viewMode === 'building' ? getRoomLabelSpec(room, rw, rd) : null;
                const cxRoom = pos.x + rw * 0.5;
                const cyRoom = pos.y + rd * 0.5;

                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    onMouseEnter={() => setHoveredRoom(room)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className="cursor-pointer"
                  >
                    <title>{room.name}</title>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={rw}
                      height={rd}
                      fill={isVoid ? 'url(#atrium-hatch)' : colors.fill}
                      stroke={
                        isSelected
                          ? '#e11d48'
                          : isHovered
                            ? '#fb7185'
                            : colors.stroke
                      }
                      strokeDasharray={isVoid ? '4 3' : undefined}
                      strokeWidth={isSelected ? 2.8 : isHovered ? 2 : 0.95}
                    />
                    {room.type === 'stairs' && viewMode === 'building' && rw > 22 && (
                      <g stroke="rgba(71, 85, 105, 0.25)" strokeWidth={1} pointerEvents="none">
                        {[0.2, 0.35, 0.5, 0.65, 0.8].map((t) => (
                          <line
                            key={t}
                            x1={pos.x + rw * 0.16}
                            y1={pos.y + rd * t}
                            x2={pos.x + rw * 0.84}
                            y2={pos.y + rd * t}
                          />
                        ))}
                      </g>
                    )}
                    {labelSpec && (
                      <text
                        x={cxRoom}
                        y={cyRoom}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={
                          labelSpec.rotated
                            ? `rotate(-90 ${cxRoom} ${cyRoom})`
                            : undefined
                        }
                        fill={isVoid ? '#334155' : '#1e1b2e'}
                        stroke="#ffffff"
                        strokeWidth={2.8}
                        paintOrder="stroke"
                        strokeLinejoin="round"
                        fontSize={labelSpec.fontSize}
                        fontWeight="700"
                        pointerEvents="none"
                      >
                        {labelSpec.lines.map((line, i) => {
                          const lineOffset =
                            (i - (labelSpec.lines.length - 1) * 0.5) *
                            (labelSpec.fontSize + 2);
                          return (
                            <tspan
                              key={i}
                              x={cxRoom}
                              y={cyRoom + lineOffset}
                              dominantBaseline="middle"
                            >
                              {line}
                            </tspan>
                          );
                        })}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Summary Building Labels in Campus Complet mode so text never overlaps */}
              {viewMode === 'campus' && (
                <g pointerEvents="none">
                  {[
                    { text: 'Aile Ouest', x: -42, z: -24 },
                    { text: 'Atrium Central', x: 0, z: -24 },
                    { text: 'Aile Est', x: 42, z: -24 },
                  ].map((lbl) => {
                    const p = toSvg(lbl.x, lbl.z);
                    return (
                      <text
                        key={lbl.text}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e1b2e"
                        stroke="#ffffff"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                        strokeLinejoin="round"
                        fontSize={11}
                        fontWeight="800"
                      >
                        {lbl.text}
                      </text>
                    );
                  })}
                  <text
                    x={toSvg(0, -42.5).x}
                    y={toSvg(0, -42.5).y}
                    textAnchor="middle"
                    fill="#9f1239"
                    stroke="#ffffff"
                    strokeWidth={3.2}
                    paintOrder="stroke"
                    fontSize={11.5}
                    fontWeight="800"
                  >
                    Bâtiment Principal · {FLOOR_LABELS[activeFloor]}
                  </text>
                </g>
              )}

              {/* Wing Headers in Zoom Bâtiment mode */}
              {viewMode === 'building' && (
                <g
                  pointerEvents="none"
                  fill="#9f1239"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                  fontSize={10.5}
                  fontWeight="800"
                >
                  <text x={toSvg(-54, -40.5).x} y={toSvg(-54, -40.5).y} textAnchor="middle">
                    AILE OUEST
                  </text>
                  <text x={toSvg(0, -40.5).x} y={toSvg(0, -40.5).y} textAnchor="middle">
                    ATRIUM CENTRAL · NORD
                  </text>
                  <text x={toSvg(54, -40.5).x} y={toSvg(54, -40.5).y} textAnchor="middle">
                    AILE EST
                  </text>
                </g>
              )}

              {/* NPCs on Active Floor */}
              {npcs.map((n) => {
                const npcFloor = n.y !== undefined ? getFloorFromY(n.y) : 0;
                if (npcFloor !== activeFloor) return null;
                const np = worldToMinimapNormalized(n.x, n.z, activeBounds);
                const nx = np.nx * w;
                const nz = np.nz * h;
                return (
                  <g key={n.id}>
                    <title>{n.name}</title>
                    <circle
                      cx={nx}
                      cy={nz}
                      r={5.5}
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              {/* Player Marker (solid rose when on active floor, hollow ring on other floors) */}
              <g pointerEvents="none">
                <title>Ta position</title>
                <circle
                  cx={playerNorm.nx * w}
                  cy={playerNorm.nz * h}
                  r={11}
                  fill={activeFloor === playerFloor ? 'rgba(225, 29, 72, 0.20)' : 'none'}
                />
                <circle
                  cx={playerNorm.nx * w}
                  cy={playerNorm.nz * h}
                  r={6.5}
                  fill={activeFloor === playerFloor ? '#e11d48' : 'rgba(255, 255, 255, 0.88)'}
                  stroke={activeFloor === playerFloor ? '#ffffff' : '#e11d48'}
                  strokeWidth={2.2}
                  strokeDasharray={activeFloor === playerFloor ? undefined : '3 2'}
                />
              </g>
            </svg>
          </div>

          {/* Right Inspection Panel matching SettingsMenu */}
          <div className="rounded-2xl border border-rose-200 p-4 bg-white/95 space-y-3.5 shadow-sm">
            <h3 className="font-display text-xl font-bold text-[#1e1b2e] leading-snug">
              {selectedRoom ? selectedRoom.name : 'Sélectionne une salle'}
            </h3>

            {selectedRoom ? (
              <div className="text-xs text-[#5c516b] space-y-2 tabular-nums">
                <div>
                  Localisation :{' '}
                  <span className="text-[#1e1b2e] font-semibold">
                    {selectedRoom.building}
                  </span>
                </div>
                <div>
                  Type :{' '}
                  <span className="text-[#1e1b2e] font-semibold">
                    {ROOM_TYPE_LABELS[selectedRoom.type] ?? selectedRoom.type}
                  </span>
                </div>
                <div>
                  Dimensions :{' '}
                  <span className="text-[#1e1b2e] font-semibold">
                    {selectedRoom.size.w} m × {selectedRoom.size.d} m
                  </span>
                </div>
                <div>
                  Statut :{' '}
                  <span
                    className={`font-semibold ${
                      visitedSet.has(selectedRoom.id) ? 'text-rose-600' : 'text-[#1e1b2e]'
                    }`}
                  >
                    {visitedSet.has(selectedRoom.id) ? 'Visitée' : 'Non visitée'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#5c516b] leading-relaxed">
                Clique sur une salle, un couloir, un escalier ou une zone extérieure sur le plan pour afficher ses informations.
              </p>
            )}

            {/* Legend */}
            <div className="pt-3 border-t border-rose-100 text-xs text-[#3b334a] space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-rose-600 border-2 border-white shadow-xs shrink-0" />
                <span>Ta position ({FLOOR_LABELS[playerFloor]})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#0284c7] border-2 border-white shadow-xs shrink-0" />
                <span>Personnel & élèves (PNJ)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-[#5c516b]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#c7d2fe] border border-[#4338ca]/50 shrink-0" />
                  <span>Cours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#a7f3d0] border border-[#047857]/50 shrink-0" />
                  <span>Labos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#e9d5ff] border border-[#7e22ce]/50 shrink-0" />
                  <span>Clubs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#fed7aa] border border-[#c2410c]/50 shrink-0" />
                  <span>Cafétéria</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
