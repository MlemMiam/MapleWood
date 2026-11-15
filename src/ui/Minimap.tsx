import React from 'react';
import { CAMPUS_DATA, worldToMinimapNormalized } from '../utils/CampusLayout';

export interface MinimapNpcMarker {
  id: string;
  name: string;
  x: number;
  z: number;
}

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  npcs: MinimapNpcMarker[];
}

export const Minimap: React.FC<MinimapProps> = ({
  playerX,
  playerZ,
  playerYaw,
  npcs,
}) => {
  const size = 160;
  const p = worldToMinimapNormalized(playerX, playerZ);
  const px = p.nx * size;
  const pz = p.nz * size;
  const headingDeg = (-playerYaw * 180) / Math.PI;

  const spanX = CAMPUS_DATA.bounds.maxX - CAMPUS_DATA.bounds.minX;
  const spanZ = CAMPUS_DATA.bounds.maxZ - CAMPUS_DATA.bounds.minZ;

  return (
    <div
      className="relative overflow-hidden rounded-full border-2 border-rose-300/90 ring-4 ring-white/45 shadow-md backdrop-blur-md"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(255, 249, 251, 0.90)',
      }}
      aria-label="Minicarte du campus"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Soft pastel grid rings for cute radar feel */}
        <circle
          cx={size * 0.5}
          cy={size * 0.5}
          r={size * 0.34}
          fill="none"
          stroke="rgba(244, 63, 94, 0.10)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Campus Rooms & Buildings */}
        {CAMPUS_DATA.rooms.map((room) => {
          const rx =
            ((room.position.x - room.size.w * 0.5 - CAMPUS_DATA.bounds.minX) / spanX) * size;
          const rz =
            ((room.position.z - room.size.d * 0.5 - CAMPUS_DATA.bounds.minZ) / spanZ) * size;
          const rw = (room.size.w / spanX) * size;
          const rd = (room.size.d / spanZ) * size;

          return (
            <rect
              key={room.id}
              x={rx}
              y={rz}
              width={Math.max(2, rw)}
              height={Math.max(2, rd)}
              rx={2}
              ry={2}
              fill={
                room.type === 'exterior'
                  ? 'rgba(134, 197, 138, 0.38)'
                  : 'rgba(254, 205, 211, 0.62)'
              }
              stroke={
                room.type === 'exterior'
                  ? 'rgba(100, 160, 110, 0.35)'
                  : 'rgba(225, 29, 72, 0.28)'
              }
              strokeWidth={room.type === 'exterior' ? 0.6 : 0.9}
            />
          );
        })}

        {/* NPC Markers */}
        {npcs.map((n) => {
          const np = worldToMinimapNormalized(n.x, n.z);
          return (
            <circle
              key={n.id}
              cx={np.nx * size}
              cy={np.nz * size}
              r={2.9}
              fill="#fb7185"
              stroke="#ffffff"
              strokeWidth={1}
            />
          );
        })}

        {/* Player Soft Halo & Rose Directional Pointer */}
        <g transform={`translate(${px}, ${pz}) rotate(${headingDeg})`}>
          <circle cx={0} cy={0} r={8.5} fill="rgba(225, 29, 72, 0.16)" />
          <polygon
            points="0,-6.5 4.8,5 0,2.2 -4.8,5"
            fill="#e11d48"
            stroke="#ffffff"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-white/90 border border-rose-200 text-[9px] font-bold text-rose-600 shadow-xs pointer-events-none">
        N
      </div>
    </div>
  );
};
