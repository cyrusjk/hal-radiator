// ═══════════════════════════════════════════════════════════════════════
//  Animation Engine
//  — Executes a phase-based animation sequence for chart cards
//  — Each phase is: { action, groups, [order], [gap], [duration], [effect] }
//  — Groups are chart-type specific element collections (header, bands, etc.)
//
//  Actions: appear, disappear, flickerIn, flickerOut, wait, blank, throb, done
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

  function flickerOne(el, dir) {
    var cls = dir === 'in' ? 'blink-in' : 'blink-out';
    if (el instanceof Array) {
      for (var i = 0; i < el.length; i++) flickerOne(el[i], dir);
      return;
    }
    el.classList.add(cls);
  }

  // Smooth sine-like throb (~2 cycles/s, settles visible)
  function throbOne(el) {
    if (el instanceof Array) {
      for (var i = 0; i < el.length; i++) throbOne(el[i]);
      return;
    }
    el.classList.add('throb');
  }

  // ── Action implementations ─────────────────────────────────────────
  // Each returns a function (onDone) that fires when the action completes.

  var actions = {

    appear: function(elements, phase, onDone) {
      setOpacity(elements, 1);
      if (onDone) onDone();
    },

    disappear: function(elements, phase, onDone) {
      setOpacity(elements, 0);
      if (onDone) onDone();
    },

    flickerIn: function(elements, phase, onDone) {
      var gap = phase.gap || window.HAL_CONFIG.timing.groupGap;
      blinkSequence(asArray(elements), 'in', gap, onDone);
    },

    flickerOut: function(elements, phase, onDone) {
      var gap = phase.gap || window.HAL_CONFIG.timing.groupGap;
      blinkSequence(asArray(elements), 'out', gap, onDone);
    },

    throb: function(elements, phase, onDone) {
      var list = asArray(elements);
      // simultaneous: all elements throb at once
      if (phase.order === 'simultaneous') {
        for (var i = 0; i < list.length; i++) throbOne(list[i]);
        if (onDone) onDone();
      } else {
        var gap = phase.gap || 400;
        throbSequence(list, gap, onDone);
      }
    },

    wait: function(elements, phase, onDone) {
      setTimeout(onDone, phase.duration || 1000);
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

  function blinkSequence(list, dir, gap, onDone) {
    var dur = window.HAL_CONFIG.timing.flickerDuration || 1000;
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      flickerOne(list[i], dir);
      i++;
      setTimeout(tick, dur + (gap || 0));
    }
    tick();
  }

  // Sequential throb — each element throbs with a gap between them
  function throbSequence(list, gap, onDone) {
    var i = 0;
    function tick() {
      if (i >= list.length) { if (onDone) onDone(); return; }
      throbOne(list[i]);
      i++;
      setTimeout(tick, 1250 + (gap || 0));
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
  //   card      — the card config object (from HAL_CONFIG.cards[])
  //   groupMap  — { groupName: DOM_element_or_array }
  //   onDone    — called when the entire sequence completes
  //   defaults  — renderer-specific default phases (used if card has no animation config)

  window.HAL.anim.run = function(card, groupMap, onDone, defaults) {
    var phases = (card.animation && card.animation.phases) || defaults || [];
    executePhases(phases, groupMap, 0, onDone);
  };

  // ── Phase sequencer ────────────────────────────────────────────────

  function executePhases(phases, groupMap, idx, onDone) {
    if (idx >= phases.length) { if (onDone) onDone(); return; }
    var phase = phases[idx];

    // Resolve groups to DOM elements
    var elements = [];
    if (phase.groups) {
      for (var gi = 0; gi < phase.groups.length; gi++) {
        var resolved = resolveGroup(phase.groups[gi], groupMap);
        if (resolved instanceof Array) {
          // Apply order if a multi-element group
          var ordered = applyOrder(resolved, phase.order);
          for (var ei = 0; ei < ordered.length; ei++) elements.push(ordered[ei]);
        } else {
          elements.push(resolved);
        }
      }
    }

    var fn = actions[phase.action];
    if (!fn) { if (onDone) onDone(); return; }

    // Pass groupMap to the action (used by 'blank' to hide all groups)
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
