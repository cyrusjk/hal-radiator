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

    // ── Set global data fault default ──────────────────────────────
    if (cfg.dataFault) {
      window.HAL.data.defaultDataFault = cfg.dataFault;
    }

    // ── Merge per-card dataFault (card-level overrides global) ─────
    for (var di = 0; di < cfg.cards.length; di++) {
      var card = cfg.cards[di];
      if (!card.dataFault && cfg.dataFault) {
        card.dataFault = cfg.dataFault;
      }
      // Composite zones inherit too
      if (card.type === 'composite' && card.zones) {
        for (var zj = 0; zj < card.zones.length; zj++) {
          var z = card.zones[zj];
          if (!z.dataFault && cfg.dataFault) {
            z.dataFault = cfg.dataFault;
          }
        }
      }
    }

    // ── Validate every card type has a registered renderer ─────────
    var missing = [];
    for (var i = 0; i < cfg.cards.length; i++) {
      var t = cfg.cards[i].type;
      if (t === 'composite') {
        var zones = cfg.cards[i].zones || [];
        for (var j = 0; j < zones.length; j++) {
          var ct = zones[j].chartType;
          if (ct && !window.HAL.cards[ct]) missing.push(ct + ' (zone ' + j + ' of card ' + i + ')');
        }
      }
      if (!window.HAL.cards[t]) missing.push(t + ' (card ' + i + ')');
    }
    if (missing.length > 0) {
      svgEl.style.display = 'none';
      var errEl = document.getElementById('boot-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'boot-error';
        document.body.insertBefore(errEl, document.body.firstChild);
      }
      errEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
        'background:#0a0e12;color:#e8e8e8;font-family:monospace;font-size:14px;' +
        'overflow:auto;z-index:9999;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;padding:40px;box-sizing:border-box;';
      errEl.innerHTML =
        '<div style="max-width:700px">' +
        '<h2 style="color:#ff6b7a;margin:0 0 8px">CONFIGURATION ERROR</h2>' +
        '<p style="color:#aaa;margin:0 0 20px">' + missing.length + ' card renderer(s) not found</p>' +
        '<div style="background:#161a20;border:1px solid #2a2e36;border-radius:6px;padding:16px;margin-bottom:20px">' +
        '<code style="white-space:pre-wrap;line-height:1.6">' +
        missing.join('\n') +
        '</code></div>' +
        '<p style="color:#888;font-size:13px;margin:0">' +
        'Each card type must have a corresponding renderer registered as ' +
        '<code>window.HAL.cards["&lt;type&gt;"]</code> in a .js file under ' +
        '<code>src/cards/</code>. The filename does not need to match the type name — ' +
        'the renderer registers itself by setting <code>window.HAL.cards[type]</code>.</p>' +
        '</div>';
      return;
    }

    var idx = 0, locked = false, autoTimer = null, zoom = 1.0;
    var wrap = document.getElementById('wrap');
    var gen = 0;  // incremented on every showCard → invalidates stale callbacks
    var currentCardType = null;  // tracks last-shown card type for _cleanup

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
        if (fn) fn();
      };
    }

    // ── Show a card by index ─────────────────────────────────────────
    function showCard(i, onDone) {
      clearAuto();
      gen++;
      var myGen = gen;
      var c = cfg.cards[i % cfg.cards.length];

      // Lifecycle: clean up the previous card's renderer before switching
      if (currentCardType && currentCardType !== c.type) {
        var prev = window.HAL.cards[currentCardType];
        if (prev && prev._cleanup) prev._cleanup();
      }

      clearCard(c.color);

      if (c.type !== 'title') {
        window.HAL.data.fetchCardData(c)
          .then(function(data) {
            if (myGen !== gen) return;  // stale: user navigated away
            // Merge data into card config — skip null/undefined only
            if (data) for (var k in data) if (data[k] != null) c[k] = data[k];

            // Fault handling
            var cardType = c.type;
            var df = c.dataFault || window.HAL.data.defaultDataFault || {};
            var mode = df.mode || 'skip';

            if (data && data.error && mode === 'skip') {
              // Skip: advance immediately, no render
              var sk = window.HAL.cards[cardType];
              if (sk && sk._cleanup) sk._cleanup();
              var cb = guard(onDone, myGen); cb && cb();
              return;
            }
            if (data && data.error && mode === 'non-function') {
              cardType = 'non-function';
            }
            // mode 'hide' falls through — renders card with error state

            try {
              var r = window.HAL.cards[cardType];
              if (r && r._cleanup) r._cleanup();
              currentCardType = cardType;
              var cb = guard(onDone, myGen);
              r && r.render ? r.render(c, cb) : cb && cb();
            } catch(e) { console.error('Card render error [', cardType, ']:', e); var cb = guard(onDone, myGen); cb && cb(); }
          })
          .catch(function(e) { console.error('Card fetch error [', c.type, ']:', e); var cb = guard(onDone, myGen); cb && cb(); });
      } else {
        window.HAL.cards.title.render(c);
        currentCardType = 'title';
        if (onDone) {
          autoTimer = setTimeout(guard(onDone, myGen), cfg.timing.titleCardDisplay * 1000);
        }
      }
    }

    // ── Advance to the next card in sequence ─────────────────────────
    function scheduleNext() {
      clearAuto();
      transitionTo((idx + 1) % cfg.cards.length);
    }

    // ── Navigate to a specific card ─────────────────────────────────
    function transitionTo(nextIdx) {
      idx = nextIdx;
      showCard(idx, cardDone);
    }

    // ── Auto-advance callback ────────────────────────────────────────
    var MIN_DISPLAY_MS = 2000;  // minimum time a card must be visible

    function cardDone() {
      if (locked) { showCard(idx, cardDone); return; }

      // If a card's animation / data fetch completed in under MIN_DISPLAY_MS it
      // had no meaningful content to show (e.g. a data source that was
      // unreachable).  Hold for the remaining time so the user sees
      // something instead of an instant flicker, then auto-advance.
      var elapsed = Date.now() - window.__cardStart;
      if (elapsed < MIN_DISPLAY_MS) {
        var myGen = gen;
        setTimeout(function() { if (myGen === gen) cardDone(); }, MIN_DISPLAY_MS - elapsed);
        return;
      }

      scheduleNext();
    }

    // ── Keyboard controls ────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault(); locked = false;
        window.__cardStart = Date.now();
        transitionTo((idx - 1 + cfg.cards.length) % cfg.cards.length);
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault(); locked = false;
        window.__cardStart = Date.now();
        transitionTo((idx + 1) % cfg.cards.length);
      }
      else if (e.key === ' ') {
        e.preventDefault(); locked = !locked;
        window.__cardStart = Date.now();
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
    window.__cardStart = Date.now();
    showCard(startIdx);
    autoTimer = setTimeout(function() { transitionTo((startIdx + 1) % cfg.cards.length); }, cfg.timing.initialPause || 5000);
  }
})();