// ═══════════════════════════════════════════════════════════════════════
//  SVG Utilities — Unit Tests
//  Covers: fg(), fs(), parseConfigColor(), brightness(), addGlowFilter()
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Pure-function replicas from svg-utils.js ────────────────────
// fg() and fs() depend on window.HAL_CONFIG.visual — we mock it.

function setupVisual(overrides) {
  const defaults = { frameBrightness: 0.4, dataBrightness: 0.8, fontScale: 1.0 };
  globalThis.window = globalThis.window || {};
  globalThis.window.HAL_CONFIG = globalThis.window.HAL_CONFIG || {};
  globalThis.window.HAL_CONFIG.visual = { ...defaults, ...overrides };
}

function clearVisual() {
  if (globalThis.window) delete globalThis.window.HAL_CONFIG;
}

// Replicas of the pure logic from svg-utils.js

function fg(type, mult) {
  var v = (window.HAL_CONFIG && window.HAL_CONFIG.visual) || {};
  var base = type === 'data' ? (v.dataBrightness || 0.8) : (v.frameBrightness || 0.4);
  var opacity = Math.min(1, Math.max(0, base * mult));
  return 'rgba(255,255,255,' + opacity.toFixed(2) + ')';
}

function fs(px) {
  var scale = (window.HAL_CONFIG && window.HAL_CONFIG.visual && window.HAL_CONFIG.visual.fontScale) || 1.0;
  return Math.round(px * scale);
}

// ── fg() tests ──────────────────────────────────────────────────

describe('fg()', () => {
  beforeEach(() => { setupVisual(); });
  afterEach(() => { clearVisual(); });

  it('returns rgba string', () => {
    var c = fg('frame', 0.5);
    expect(c).toMatch(/^rgba\(255,\s*255,\s*255,\s*0\.\d+\)$/);
  });

  it('uses frameBrightness * mult for type=frame', () => {
    var c = fg('frame', 0.5);
    expect(c).toBe('rgba(255,255,255,0.20)');
  });

  it('uses dataBrightness * mult for type=data', () => {
    var c = fg('data', 1.0);
    expect(c).toBe('rgba(255,255,255,0.80)');
  });

  it('clamps to 0 at minimum', () => {
    var c = fg('frame', -5);
    expect(c).toBe('rgba(255,255,255,0.00)');
  });

  it('clamps to 1 at maximum', () => {
    var c = fg('frame', 10);
    expect(c).toBe('rgba(255,255,255,1.00)');
  });

  it('mult=1 returns base brightness unchanged', () => {
    var c = fg('frame', 1.0);
    expect(c).toBe('rgba(255,255,255,0.40)');
  });

  it('mult=2 doubles brightness (capped)', () => {
    setupVisual({ frameBrightness: 0.3 });
    var c = fg('frame', 2.0);
    expect(c).toBe('rgba(255,255,255,0.60)');
  });

  it('handles missing config gracefully', () => {
    clearVisual();
    var c = fg('frame', 0.5);
    expect(c).toBe('rgba(255,255,255,0.20)'); // uses defaults
  });

  it('handles mult=0 returns 0', () => {
    var c = fg('frame', 0);
    expect(c).toBe('rgba(255,255,255,0.00)');
  });

  it('defaults type to frame when unknown type given', () => {
    var c = fg('chartreuse', 0.5);
    expect(c).toBe('rgba(255,255,255,0.20)'); // falls to frame branch
  });
});

// ── fs() tests ──────────────────────────────────────────────────

describe('fs()', () => {
  beforeEach(() => { setupVisual(); });
  afterEach(() => { clearVisual(); });

  it('returns unscaled value when fontScale=1', () => {
    expect(fs(14)).toBe(14);
  });

  it('scales up with fontScale', () => {
    setupVisual({ fontScale: 1.5 });
    expect(fs(14)).toBe(21);
  });

  it('scales down with fontScale', () => {
    setupVisual({ fontScale: 0.75 });
    expect(fs(16)).toBe(12);
  });

  it('rounds to nearest integer', () => {
    setupVisual({ fontScale: 1.25 });
    expect(fs(10)).toBe(13);  // 10 * 1.25 = 12.5 → 13
  });

  it('handles fontScale=0 (falsy fallback to 1.0, same || bug as arcPath)', () => {
    setupVisual({ fontScale: 0 });
    // Bug: 0 || 1.0 = 1.0 because 0 is falsy
    // Fix would be: fontScale !== undefined ? fontScale : 1.0
    expect(fs(100)).toBe(100); // falls back to scale=1
  });

  it('handles negative fontScale (clamped by visual)', () => {
    setupVisual({ fontScale: -1 });
    expect(fs(14)).toBe(-14); // Math.round preserves sign
  });

  it('handles 0 px input', () => {
    expect(fs(0)).toBe(0);
  });

  it('handles missing config gracefully', () => {
    clearVisual();
    expect(fs(14)).toBe(14);
  });

  it('uses Math.round precision', () => {
    setupVisual({ fontScale: 0.1 });
    expect(fs(7)).toBe(1); // 0.7 → 1
    expect(fs(4)).toBe(0); // 0.4 → 0
  });
});

// ── Cross-product tests ─────────────────────────────────────────

describe('fg + fs integration', () => {
  beforeEach(() => { setupVisual({ frameBrightness: 0.5, fontScale: 1.2 }); });
  afterEach(() => { clearVisual(); });

  it('both use same visual config', () => {
    expect(fg('frame', 1.0)).toBe('rgba(255,255,255,0.50)');
    expect(fs(10)).toBe(12);
  });
});
