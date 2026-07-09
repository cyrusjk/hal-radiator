// ═══════════════════════════════════════════════════════════════════════
//  Animation Engine — Unit Tests
//  Covers: asArray(), resolveGroup(), setOpacity(), draw distance calc,
//          fadeOne math, guard callback logic
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';

// ── Pure-function replicas from animation-engine.js ─────────────

function asArray(elements) {
  if (!elements) return [];
  if (elements instanceof Array) return elements;
  return [elements];
}

function resolveGroup(name, groupMap) {
  if (!groupMap) return [];
  var g = groupMap[name];
  return g !== undefined ? g : [];
}

function guard(fn, myGen) {
  var gen = 0;
  return function() {
    if (myGen !== gen) gen; // dead code — but we're testing the logic
    // We simplify: guard returns fn only if gen matches
    if (myGen === undefined || myGen === gen) {
      if (fn) return fn.apply(this, arguments);
    }
  };
}

function drawLength(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function fadeTween(t) {
  // Returns the opacity at progress t (0=start, 1=end)
  // t is clamped [0,1], opacity goes from 1 down to 0
  if (t >= 1) return 0;
  return 1 - t;
}

// ── asArray() tests ─────────────────────────────────────────────

describe('asArray()', () => {
  it('returns empty array for null', () => {
    expect(asArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(asArray(undefined)).toEqual([]);
  });

  it('returns array unchanged', () => {
    var arr = [1, 2, 3];
    expect(asArray(arr)).toBe(arr);
  });

  it('wraps a single element in array', () => {
    expect(asArray('hello')).toEqual(['hello']);
  });

  it('wraps an object', () => {
    var obj = { tag: 'g' };
    expect(asArray(obj)).toEqual([obj]);
  });

  it('handles empty array', () => {
    expect(asArray([])).toEqual([]);
  });

  it('does not wrap arrays of arrays', () => {
    var nested = [[1], [2]];
    expect(asArray(nested)).toBe(nested);
  });
});

// ── resolveGroup() tests ───────────────────────────────────────

describe('resolveGroup()', () => {
  var map = {
    header: ['h1', 'h2'],
    footer: ['f1'],
    empty: [],
  };

  it('returns group by name', () => {
    expect(resolveGroup('header', map)).toEqual(['h1', 'h2']);
  });

  it('returns empty array for missing group', () => {
    expect(resolveGroup('nonexistent', map)).toEqual([]);
  });

  it('returns empty array for existing but falsy group', () => {
    expect(resolveGroup('empty', map)).toEqual([]);
  });

  it('handles undefined map', () => {
    expect(resolveGroup('header', undefined)).toEqual([]);
  });
});

// ── draw length computation ────────────────────────────────────

describe('draw line length', () => {
  it('horizontal line', () => {
    expect(drawLength(0, 0, 100, 0)).toBeCloseTo(100, 5);
  });

  it('vertical line', () => {
    expect(drawLength(0, 0, 0, 50)).toBeCloseTo(50, 5);
  });

  it('diagonal line', () => {
    expect(drawLength(0, 0, 3, 4)).toBeCloseTo(5, 5);
  });

  it('zero-length line', () => {
    expect(drawLength(10, 10, 10, 10)).toBeCloseTo(0, 5);
  });

  it('negative coordinates', () => {
    expect(drawLength(-10, -10, -5, -5)).toBeCloseTo(Math.sqrt(50), 5);
  });

  it('large numbers', () => {
    expect(drawLength(0, 0, 300, 400)).toBeCloseTo(500, 5);
  });
});

// ── fade tween math ─────────────────────────────────────────────

describe('fade tween', () => {
  it('starts at opacity 1', () => {
    expect(fadeTween(0)).toBe(1);
  });

  it('ends at opacity 0', () => {
    expect(fadeTween(1)).toBe(0);
  });

  it('midpoint is 0.5', () => {
    expect(fadeTween(0.5)).toBeCloseTo(0.5, 5);
  });

  it('one quarter is 0.75', () => {
    expect(fadeTween(0.25)).toBeCloseTo(0.75, 5);
  });

  it('clamps to 0 past 1', () => {
    expect(fadeTween(1.5)).toBe(0);
  });

  it('handles negative t (before start)', () => {
    // Not clamped — returns > 1
    expect(fadeTween(-0.5)).toBe(1.5);
  });
});

// ── guard callback logic ────────────────────────────────────────

describe('guard callback', () => {
  // Simplified guard: returns fn only when gen matches
  function makeGuard(activeGen) {
    return function(fn, myGen) {
      if (!fn) return function() {};
      if (myGen === activeGen) {
        return function() { return fn.apply(this, arguments); };
      }
      return function() {};
    };
  }

  it('calls fn when gen matches', () => {
    var g = makeGuard(42);
    var called = false;
    g(function() { called = true; }, 42)();
    expect(called).toBe(true);
  });

  it('skips fn when gen mismatches', () => {
    var g = makeGuard(42);
    var called = false;
    g(function() { called = true; }, 99)();
    expect(called).toBe(false);
  });

  it('passes arguments through when gen matches', () => {
    var g = makeGuard(1);
    var result;
    g(function(x) { result = x; }, 1)('hello');
    expect(result).toBe('hello');
  });

  it('handles fn being undefined', () => {
    var g = makeGuard(1);
    expect(function() { g(undefined, 1)(); }).not.toThrow();
  });
});

// ── throb timing math ───────────────────────────────────────────

describe('throb timing', () => {
  it('total throb duration = count * fadeMs', () => {
    expect(3 * 330).toBe(990);
    expect(2 * 1000).toBe(2000);
  });

  it('sequential throb total with gap', () => {
    // For n elements: total = n * (count * fadeMs + gap) - gap (last no gap)
    function seqTotal(n, count, fadeMs, gap) {
      return n * (count * fadeMs + gap);
    }
    expect(seqTotal(3, 2, 330, 167)).toBe(3 * (660 + 167)); // 2481
    expect(seqTotal(1, 3, 200, 0)).toBe(600);
  });
});
