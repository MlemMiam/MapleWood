import roomsData from '../data/rooms.json';

export interface DoorRef {
  x: number;
  z: number;
  to: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  building: string;
  floor: number;
  type: string;
  color: string;
  position: { x: number; y: number; z: number };
  size: { w: number; d: number };
  doors: DoorRef[];
  npcs: string[];
}

export interface CampusData {
  schoolName: string;
  mascot: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  rooms: RoomDefinition[];
}

export const CAMPUS_DATA: CampusData = roomsData as CampusData;

export function getRoomById(id: string): RoomDefinition | undefined {
  return CAMPUS_DATA.rooms.find((r) => r.id === id);
}

/**
 * Finds the most specific room or exterior zone containing world coordinate (x, z).
 * Prefers interior rooms over exterior zones when bounding boxes overlap.
 */
export function findRoomAtPosition(x: number, z: number): RoomDefinition | null {
  let fallbackExterior: RoomDefinition | null = null;
  for (const room of CAMPUS_DATA.rooms) {
    const halfW = room.size.w * 0.5;
    const halfD = room.size.d * 0.5;
    const inside =
      x >= room.position.x - halfW &&
      x <= room.position.x + halfW &&
      z >= room.position.z - halfD &&
      z <= room.position.z + halfD;
    if (inside) {
      if (room.type !== 'exterior') {
        return room;
      }
      fallbackExterior = room;
    }
  }
  return fallbackExterior;
}

/**
 * Converts world (x, z) coordinates into normalized [0, 1] minimap coordinates
 * where (0, 0) is top-left (minX, minZ) and (1, 1) is bottom-right (maxX, maxZ).
 */
export function worldToMinimapNormalized(
  x: number,
  z: number,
  bounds = CAMPUS_DATA.bounds
): { nx: number; nz: number } {
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const nx = Math.max(0, Math.min(1, (x - bounds.minX) / spanX));
  const nz = Math.max(0, Math.min(1, (z - bounds.minZ) / spanZ));
  return { nx, nz };
}

/**
 * Validates that all interior corridors are at least 3.0m wide and spawn is unobstructed.
 */
export function validateCampusArchitecture(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  for (const room of CAMPUS_DATA.rooms) {
    if (room.type === 'corridor') {
      const minDim = Math.min(room.size.w, room.size.d);
      if (minDim < 3.0) {
        issues.push(`Corridor ${room.id} width ${minDim}m is below 3.0m minimum`);
      }
    }
  }

  const spawnRoom = findRoomAtPosition(CAMPUS_DATA.spawn.x, CAMPUS_DATA.spawn.z);
  if (!spawnRoom || spawnRoom.id !== 'courtyard') {
    issues.push('Spawn point must be inside the open Courtyard facing the entrance');
  }

  return { valid: issues.length === 0, issues };
}
