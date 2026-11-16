import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnderWeatherShelter } from './WeatherBounds';

test('isUnderWeatherShelter excludes all MainBuilding stories, portico, and covered walkways', () => {
  // Ground floor lobby, corridors, cafeteria, auditorium/admin inside MainBuilding
  assert.equal(isUnderWeatherShelter(0, 1.5, -15), true);
  assert.equal(isUnderWeatherShelter(-55, 2.0, -24), true);
  assert.equal(isUnderWeatherShelter(55, 2.0, -31), true);

  // Upper floors (1st, 2nd, 3rd floors & atrium)
  assert.equal(isUnderWeatherShelter(0, 6.0, -24), true);
  assert.equal(isUnderWeatherShelter(-30, 10.5, -18), true);
  assert.equal(isUnderWeatherShelter(40, 16.0, -28), true);

  // South Portico porch
  assert.equal(isUnderWeatherShelter(0, 2.5, -9.0), true);
  assert.equal(isUnderWeatherShelter(-8, 4.0, -8.5), true);

  // Covered South Walkway & Breezeways
  assert.equal(isUnderWeatherShelter(0, 2.0, 26.8), true);
  assert.equal(isUnderWeatherShelter(-36, 2.0, -1.0), true);
  assert.equal(isUnderWeatherShelter(36, 2.0, -1.0), true);
});

test('isUnderWeatherShelter leaves open Courtyard, Plaza, and Campus Gardens exposed', () => {
  // Central Fountain & Courtyard walkways
  assert.equal(isUnderWeatherShelter(0, 3.0, 15.5), false);
  assert.equal(isUnderWeatherShelter(0, 2.0, 6.0), false);
  assert.equal(isUnderWeatherShelter(-10, 4.0, 14.0), false);
  assert.equal(isUnderWeatherShelter(10, 4.0, 2.0), false);

  // Open areas East/West/North of MainBuilding
  assert.equal(isUnderWeatherShelter(-75, 2.0, -24), false);
  assert.equal(isUnderWeatherShelter(75, 2.0, -24), false);
  assert.equal(isUnderWeatherShelter(0, 3.0, -60), false);

  // High above MainBuilding roof (> 24m)
  assert.equal(isUnderWeatherShelter(0, 26.0, -24), false);
});
