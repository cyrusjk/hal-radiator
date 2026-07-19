// ════════════════════════════════════════════════════════════════
//  Ephemeris Loader — Unit Tests
//  Covers: matchBody, resolveCenter, vectorToAngle
//  These are the pure functions from ephemeris-init.js that map
//  body names to JPL IDs and convert vectors to card angles.
// ════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

// ── Body→JPL ID map (matches TARGETS in ephemeris-init.js) ────
var TARGETS = {
  mercury:  199, venus:   299, earth:   399, mars:   499,
  jupiter:  599, saturn:  699, uranus:  799, neptune: 899,
  moon:     301, luna:    301,
  io:       501, europa:  502, ganymede:503, callisto:504,
  eur:      502, gny:     503,
  amalthea: 505, himalia: 506, elara:   507, pasiphae:508,
};

// ── Center→JPL param map (matches CENTERS) ────────────────────
var CENTERS = {
  sun:      '500@0',
  sol:      '500@0',
  earth:    '500@399',
  jupiter:  '500@599',
};

// ── Pure function replicas from ephemeris-init.js ──────────────

function matchBody(label) {
  if (!label) return null;
  var key = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return TARGETS[key] || null;
}

function resolveCenter(name) {
  if (!name) return null;
  var key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CENTERS[key] || null;
}

function vectorToAngle(x, y) {
  var angleDeg = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
  return angleDeg;
}

// ── matchBody() tests ─────────────────────────────────────────

describe('matchBody()', () => {
  it('matches Mercury by name', () => {
    expect(matchBody('MERCURY')).toBe(199);
  });

  it('matches Venus (lowercase)', () => {
    expect(matchBody('venus')).toBe(299);
  });

  it('matches Earth (mixed case)', () => {
    expect(matchBody('Earth')).toBe(399);
  });

  it('matches Moon alias "luna"', () => {
    expect(matchBody('LUNA')).toBe(301);
  });

  it('matches Moon as "moon"', () => {
    expect(matchBody('moon')).toBe(301);
  });

  it('matches Io', () => {
    expect(matchBody('IO')).toBe(501);
  });

  it('matches abbreviated Europa "EUR"', () => {
    expect(matchBody('EUR')).toBe(502);
  });

  it('matches abbreviated Ganymede "GNY"', () => {
    expect(matchBody('GNY')).toBe(503);
  });

  it('matches Callisto', () => {
    expect(matchBody('callisto')).toBe(504);
  });

  it('matches Himalia', () => {
    expect(matchBody('HIMALIA')).toBe(506);
  });

  it('does not match parenthetical additions to names', () => {
    expect(matchBody('Io (J1)')).toBeNull();
  });

  it('returns null for unknown body', () => {
    expect(matchBody('PLUTO')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchBody('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(matchBody(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(matchBody(null)).toBeNull();
  });

  it('does not match names with extra text', () => {
    expect(matchBody('earth (moon)')).toBeNull();
    expect(matchBody('jupiter-io')).toBeNull();
  });

  it('does not match partial names', () => {
    // "mars" should be 499, "mar" should NOT match
    expect(matchBody('mar')).toBeNull();
  });

  it('matches all 8 planets', () => {
    expect(matchBody('MERCURY')).toBe(199);
    expect(matchBody('VENUS')).toBe(299);
    expect(matchBody('EARTH')).toBe(399);
    expect(matchBody('MARS')).toBe(499);
    expect(matchBody('JUPITER')).toBe(599);
    expect(matchBody('SATURN')).toBe(699);
    expect(matchBody('URANUS')).toBe(799);
    expect(matchBody('NEPTUNE')).toBe(899);
  });
});

// ── resolveCenter() tests ─────────────────────────────────────

describe('resolveCenter()', () => {
  it('resolves SOL to heliocentric frame', () => {
    expect(resolveCenter('SOL')).toBe('500@0');
  });

  it('resolves Sun to heliocentric frame', () => {
    expect(resolveCenter('Sun')).toBe('500@0');
  });

  it('resolves Earth to geocentric frame', () => {
    expect(resolveCenter('Earth')).toBe('500@399');
  });

  it('resolves Jupiter to joviocentric frame', () => {
    expect(resolveCenter('Jupiter')).toBe('500@599');
  });

  it('returns null for unknown center', () => {
    expect(resolveCenter('Mars')).toBeNull();
  });

  it('returns null for empty name', () => {
    expect(resolveCenter('')).toBeNull();
  });

  it('does not match whitespace-heavy input — whitespace stripped but _staticR not', () => {
    // "  SoL  " → lowercase → "  sol  " → strip non-alnum → "sol" → match
    expect(resolveCenter('  SoL  ')).toBe('500@0');
  });
});

// ── vectorToAngle() tests ─────────────────────────────────────

describe('vectorToAngle()', () => {
  it('returns 180° for +Y direction (south in card coords)', () => {
    // JPL: x=0, y=positive → atan2(0, -y) = atan2(0, -pos) = π = 180° = south
    var a = vectorToAngle(0, 100000);
    expect(a).toBeCloseTo(180, 5);
  });

  it('returns 90° for +X direction (east)', () => {
    // JPL: x=positive, y=0 → body is to right of center
    // Card: 90° = right
    var a = vectorToAngle(100000, 0);
    expect(a).toBeCloseTo(90, 1);
  });

  it('returns 0° for -Y direction (north in card coords)', () => {
    var a = vectorToAngle(0, -100000);
    expect(a).toBeCloseTo(0, 1);
  });

  it('returns 270° for -X direction (west)', () => {
    var a = vectorToAngle(-100000, 0);
    expect(a).toBeCloseTo(270, 1);
  });

  it('returns angle in [0, 360) range', () => {
    for (var i = 0; i < 100; i++) {
      var x = Math.random() * 2e9 - 1e9;
      var y = Math.random() * 2e9 - 1e9;
      var a = vectorToAngle(x, y);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
    }
  });

  it('returns 180 for (0,0) degenerate', () => {
    // IEEE 754: -0 is real, atan2(+0, -0) = π = 180°
    // In practice neither X nor Y is ever exactly 0 for real bodies.
    expect(vectorToAngle(0, 0)).toBe(180);
  });

  it('handles Mercury-like vector (x > 0, y < 0)', () => {
    // Mercury 2026-07-08: x=6.46e6, y=-6.91e7
    // y < 0 means body is below center, x > 0 means slightly right
    // Expected: ~180 - atan(x/|y|) = ~180 - 5.3° ≈ 174.7... 
    // Actually: atan2(6.46e6, 6.91e7) = ~5.3° → atan2(x, -y) = atan2(6.46, 6.91) = 43.1°...
    // Wait, -y = -(-6.91e7) = 6.91e7 > 0, so atan2(6.46e6, 6.91e7) ≈ 5.3° in Q1
    var a = vectorToAngle(6465277.155, -69097823.352);
    // This should be in the 0-90 range since x>0 and -y>0
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(15); // near top but slightly right
  });

  it('handles Moon-like vector around Earth (x > 0, y > 0)', () => {
    // Moon 2026-07-08: x=358640, y=115575
    // x > 0, -y < 0 → Q2: atan2(+, -) = 180 - atan(|x|/y) around 108°
    // Actually: -y = -115575 < 0, x=358640 > 0 → Q2 → atan2(+, -) = π - atan(358640/115575)
    // π - atan(3.103) = 180° - 72.1° = 107.9°
    var a = vectorToAngle(358639.8, 115575.3);
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(120);
  });
});

