// ════════════════════════════════════════════════════════════════
//  Orbital Renderer — Unit Tests
//  Covers the pure math functions from orbital.js that power all
//  orbit rendering: polar, arcPath, arcRange, orbitR.
//  These are the functions most likely to break during refactoring.
// ════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

// ── Constants (matches orbital.js cx=500, cy=400, maxR=280) ────
const CX = 500;
const CY = 400;
const MAX_R = 280;

// ── Pure function replicas from orbital.js ─────────────────────
// (These are exact copies of the anonymous functions in the
//  renderer, extracted here so they can be tested in isolation.
//  When refactoring orbital.js, keep these in sync.)

function polar(r, a, ecc, omega) {
  if (ecc) {
    var nu = (a - (omega || 0)) * Math.PI / 180;
    r = r * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
  }
  var rad = (a - 90) * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(r, a1, a2, steps, ecc, omega) {
  steps = steps || 24;
  if (a2 < a1) a2 += 360;
  var d = '';
  for (var i = 0; i <= steps; i++) {
    var a = a1 + (a2 - a1) * (i / steps);
    var p = polar(r, a, ecc, omega);
    d += (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }
  return d;
}

function arcRange(a1, a2) {
  var aa1 = ((a1 % 360) + 360) % 360;
  var aa2 = ((a2 % 360) + 360) % 360;
  return { s: aa1, e: aa1 <= aa2 ? aa2 : aa2 + 360 };
}

function orbitR(ri, series, maxRData) {
  return (series[ri].r / maxRData) * MAX_R;
}

// ── polar() tests ──────────────────────────────────────────────

describe('polar()', () => {
  it('returns correct circular position at 0° (top)', () => {
    var p = polar(100, 0);
    expect(p.x).toBeCloseTo(500, 0);
    expect(p.y).toBeCloseTo(300, 0); // 400 - 100
  });

  it('returns correct circular position at 90° (right)', () => {
    var p = polar(100, 90);
    expect(p.x).toBeCloseTo(600, 0); // 500 + 100
    expect(p.y).toBeCloseTo(400, 0);
  });

  it('returns correct circular position at 180° (bottom)', () => {
    var p = polar(100, 180);
    expect(p.x).toBeCloseTo(500, 0);
    expect(p.y).toBeCloseTo(500, 0); // 400 + 100
  });

  it('returns correct circular position at 270° (left)', () => {
    var p = polar(100, 270);
    expect(p.x).toBeCloseTo(400, 0); // 500 - 100
    expect(p.y).toBeCloseTo(400, 0);
  });

  it('returns same point for angle + 360', () => {
    var p1 = polar(100, 45);
    var p2 = polar(100, 405);
    expect(p1.x).toBeCloseTo(p2.x, 5);
    expect(p1.y).toBeCloseTo(p2.y, 5);
  });

  it('handles eccentric orbit (periapsis aligned)', () => {
    // r = 200, ecc=0.5, omega=0 (periapsis at 0°=top)
    // At angle 0°: r = 200*(1-0.25)/(1+0.5*cos(0)) = 150/1.5 = 100
    var p = polar(200, 0, 0.5, 0);
    var r = Math.sqrt((p.x-500)**2 + (p.y-400)**2);
    expect(r).toBeCloseTo(100, 1);
  });

  it('handles eccentric orbit (apoapsis at top)', () => {
    // omega=180: periapsis at bottom (180°), apoapsis at top (0°)
    // At angle 0°, nu = -180°, cos(-180) = -1
    // r = 200*(1-0.25)/(1+0.5*cos(-180)) = 150/0.5 = 300
    var p = polar(200, 0, 0.5, 180);
    var r = Math.sqrt((p.x-500)**2 + (p.y-400)**2);
    expect(r).toBeCloseTo(300, 1);
  });

  it('returns NaN-free coords for eccentric orbit', () => {
    var p = polar(280, 45, 0.054, 270);
    expect(isNaN(p.x)).toBe(false);
    expect(isNaN(p.y)).toBe(false);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('ecc=0 is same as no ecc param', () => {
    var p1 = polar(150, 120);
    var p2 = polar(150, 120, 0);
    expect(p1.x).toBeCloseTo(p2.x, 10);
    expect(p1.y).toBeCloseTo(p2.y, 10);
  });

  it('returns different positions for different angles on same r', () => {
    var p0 = polar(100, 0);
    var p90 = polar(100, 90);
    var p180 = polar(100, 180);
    expect(p0.y).toBeLessThan(CY);   // top of center
    expect(p90.x).toBeGreaterThan(CX); // right of center
    expect(p180.y).toBeGreaterThan(CY); // below center
  });
});

// ── arcRange() tests ───────────────────────────────────────────

describe('arcRange()', () => {
  it('returns simple forward range', () => {
    var r = arcRange(30, 120);
    expect(r.s).toBe(30);
    expect(r.e).toBe(120);
  });

  it('wraps when end < start', () => {
    var r = arcRange(270, 90);
    expect(r.s).toBe(270);
    expect(r.e).toBe(450); // 90 + 360
  });

  it('normalizes negative angles', () => {
    var r = arcRange(-45, 45);
    expect(r.s).toBe(315);
    expect(r.e).toBe(405); // 45 + 360
  });

  it('normalizes large angles', () => {
    var r = arcRange(720, 810);
    expect(r.s).toBe(0);
    expect(r.e).toBe(90);
  });

  it('returns same start for 0 and 360', () => {
    var r1 = arcRange(0, 180);
    var r2 = arcRange(360, 180);
    expect(r1.s).toBe(r2.s);
  });

  it('handles zero-length arc', () => {
    var r = arcRange(45, 45);
    expect(r.s).toBe(45);
    expect(r.e).toBe(45);
  });
});

// ── arcPath() tests ────────────────────────────────────────────

describe('arcPath()', () => {
  it('starts with M and continues with L', () => {
    var path = arcPath(100, 0, 90, 4);
    expect(path.startsWith('M')).toBe(true);
    expect(path.split('L').length).toBeGreaterThan(1);
  });

  it('generates correct number of segments', () => {
    var path = arcPath(100, 0, 90, 10);
    var parts = path.split(/[ML]/).filter(Boolean);
    expect(parts.length).toBe(11); // 10 steps = 11 points
  });

  it('generates valid SVG coords (x.y format)', () => {
    var path = arcPath(100, 0, 360, 24);
    var parts = path.split(/[ML]/).filter(Boolean);
    for (var pi = 0; pi < parts.length; pi++) {
      var xy = parts[pi].split(',');
      expect(xy.length).toBe(2);
      expect(xy[0]).toMatch(/^-?\d+\.\d$/);
      expect(xy[1]).toMatch(/^-?\d+\.\d$/);
    }
  });

  it('closes full circle back to start', () => {
    var path = arcPath(100, 0, 360, 24);
    var parts = path.split(/[ML]/).filter(Boolean);
    var first = parts[0].split(',');
    var last = parts[parts.length - 1].split(',');
    // For a full circle with even steps, last should be near first
    expect(parseFloat(first[0])).toBeCloseTo(parseFloat(last[0]), 0);
    expect(parseFloat(first[1])).toBeCloseTo(parseFloat(last[1]), 0);
  });

  it('uses default 24 steps when steps omitted', () => {
    var path = arcPath(100, 0, 360);
    var parts = path.split(/[ML]/).filter(Boolean);
    expect(parts.length).toBe(25);
  });

  it('eccentric path differs from circular path', () => {
    var circ = arcPath(200, 0, 360, 36);
    var ecent = arcPath(200, 0, 360, 36, 0.5, 0);
    expect(ecent).not.toBe(circ);
  });
});

// ── orbitR() tests ─────────────────────────────────────────────

describe('orbitR()', () => {
  var series = [
    { r: 32 },   // Mercury
    { r: 280 },  // Neptune
  ];
  var maxRData = 280;

  it('scales to maxR for farthest body', () => {
    expect(orbitR(1, series, maxRData)).toBeCloseTo(280, 0);
  });

  it('scales proportionally for inner bodies', () => {
    expect(orbitR(0, series, maxRData)).toBeCloseTo(32, 0);
  });

  it('handles custom maxRData', () => {
    expect(orbitR(0, series, 100)).toBeCloseTo((32/100)*280, 5);
  });
});

// ── Edge cases ─────────────────────────────────────────────────

describe('edge cases', () => {
  it('polar at origin r=0', () => {
    var p = polar(0, 45);
    expect(p.x).toBeCloseTo(500, 0);
    expect(p.y).toBeCloseTo(400, 0);
  });

  it('polar handles very large r', () => {
    var p = polar(1000, 0);
    expect(p.x).toBeCloseTo(500, 0);
    expect(p.y).toBeCloseTo(-600, 0);
  });

  it('arcRange handles angles beyond ±3600', () => {
    var r = arcRange(-720, 1080);
    expect(r.s).toBe(0);
    expect(r.e).toBe(0); // both normalize to 0, not 360
  });

  it('arcPath with 0 steps falls back to 24 via falsy ||', () => {
    var path = arcPath(100, 0, 90, 0);
    // Bug (documented): steps=0 is falsy, so `steps || 24` gives 24.
    // In practice no caller passes 0. Should guard `steps !== undefined ? steps : 24`.
    expect(path.split(/[ML]/).filter(Boolean).length).toBe(25); // 24 steps
  });

  it('ecc=0.999 (near-escape) does not produce NaN', () => {
    var p = polar(200, 0, 0.999, 0);
    expect(isNaN(p.x)).toBe(false);
  });
});

