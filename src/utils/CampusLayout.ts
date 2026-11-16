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
  teleport?: { x: number; y: number; z: number };
  size: { w: number; d: number };
  doors: DoorRef[];
  npcs: string[];
}

export interface BoundsRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CampusData {
  schoolName: string;
  mascot: string;
  spawn: { x: number; y: number; z: number; yaw: number };
  bounds: BoundsRect;
  buildingBounds?: BoundsRect;
  rooms: RoomDefinition[];
}

export const CAMPUS_DATA: CampusData = roomsData as CampusData;

export const FLOOR_LABELS: Record<number, string> = {
  0: 'RDC',
  1: '1er Étage',
  2: '2e Étage',
  3: '3e Étage',
};

export const BUILDING_MAP_BOUNDS: BoundsRect = CAMPUS_DATA.buildingBounds
  ? {
      minX: CAMPUS_DATA.buildingBounds.minX - 6,
      maxX: CAMPUS_DATA.buildingBounds.maxX + 6,
      minZ: CAMPUS_DATA.buildingBounds.minZ - 8,
      maxZ: 34,
    }
  : {
      minX: -72,
      maxX: 72,
      minZ: -45,
      maxZ: 34,
    };

export function getFloorFromY(y: number): number {
  if (y >= 12.5) return 3;
  if (y >= 8.0) return 2;
  if (y >= 3.6) return 1;
  return 0;
}

export function getRoomById(id: string): RoomDefinition | undefined {
  return CAMPUS_DATA.rooms.find((r) => r.id === id);
}

export function getSafeTeleportPosition(room: RoomDefinition): {
  x: number;
  y: number;
  z: number;
} {
  return room.teleport ?? room.position;
}

function isPointInsideRoom(x: number, z: number, room: RoomDefinition): boolean {
  const halfW = room.size.w * 0.5;
  const halfD = room.size.d * 0.5;
  return (
    x >= room.position.x - halfW &&
    x <= room.position.x + halfW &&
    z >= room.position.z - halfD &&
    z <= room.position.z + halfD
  );
}

/**
 * Finds the most specific room or exterior zone containing world coordinate (x, z) and optional y.
 * Prefers interior rooms on the matching floor over exterior zones when bounding boxes overlap.
 */
export function findRoomAtPosition(
  x: number,
  z: number,
  y?: number
): RoomDefinition | null {
  const targetFloor = y !== undefined ? getFloorFromY(y) : 0;
  let atriumMatch: RoomDefinition | null = null;
  let fallbackExterior: RoomDefinition | null = null;

  for (const room of CAMPUS_DATA.rooms) {
    if (!isPointInsideRoom(x, z, room)) continue;
    if (room.type === 'exterior') {
      if (!fallbackExterior) fallbackExterior = room;
      continue;
    }
    if (room.floor === targetFloor) {
      if (room.type === 'atrium') {
        atriumMatch = room;
      } else {
        return room;
      }
    }
  }

  if (atriumMatch) return atriumMatch;

  // Fallback for 2-arg lookups in case a specific floor-agnostic interior room is queried
  if (y === undefined) {
    for (const room of CAMPUS_DATA.rooms) {
      if (room.type !== 'exterior' && room.type !== 'atrium' && isPointInsideRoom(x, z, room)) {
        return room;
      }
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

  const spawnRoom = findRoomAtPosition(
    CAMPUS_DATA.spawn.x,
    CAMPUS_DATA.spawn.z,
    CAMPUS_DATA.spawn.y
  );
  if (!spawnRoom || spawnRoom.id !== 'courtyard') {
    issues.push('Spawn point must be inside the open Courtyard facing the entrance');
  }

  return { valid: issues.length === 0, issues };
}
