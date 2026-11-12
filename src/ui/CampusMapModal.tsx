import React, { useState } from 'react';
import { CAMPUS_DATA, type RoomDefinition, worldToMinimapNormalized } from '../utils/CampusLayout';
import type { MinimapNpcMarker } from './Minimap';

interface CampusMapModalProps {
  playerX: number;
  playerZ: number;
  visitedRooms: string[];
  npcs: MinimapNpcMarker[];
  onFastTravel: (room: RoomDefinition) => void;
  onClose: () => void;
}

export const CampusMapModal: React.FC<CampusMapModalProps> = ({
  playerX,
  playerZ,
  visitedRooms,
  npcs,
  onFastTravel,
  onClose,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<RoomDefinition | null>(null);
  const w = 680;
  const h = 520;
  const spanX = CAMPUS_DATA.bounds.maxX - CAMPUS_DATA.bounds.minX;
  const spanZ = CAMPUS_DATA.bounds.maxZ - CAMPUS_DATA.bounds.minZ;
  const playerNorm = worldToMinimapNormalized(playerX, playerZ);

  const getCompactLabel = (room: RoomDefinition, rw: number): string | null => {
    if (rw < 30) return null;
    const base = room.name.split('—')[0].trim();
    if (rw >= 115) return base;

    const shortMap: Record<string, string> = {
      "Hall d'entrée": 'Hall',
      'Bibliothèque & Centre de Médias': 'Bibliothèque',
      'Bureau du Principal': rw >= 58 ? 'Principal' : 'Dir.',
      'Secrétariat': rw >= 58 ? 'Secrét.' : 'Sec.',
      'Infirmerie': rw >= 58 ? 'Infirm.' : 'Inf.',
      'Salle des Professeurs': rw >= 58 ? 'Profs' : 'Prof.',
      'Toilettes Hommes': 'WC H',
      'Toilettes Femmes': 'WC F',
      'Laboratoire de Chimie': rw >= 65 ? 'Chimie' : 'Chim.',
      'Laboratoire de Biologie': rw >= 65 ? 'Biologie' : 'Bio.',
      'Laboratoire de Physique': rw >= 65 ? 'Physique' : 'Phys.',
      'Salle de Préparation': 'Prép.',
      'Couloir Couvert': 'Couloir Couvert',
      'Parking Enseignants': 'Parking Profs',
      'Parking Élèves': 'Parking Élèves',
    };
    if (shortMap[base]) return shortMap[base];

    const match = base.match(/^Salle\s+(\d+)/i);
    if (match) {
      return rw >= 56 ? `Salle ${match[1]}` : match[1];
    }
    return rw >= 65 ? base : base.slice(0, 6);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 11, 20, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Carte complète de Maplewood High School"
    >
      <div
        className="w-full max-w-4xl rounded-xl border border-[#D4AF37] p-5 text-slate-100 flex flex-col gap-4"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Plan du Campus — Maplewood High School
            </h2>
            <p className="text-xs text-slate-300">
              Zones explorées : {visitedRooms.length} / {CAMPUS_DATA.rooms.length} · Cliquez sur une salle pour vous y téléporter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-600 text-xs font-semibold text-white hover:border-[#D4AF37] cursor-pointer"
          >
            Fermer [M]
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 rounded-lg border border-slate-700 overflow-hidden bg-[#0b1322]">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block">
              <defs>
                {CAMPUS_DATA.rooms.map((room) => {
                  const rx =
                    ((room.position.x - room.size.w * 0.5 - CAMPUS_DATA.bounds.minX) / spanX) * w;
                  const rz =
                    ((room.position.z - room.size.d * 0.5 - CAMPUS_DATA.bounds.minZ) / spanZ) * h;
                  const rw = (room.size.w / spanX) * w;
                  const rd = (room.size.d / spanZ) * h;
                  return (
                    <clipPath key={`clip-${room.id}`} id={`map-clip-${room.id}`}>
                      <rect
                        x={rx + 2}
                        y={rz + 2}
                        width={Math.max(0, rw - 4)}
                        height={Math.max(0, rd - 4)}
                      />
                    </clipPath>
                  );
                })}
              </defs>

              {CAMPUS_DATA.rooms.map((room) => {
                const rx =
                  ((room.position.x - room.size.w * 0.5 - CAMPUS_DATA.bounds.minX) / spanX) * w;
                const rz =
                  ((room.position.z - room.size.d * 0.5 - CAMPUS_DATA.bounds.minZ) / spanZ) * h;
                const rw = (room.size.w / spanX) * w;
                const rd = (room.size.d / spanZ) * h;
                const isSelected = selectedRoom?.id === room.id;
                const visited = visitedRooms.includes(room.id);
                const label = rd > 16 ? getCompactLabel(room, rw) : null;

                return (
                  <g
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="cursor-pointer"
                  >
                    <title>{room.name}</title>
                    <rect
                      x={rx}
                      y={rz}
                      width={rw}
                      height={rd}
                      fill={room.type === 'exterior' ? 'rgba(74, 124, 63, 0.28)' : room.color}
                      fillOpacity={visited ? 0.95 : 0.65}
                      stroke={isSelected ? '#D4AF37' : '#94A3B8'}
                      strokeWidth={isSelected ? 2.5 : 0.9}
                    />
                    {label && (
                      <text
                        x={rx + rw * 0.5}
                        y={rz + rd * 0.5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#F8FAFC"
                        fontSize={rw > 85 ? 10 : rw > 48 ? 8 : 7}
                        fontWeight="600"
                        clipPath={`url(#map-clip-${room.id})`}
                      >
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}

              {npcs.map((n) => {
                const np = worldToMinimapNormalized(n.x, n.z);
                return (
                  <circle
                    key={n.id}
                    cx={np.nx * w}
                    cy={np.nz * h}
                    r={5}
                    fill="#38BDF8"
                    stroke="#0F172A"
                    strokeWidth={1.5}
                  />
                );
              })}

              <circle
                cx={playerNorm.nx * w}
                cy={playerNorm.nz * h}
                r={7}
                fill="#D4AF37"
                stroke="#0F172A"
                strokeWidth={2}
              />
            </svg>
          </div>

          <div className="rounded-lg border border-slate-700 p-4 bg-slate-900/90 space-y-3">
            <h3 className="font-display text-lg font-bold text-[#D4AF37]">
              {selectedRoom ? selectedRoom.name : 'Sélectionnez une salle'}
            </h3>
            {selectedRoom ? (
              <>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>Bâtiment : {selectedRoom.building}</div>
                  <div>
                    Dimensions : {selectedRoom.size.w} m × {selectedRoom.size.d} m
                  </div>
                  <div>
                    Statut :{' '}
                    {visitedRooms.includes(selectedRoom.id) ? 'Visitée' : 'Non visitée'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFastTravel(selectedRoom)}
                  className="w-full py-2 px-3 rounded-md text-xs font-semibold text-[#0F172A] cursor-pointer"
                  style={{ backgroundColor: '#D4AF37' }}
                >
                  Aller à cette zone
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                Cliquez sur n'importe quel bâtiment ou salle de classe sur le plan pour afficher ses détails ou vous y rendre directement.
              </p>
            )}
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div>Point or : Votre position</div>
              <div>Points bleus : Personnel & élèves (PNJ)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
