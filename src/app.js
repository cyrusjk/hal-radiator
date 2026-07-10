// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Boots by fetching /api/config from the server
//  — Then cycles cards, handles keyboard controls
//  — Uses a generation counter to prevent stale callbacks from
//    racing with manual navigation
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');

  // Fetch config from server, then boot the radiator
  fetch('/api/config').then(function(r) { return r.json(); }).then(function(cfg) {
    window.HAL_CONFIG = cfg;
    boot(cfg);
  }).catch(function(err) {
    // Fallback: use whatever config.js set if available
    if (window.HAL_CONFIG) {
      boot(window.HAL_CONFIG);
    } else {
      document.body.innerHTML += 'ERROR: cannot fetch config &ndash; ' + err;
    }
  });

  function boot(cfg) {
    if (!svgEl) { document.body.innerHTML += 'ERROR: no SVG element'; return; }
    if (!cfg || !cfg.cards || !cfg.cards.length) return;
    if (!window.HAL.cards || !window.HAL.cards.title) { document.body.innerHTML += 'ERROR: title renderer missing'; return; }

    var idx = 0, locked = false, manualNav = false, autoTimer = null, zoom = 1.0;
    var wrap = document.getElementById('wrap');
    var gen = 0;  // incremented on every showCard → invalidates stale callbacks

    function clearAuto() {
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    function clearCard(color) {
      if (color) document.body.style.background = color;
      svgEl.innerHTML = '';
    }

    // ── Guard: wraps a callback so it only fires if `myGen` still
    //     matches `gen`.  Prevents in-flight callbacks from a
    //     previous showCard from racing after a new transition.
    function guard(fn, myGen) {
      return function() {
        if (myGen !== gen) return;
        if (fn) fn.apply(this, arguments);
      };
    }

    // ── showCard: renders card at index i.  Increments gen so any
    //     pending callback from a previous render is atomically stale.
    //     Every navigation path (user arrows, auto-advance, locked
    //     replay, space toggle) ultimately calls showCard, so gen
    //     always advances.
    function showCard(i, onDone) {
      clearAuto();
      gen++;
      var myGen = gen;
      var c = cfg.cards[i % cfg.cards.length];
      clearCard(c.color);

      if (c.type !== 'title') {
        window.HAL.data.fetchCardData(c)
          .then(function(data) {
            if (myGen !== gen) return;  // stale: user navigated away
            if (data) for (var k in data) c[k] = data[k];
            try {
              var r = window.HAL.cards[c.type];
              var cb = guard(onDone, myGen);
              r && r.render ? r.render(c, cb) : cb && cb();
            } catch(e) { console.error('Card render error [', c.type, ']:', e); var cb = guard(onDone, myGen); cb && cb(); }
          })
          .catch(function(e) { console.error('Card fetch error [', c.type, ']:', e); var cb = guard(onDone, myGen); cb && cb(); });
      } else {
        window.HAL.cards.title.render(c);
        if (onDone) {
          autoTimer = setTimeout(guard(onDone, myGen), cfg.timing.titleCardDisplay * 1000);
        }
      }
    }

    function cardDone() {
      if (manualNav) { manualNav = false; return; }
      locked ? showCard(idx, cardDone) : scheduleNext();
    }

    function scheduleNext() {
      clearAuto();
      transitionTo((idx + 1) % cfg.cards.length);
    }

    function transitionTo(nextIdx) {
      idx = nextIdx;
      showCard(idx, cardDone);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault(); manualNav = true;
        transitionTo((idx - 1 + cfg.cards.length) % cfg.cards.length);
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault(); manualNav = true;
        transitionTo((idx + 1) % cfg.cards.length);
      }
      else if (e.key === ' ') {
        e.preventDefault(); manualNav = false; locked = !locked;
        locked ? showCard(idx, cardDone) : scheduleNext();
      }
      else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoom = Math.min(zoom + 0.25, 3.0);
        if (wrap) { wrap.style.transform = 'scale(' + zoom + ')'; wrap.classList.add('zoomed'); }
      }
      else if (e.key === '-') {
        e.preventDefault();
        zoom = Math.max(zoom - 0.25, 0.25);
        if (zoom === 1.0) {
          if (wrap) { wrap.style.transform = ''; wrap.classList.remove('zoomed'); }
        } else {
          if (wrap) { wrap.style.transform = 'scale(' + zoom + ')'; wrap.classList.add('zoomed'); }
        }
      }
    });

    // ── Expose gotoCard for console / URL params
    window.HAL.gotoCard = transitionTo;

    // ── Boot sequence ──────────────────────────────────────────────────
    var startIdx = 0;
    try {
      var m = (window.location.search || '').match(/[?&]card=(\d+)/);
      if (m) startIdx = Math.min(Math.max(parseInt(m[1], 10), 0), cfg.cards.length - 1);
    } catch(e) {}
    showCard(startIdx);
    autoTimer = setTimeout(function() { transitionTo((startIdx + 1) % cfg.cards.length); }, cfg.timing.titleCardDisplay * 1000);
  }
})();
