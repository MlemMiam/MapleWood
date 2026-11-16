import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPUS_DATA,
  findRoomAtPosition,
  getFloorFromY,
  getRoomById,
  getSafeTeleportPosition,
  validateCampusArchitecture,
  worldToMinimapNormalized,
} from './CampusLayout';

test('campus architecture validates corridor widths >= 3m and open spawn', () => {
  const result = validateCampusArchitecture();
  assert.equal(result.valid, true, `Issues found: ${result.issues.join('; ')}`);
});

test('findRoomAtPosition resolves multi-floor MainBuilding rooms and exterior zones accurately', () => {
  // RDC (Floor 0)
  const lobby = findRoomAtPosition(0, -15, 0.05);
  assert.equal(lobby?.id, 'lobby');

  const frontPortico = findRoomAtPosition(0, -9, 0.05);
  assert.equal(frontPortico?.id, 'lobby');

  const westCorridor = findRoomAtPosition(-25, -24, 0.05);
  assert.equal(westCorridor?.id, 'corridor-rdc-west');

  const eastCorridor = findRoomAtPosition(25, -24, 0.05);
  assert.equal(eastCorridor?.id, 'main-corridor');

  const principal = findRoomAtPosition(-56.7, -16.7, 0.05);
  assert.equal(principal?.id, 'admin-principal');

  const cafeteria = findRoomAtPosition(35, -16.7, 0.05);
  assert.equal(cafeteria?.id, 'cafeteria');

  // 1er Étage (Floor 1)
  const library = findRoomAtPosition(-56.7, -16.7, 4.9);
  assert.equal(library?.id, 'library');

  const maths = findRoomAtPosition(-21, -17.15, 4.9);
  assert.equal(maths?.id, 'room-101');

  const chemLab = findRoomAtPosition(30, -30.55, 4.9);
  assert.equal(chemLab?.id, 'lab-chemistry');

  // 2e Étage (Floor 2)
  const gameRoom = findRoomAtPosition(21, -17.15, 9.5);
  assert.equal(gameRoom?.id, 'et2-gameroom');

  const theater = findRoomAtPosition(-30, -30.55, 9.5);
  assert.equal(theater?.id, 'et2-theater');

  // 3e Étage (Floor 3)
  const conference = findRoomAtPosition(0, -16.7, 14.1);
  assert.equal(conference?.id, 'et3-conference');

  const examEast = findRoomAtPosition(25.5, -30.55, 14.1);
  assert.equal(examEast?.id, 'et3-exam-east');
});

test('getFloorFromY and getSafeTeleportPosition handle multi-story coordinates', () => {
  assert.equal(getFloorFromY(0.05), 0);
  assert.equal(getFloorFromY(4.85), 1);
  assert.equal(getFloorFromY(9.45), 2);
  assert.equal(getFloorFromY(14.05), 3);

  const atrium1 = getRoomById('atrium-et1');
  assert.ok(atrium1);
  const safePos = getSafeTeleportPosition(atrium1);
  assert.ok(safePos.z > -22, 'Atrium fast travel must place player on safe mezzanine balcony');
});

test('spawn point is in Courtyard in front of main entrance', () => {
  const spawnRoom = findRoomAtPosition(CAMPUS_DATA.spawn.x, CAMPUS_DATA.spawn.z);
  assert.equal(spawnRoom?.id, 'courtyard');
  assert.ok(getRoomById('room-101'));
  assert.ok(CAMPUS_DATA.rooms.length >= 60);
});

test('worldToMinimapNormalized clamps and scales bounds properly', () => {
  const topLeft = worldToMinimapNormalized(CAMPUS_DATA.bounds.minX, CAMPUS_DATA.bounds.minZ);
  assert.equal(topLeft.nx, 0);
  assert.equal(topLeft.nz, 0);

  const bottomRight = worldToMinimapNormalized(CAMPUS_DATA.bounds.maxX, CAMPUS_DATA.bounds.maxZ);
  assert.equal(bottomRight.nx, 1);
  assert.equal(bottomRight.nz, 1);
});
