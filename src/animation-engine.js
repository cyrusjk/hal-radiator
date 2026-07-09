// ═══════════════════════════════════════════════════════════════════════
//  Animation Engine
//  — Executes a phase-based animation sequence for chart cards
//  — Each phase is: { action, groups, [order], [gap], [duration], [effect] }
//  — Groups are chart-type specific element collections (header, bands, etc.)
//
//  Actions: appear, disappear, flickerIn, flickerOut, wait, blank,
//           throb, fadeOut, done, draw
//  Orders:  sequential (default), simultaneous, reverse
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.anim = window.HAL.anim || {};

(function() {
  var cfg = window.HAL_CONFIG;

  // ── Element helpers ────────────────────────────────────────────────

  function setOpacity(el, val) {
    if (el instanceof Array) {
      for (var i = 0; i < el.length; i++) setOpacity(el[i], val);
      return;
    }
    el.style.opacity = val;
  }

  function flickerOne(el, dir, dur) {
    var cls = dir === 'in' ? 'blink-in' : 'blink-out';
    if (el instanceof Array) {
      for (var i = 0; i < el.length; i++) flickerOne(el[i], dir, dur);
      return;
    }
    var ms = dur || (window.HAL_CONFIG.timing && window.HAL_CONFIG.timing.flickerDuration) || 1000;
    el.style.animationDuration = ms + 'ms';
    el.classList.add(cls);
  }

  // Throb: snap visible → linear fade out → snap visible → repeat count times.
  // fadeMs: duration of each fade-out (default 1000ms).
  // count: number of throb cycles (default 2).
  function throbOne(el, count, fadeMs, cb) {
    if (el instanceof Array) {
      var done = 0, total = el.length;
      for (var i = 0; i < total; i++) {
        throbOne(el[i], count, fadeMs, function() { done++; if (done >= total && cb) cb(); });
      }
      return;
    }
    var cycles = count || 2;
    var fadeDur = fadeMs || 1000;
    var step = 0;
    var running = true;

    function fadeOut(onDone) {
      var start = performance.now();
      (function tick(now) {
        if (!running) return;
        var t = (now - start) / fadeDur;
        if (t >= 1) { el.style.opacity = '0'; onDone(); return; }
        el.style.opacity = 1 - t;
        requestAnimationFrame(tick);
      })(performance.now());
    }

    function next() {
      if (!running) return;
      step++;
      if (step > cycles) { el.style.opacity = '1'; running = false; if (cb) cb(); return; }
      el.style.opacity = '1';
      fadeOut(next);
    }

    next();
  }

  // ── Action implementations ─────────────────────────────────────────

  var actions = {

    appear: function(elements, phase, onDone) {
      var list = asArray(elements);
      if (list.length === 0) { if (onDone) onDone(); return; }
      var target = phase.opacity !== undefined ? phase.opacity : 1;
      if (phase.order === 'sequential') {
        appearSequence(list, phase.gap || 0, onDone);
      } else {
        setOpacity(list, target);
        if (onDone) onDone();
      }
    },

    disappear: function(elements, phase, onDone) {
      var list = asArray(elements);
      if (list.length === 0) { if (onDone) onDone(); return; }
      if (phase.order === 'sequential') {
        disappearSequence(list, phase.gap || 0, onDone);
      } else {
        setOpacity(list, 0);
        if (onDone) onDone();
      }
    },

    flickerIn: function(elements, phase, onDone) {
      var gap = phase.gap || window.HAL_CONFIG.timing.groupGap;
      var dur = phase.duration;
      if (phase.order === 'simultaneous') {
        var list = asArray(elements);
        for (var i = 0; i < list.length; i++) flickerOne(list[i], 'in', dur);
        var ms = dur || window.HAL_CONFIG.timing.flickerDuration || 1000;
        setTimeout(onDone, ms);
      } else {
        blinkSequence(asArray(elements), 'in', gap, onDone, dur);
      }
    },

    flickerOut: function(elements, phase, onDone) {
      var list = asArray(elements);
      if (list.length === 0) { if (onDone) onDone(); return; }
      if (phase.order === 'sequential') {
        var gap = phase.gap || window.HAL_CONFIG.timing.groupGap;
        var dur = phase.duration;
        blinkSequence(list, 'out', gap, onDone, dur);
      } else {
        var dur = phase.duration;
        for (var i = 0; i < list.length; i++) flickerOne(list[i], 'out', dur);
        var ms = dur || window.HAL_CONFIG.timing.flickerDuration || 1000;
        setTimeout(onDone, ms);
      }
    },

    throb: function(elements, phase, onDone) {
      var list = asArray(elements);
      var count = phase.count || 2;
      var fadeMs = phase.duration || 1000;
      if (phase.order === 'simultaneous') {
        var remaining = list.length;
        if (remaining === 0) { if (onDone) onDone(); return; }
        for (var i = 0; i < list.length; i++) {
          throbOne(list[i], count, fadeMs, function() {
            remaining--;
            if (remaining <= 0 && onDone) onDone();
          });
        }
      } else {
        var gap = phase.gap || 400;
        throbSequence(list, gap, count, fadeMs, onDone);
      }
    },

    wait: function(elements, phase, onDone) {
      setTimeout(onDone, phase.duration || 1000);
    },

    // Smooth fade to invisible over duration ms (default 2000).
    fadeOut: function(elements, phase, onDone) {
      var list = asArray(elements);
      var dur = phase.duration || 2000;
      if (phase.order === 'sequential') {
        fadeSequence(list, dur, onDone);
      } else {
        fadeSimultaneous(list, dur, onDone);
      }
    },

    // ── Stroke-draw animation ────────────────────────────────────────
    // Animates SVG <line> elements from zero-length to full length
    // using stroke-dasharray / stroke-dashoffset.
    // The line draws from (x1,y1) toward (x2,y2).
    //
    // order: simultaneous (default) — all lines draw in parallel
    //        sequential — lines draw one by one with gap ms between
    // duration: ms per line (default 600)
    draw: function(elements, phase, onDone) {
      var list = asArray(elements);
      if (list.length === 0) { if (onDone) onDone(); return; }
      var dur = phase.duration || 600;
      if (phase.order === 'sequential') {
        drawSequence(list, dur, phase.gap || 0, onDone);
      } else {
        drawSimultaneous(list, dur, onDone);
      }
    },

    done: function(elements, phase, onDone) {
      if (onDone) onDone();
    },

    // Hide ALL groups — just the card color remains. Ignores phase.groups.
    blank: function(elements, phase, onDone) {
      var map = phase._groupMap;
      if (map) {
        for (var k in map) setOpacity(asArray(map[k]), 0);
      }
      if (onDone) onDone();
    },

  };

  // ── Sequential blink helper ─────────────────────────────────────────

  function blinkSequence(list, dir, gap, onDone, dur) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      var ms = dur || window.HAL_CONFIG.timing.flickerDuration || 1000;
      flickerOne(list[i], dir, dur);
      i++;
      setTimeout(tick, ms + (gap || 0));
    }
    tick();
  }

  // Sequential appear (one element at a time with gap)
  function appearSequence(list, gap, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      setOpacity(list[i], 1);
      i++;
      setTimeout(tick, gap);
    }
    tick();
  }

  // Sequential disappear
  function disappearSequence(list, gap, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      setOpacity(list[i], 0);
      i++;
      setTimeout(tick, gap);
    }
    tick();
  }

  // Sequential throb
  function throbSequence(list, gap, count, fadeMs, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      throbOne(list[i], count, fadeMs);
      i++;
      setTimeout(tick, (count * fadeMs) + (gap || 0));
    }
    tick();
  }

  // Fade all simultaneously over duration ms.
  function fadeSimultaneous(list, dur, onDone) {
    if (list.length === 0) { if (onDone) onDone(); return; }
    var remaining = list.length;
    for (var i = 0; i < list.length; i++) {
      fadeOne(list[i], dur, function() {
        remaining--;
        if (remaining <= 0 && onDone) onDone();
      });
    }
  }

  // Fade sequentially.
  function fadeSequence(list, dur, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      fadeOne(list[i], dur, tick);
      i++;
    }
    tick();
  }

  // Fade a single element from 1→0 over duration ms.
  function fadeOne(el, dur, cb) {
    if (el instanceof Array) {
      var done = 0, total = el.length;
      for (var i = 0; i < total; i++) {
        fadeOne(el[i], dur, function() { done++; if (done >= total && cb) cb(); });
      }
      return;
    }
    var start = performance.now();
    (function tick(now) {
      var t = (now - start) / dur;
      if (t >= 1) { el.style.opacity = '0'; if (cb) cb(); return; }
      el.style.opacity = 1 - t;
      requestAnimationFrame(tick);
    })(performance.now());
  }

  // ── Stroke-draw helpers ──────────────────────────────────────────────

  function drawOne(el, dur, cb) {
    if (el instanceof Array) {
      var done = 0, total = el.length;
      for (var i = 0; i < total; i++) {
        drawOne(el[i], dur, function() { done++; if (done >= total && cb) cb(); });
      }
      return;
    }
    var len;
    if (el.getTotalLength) {
      try { len = el.getTotalLength(); }
      catch(e) { len = 0; }
    } else {
      var x1 = parseFloat(el.getAttribute('x1') || 0);
      var y1 = parseFloat(el.getAttribute('y1') || 0);
      var x2 = parseFloat(el.getAttribute('x2') || 0);
      var y2 = parseFloat(el.getAttribute('y2') || 0);
      len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    if (len < 0.5) { el.style.opacity = '1'; if (cb) cb(); return; }
    var origDash = el.getAttribute('stroke-dasharray');
    el.setAttribute('stroke-dasharray', len);
    el.setAttribute('stroke-dashoffset', len);
    var start = performance.now();
    (function tick(now) {
      var t = (now - start) / dur;
      if (t >= 1) {
        el.setAttribute('stroke-dashoffset', '0');
        if (origDash !== null) {
          el.setAttribute('stroke-dasharray', origDash);
        } else {
          el.removeAttribute('stroke-dasharray');
        }
        el.style.opacity = '1';   // show AFTER draw completes
        if (cb) cb();
        return;
      }
      el.setAttribute('stroke-dashoffset', len * (1 - t));
      requestAnimationFrame(tick);
    })(performance.now());
  }

  function drawSimultaneous(list, dur, onDone) {
    if (list.length === 0) { if (onDone) onDone(); return; }
    var remaining = list.length;
    for (var i = 0; i < list.length; i++) {
      drawOne(list[i], dur, function() {
        remaining--;
        if (remaining <= 0 && onDone) onDone();
      });
    }
  }

  function drawSequence(list, dur, gap, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      drawOne(list[i], dur, function() { i++; setTimeout(tick, gap); });
    }
    tick();
  }

  // ── Normalise element references ───────────────────────────────────

  function asArray(elements) {
    if (!elements) return [];
    if (elements instanceof Array) return elements;
    return [elements];
  }

  function resolveGroup(name, groupMap) {
    var g = groupMap[name];
    return g !== undefined ? g : [];
  }

// ── Public API ─────────────────────────────────────────────────────
  // Run a sequence of animation phases for a card.
  window.HAL.anim.run = function(card, groupMap, onDone, defaults) {
    var phases = (card.animation && card.animation.phases) || defaults || [];
    executePhases(phases, groupMap, 0, onDone);
  };

  // ── Phase sequencer ────────────────────────────────────────────────

  function executePhases(phases, groupMap, idx, onDone) {
    if (idx >= phases.length) { if (onDone) onDone(); return; }
    var phase = phases[idx];

    var elements = [];
    if (phase.groups) {
      for (var gi = 0; gi < phase.groups.length; gi++) {
        var resolved = resolveGroup(phase.groups[gi], groupMap);
        if (resolved instanceof Array) {
          var ordered = applyOrder(resolved, phase.order);
          for (var ei = 0; ei < ordered.length; ei++) elements.push(ordered[ei]);
        } else {
          elements.push(resolved);
        }
      }
    }

    var fn = actions[phase.action];
    if (!fn) { if (onDone) onDone(); return; }

    phase._groupMap = groupMap;
    fn(elements, phase, function() {
      executePhases(phases, groupMap, idx + 1, onDone);
    });
  }

  // ── Order helpers ──────────────────────────────────────────────────

  function applyOrder(list, order) {
    if (!order || order === 'sequential') return list;
    if (order === 'simultaneous') return list;
    if (order === 'reverse') {
      var copy = [];
      for (var i = list.length - 1; i >= 0; i--) copy.push(list[i]);
      return copy;
    }
    return list;
  }

})();
