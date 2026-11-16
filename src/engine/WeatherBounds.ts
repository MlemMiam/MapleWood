/**
 * Architectural roof & interior shelter bounding boxes used to keep exterior
 * weather particles (rain streaks, wind wisps, drifting motes) strictly outside
 * covered spaces and buildings.
 */
export function isUnderWeatherShelter(wx: number, wy: number, wz: number): boolean {
  // 1. MainBuilding full 4-story footprint + roof overhang & cupola (132m x 26m centered at Z=-24)
  if (wx >= -66.6 && wx <= 66.6 && wz >= -37.6 && wz <= -10.5 && wy <= 24.0) {
    return true;
  }

  // 2. MainBuilding South Portico entrance porch
  if (wx >= -12.6 && wx <= 12.6 && wz >= -11.4 && wz <= -7.2 && wy <= 10.2) {
    return true;
  }

  // 3. Covered South Walkway (Couloir couvert: X = -22..+22, Z = 25..28.8)
  if (wx >= -22.3 && wx <= 22.3 && wz >= 24.7 && wz <= 29.0 && wy <= 3.95) {
    return true;
  }

  // 4. East & West Covered Breezeways (centered at X = ±36, Z = -6..4)
  if ((Math.abs(wx - 36) <= 2.35 || Math.abs(wx + 36) <= 2.35) && wz >= -6.2 && wz <= 4.2 && wy <= 3.85) {
    return true;
  }

  return false;
}
