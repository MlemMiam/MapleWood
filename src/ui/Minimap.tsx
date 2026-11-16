import React from 'react';
import { CAMPUS_DATA, FLOOR_LABELS, getFloorFromY } from '../utils/CampusLayout';

export interface MinimapNpcMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  y?: number;
}

interface MinimapProps {
  playerX: number;
  playerY?: number;
  playerZ: number;
  playerYaw: number;
  npcs: MinimapNpcMarker[];
  onOpenMap?: () => void;
}

function getMinimapRoomFill(type: string): string {
  switch (type) {
    case 'lobby':
      return '#fbcfe8';
    case 'corridor':
      return '#f1f5f9';
    case 'classroom':
      return '#dbeafe';
    case 'lab':
      return '#d1fae5';
    case 'library':
      return '#fef3c7';
    case 'dining':
      return '#ffedd5';
    case 'club':
      return '#ede9fe';
    case 'admin':
      return '#ffe4e6';
    case 'restroom':
      return '#e0f2fe';
    case 'stairs':
    case 'elevator':
      return '#e2e8f0';
    case 'atrium':
      return 'rgba(100, 116, 139, 0.22)';
    default:
      return '#fce7f3';
  }
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerY = 0.05,
  playerZ,
  playerYaw,
  npcs,
  onOpenMap,
}) => {
  const size = 162;
  const radarSpan = 88;
  const scale = size / radarSpan;
  const cx = size * 0.5;
  const cy = size * 0.5;
  const headingDeg = (-playerYaw * 180) / Math.PI;
  const currentFloor = getFloorFromY(playerY);

  const toRadar = (wx: number, wz: number) => ({
    x: cx + (wx - playerX) * scale,
    y: cy + (wz - playerZ) * scale,
  });

  const visibleRooms = CAMPUS_DATA.rooms.filter(
    (room) => room.type === 'exterior' || room.floor === currentFloor
  );

  // Courtyard landmarks (Walkways, Fountain, Portico)
  const nsWalk = toRadar(-3, -11);
  const ewWalk = toRadar(-22, 11.75);
  const fountainPos = toRadar(0, 15.5);
  const bldgShell = toRadar(-66, -37);
  const portico = toRadar(-12, -11);

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.currentTarget.blur();
        onOpenMap?.();
      }}
      title="Ouvrir la carte complète [M]"
      aria-label="Minicarte du campus — cliquer pour ouvrir la carte complète"
      className="pointer-events-auto group flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
    >
      <div
        className="relative overflow-hidden rounded-full border-2 border-rose-200/95 group-hover:border-rose-400 shadow-sm backdrop-blur-md transition-colors"
        style={{
          width: size,
          height: size,
          backgroundColor: 'rgba(255, 249, 251, 0.90)',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Soft campus meadow background */}
          <circle cx={cx} cy={cy} r={size * 0.5} fill="#f7f5f3" />

          {/* Exterior zones */}
          {visibleRooms
            .filter((r) => r.type === 'exterior')
            .map((room) => {
              const topLeft = toRadar(
                room.position.x - room.size.w * 0.5,
                room.position.z - room.size.d * 0.5
              );
              return (
                <rect
                  key={room.id}
                  x={topLeft.x}
                  y={topLeft.y}
                  width={room.size.w * scale}
                  height={room.size.d * scale}
                  fill="rgba(167, 212, 162, 0.34)"
                  stroke="rgba(120, 172, 122, 0.36)"
                  strokeWidth={0.6}
                />
              );
            })}

          {/* Courtyard walkways & central fountain */}
          <rect
            x={nsWalk.x}
            y={nsWalk.y}
            width={6 * scale}
            height={39 * scale}
            fill="rgba(255, 250, 247, 0.92)"
            stroke="rgba(203, 213, 225, 0.65)"
            strokeWidth={0.5}
          />
          <rect
            x={ewWalk.x}
            y={ewWalk.y}
            width={44 * scale}
            height={4.5 * scale}
            fill="rgba(255, 250, 247, 0.92)"
            stroke="rgba(203, 213, 225, 0.65)"
            strokeWidth={0.5}
          />
          <circle
            cx={fountainPos.x}
            cy={fountainPos.y}
            r={5.8 * scale}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth={0.8}
          />
          <circle
            cx={fountainPos.x}
            cy={fountainPos.y}
            r={2.9 * scale}
            fill="#38bdf8"
            fillOpacity={0.72}
          />

          {/* MainBuilding architectural shell */}
          <rect
            x={bldgShell.x}
            y={bldgShell.y}
            width={132 * scale}
            height={26 * scale}
            rx={2}
            fill="#fffaf7"
            stroke="#e11d48"
            strokeOpacity={0.45}
            strokeWidth={1.1}
          />
          <rect
            x={portico.x}
            y={portico.y}
            width={24 * scale}
            height={3.2 * scale}
            fill="#ffe4e6"
            stroke="#e11d48"
            strokeOpacity={0.4}
            strokeWidth={0.8}
          />

          {/* Interior rooms on player's active floor */}
          {visibleRooms
            .filter((r) => r.type !== 'exterior')
            .map((room) => {
              const topLeft = toRadar(
                room.position.x - room.size.w * 0.5,
                room.position.z - room.size.d * 0.5
              );
              const rw = room.size.w * scale;
              const rd = room.size.d * scale;
              const isVoid = room.type === 'atrium';

              return (
                <rect
                  key={room.id}
                  x={topLeft.x}
                  y={topLeft.y}
                  width={Math.max(1.5, rw)}
                  height={Math.max(1.5, rd)}
                  fill={getMinimapRoomFill(room.type)}
                  stroke={isVoid ? '#64748b' : 'rgba(159, 18, 57, 0.34)'}
                  strokeDasharray={isVoid ? '2 2' : undefined}
                  strokeWidth={0.7}
                />
              );
            })}

          {/* Subtle range reticle */}
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.32}
            fill="none"
            stroke="rgba(225, 29, 72, 0.14)"
            strokeWidth={0.9}
            strokeDasharray="3 3"
          />

          {/* NPC Markers */}
          {npcs.map((n) => {
            const npcFloor = n.y !== undefined ? getFloorFromY(n.y) : 0;
            if (npcFloor !== currentFloor) return null;
            const np = toRadar(n.x, n.z);
            return (
              <circle
                key={n.id}
                cx={np.x}
                cy={np.y}
                r={3.2}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={1.2}
              />
            );
          })}

          {/* Player FOV cone & directional arrow */}
          <g transform={`translate(${cx}, ${cy}) rotate(${headingDeg})`}>
            <path
              d="M 0,0 L -11,-21 A 23,23 0 0,1 11,-21 Z"
              fill="rgba(225, 29, 72, 0.13)"
            />
            <polygon
              points="0,-6.5 4.8,5 0,2.2 -4.8,5"
              fill="#e11d48"
              stroke="#ffffff"
              strokeWidth={1.3}
              strokeLinejoin="round"
            />
          </g>

          {/* Clean integrated North indicator */}
          <rect
            x={cx - 8}
            y={3}
            width={16}
            height={13}
            rx={4}
            fill="rgba(255, 249, 251, 0.92)"
            stroke="rgba(244, 63, 94, 0.35)"
            strokeWidth={0.8}
          />
          <text
            x={cx}
            y={12}
            textAnchor="middle"
            fontSize={9}
            fontWeight="800"
            fill="#e11d48"
          >
            N
          </text>
        </svg>

        {/* Bottom HUD floor & shortcut bar integrated into radar bezel */}
        <div
          className="absolute bottom-0 inset-x-0 py-1 px-2 border-t border-rose-200/80 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#1e1b2e]"
          style={{ backgroundColor: 'rgba(255, 249, 251, 0.92)' }}
        >
          <span className="text-rose-600">{FLOOR_LABELS[currentFloor] ?? 'RDC'}</span>
          <span aria-hidden="true" className="text-rose-300">
            ·
          </span>
          <span className="font-mono-tabular text-[#5c516b]">[M]</span>
        </div>
      </div>
    </button>
  );
};
