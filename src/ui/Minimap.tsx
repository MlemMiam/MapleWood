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
  const size = 168;
  const p = worldToMinimapNormalized(playerX, playerZ);
  const px = p.nx * size;
  const pz = p.nz * size;
  const headingDeg = (-playerYaw * 180) / Math.PI;

  const spanX = CAMPUS_DATA.bounds.maxX - CAMPUS_DATA.bounds.minX;
  const spanZ = CAMPUS_DATA.bounds.maxZ - CAMPUS_DATA.bounds.minZ;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[#D4AF37]/50"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(11, 19, 34, 0.90)',
      }}
      aria-label="Minicarte du campus"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
              fill={room.type === 'exterior' ? 'rgba(74, 124, 63, 0.35)' : room.color}
              stroke="rgba(248, 250, 252, 0.25)"
              strokeWidth={room.type === 'exterior' ? 0.5 : 0.7}
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
              r={2.8}
              fill="#38BDF8"
              stroke="#0F172A"
              strokeWidth={0.8}
            />
          );
        })}

        {/* Player Arrow */}
        <g transform={`translate(${px}, ${pz}) rotate(${headingDeg})`}>
          <polygon
            points="0,-6 4.5,5 0,2.5 -4.5,5"
            fill="#D4AF37"
            stroke="#0F172A"
            strokeWidth={1}
          />
        </g>
      </svg>
      <div
        className="absolute bottom-1 right-1.5 text-[10px] font-mono-tabular text-slate-300 pointer-events-none"
        style={{ textShadow: '0 1px 2px #000' }}
      >
        N ↑
      </div>
    </div>
  );
};
