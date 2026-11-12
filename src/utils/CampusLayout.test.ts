import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPUS_DATA,
  findRoomAtPosition,
  getRoomById,
  validateCampusArchitecture,
  worldToMinimapNormalized,
} from './CampusLayout';

test('campus architecture validates corridor widths >= 3m and open spawn', () => {
  const result = validateCampusArchitecture();
  assert.equal(result.valid, true, `Issues found: ${result.issues.join('; ')}`);
});

test('findRoomAtPosition resolves interior rooms accurately over exterior', () => {
  const lobby = findRoomAtPosition(0, -9);
  assert.equal(lobby?.id, 'lobby');

  const corridor = findRoomAtPosition(15, -14);
  assert.equal(corridor?.id, 'main-corridor');

  const chemLab = findRoomAtPosition(38, -19);
  assert.equal(chemLab?.id, 'lab-chemistry');

  const gym = findRoomAtPosition(0, -44);
  assert.equal(gym?.id, 'gymnasium');

  const cafeteria = findRoomAtPosition(-36, 14);
  assert.equal(cafeteria?.id, 'cafeteria');

  const library = findRoomAtPosition(36, 14);
  assert.equal(library?.id, 'library');

  const principal = findRoomAtPosition(-47, -19);
  assert.equal(principal?.id, 'admin-principal');
});

test('spawn point is in Courtyard in front of main entrance', () => {
  const spawnRoom = findRoomAtPosition(CAMPUS_DATA.spawn.x, CAMPUS_DATA.spawn.z);
  assert.equal(spawnRoom?.id, 'courtyard');
  assert.ok(getRoomById('room-101'));
  assert.ok(CAMPUS_DATA.rooms.length >= 25);
});

test('worldToMinimapNormalized clamps and scales bounds properly', () => {
  const topLeft = worldToMinimapNormalized(CAMPUS_DATA.bounds.minX, CAMPUS_DATA.bounds.minZ);
  assert.equal(topLeft.nx, 0);
  assert.equal(topLeft.nz, 0);

  const bottomRight = worldToMinimapNormalized(CAMPUS_DATA.bounds.maxX, CAMPUS_DATA.bounds.maxZ);
  assert.equal(bottomRight.nx, 1);
  assert.equal(bottomRight.nz, 1);
});
