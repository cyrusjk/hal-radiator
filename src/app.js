// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Card cycling, transition logic, boot sequence
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');
  var cfg = HAL_CONFIG;
  var debug = [];

  function fail(msg) { debug.push(msg); document.getElementById('card').innerHTML = '<text x="10" y="20" fill="red" font-size="14">' + msg + '</text>'; }

  if (!svgEl) { fail('no svgEl'); return; }
  if (!cfg) { fail('no cfg'); return; }
  if (!cfg.cards || !cfg.cards.length) { fail('no cards'); return; }

  var idx = 0;

  function showCard(i, onChartDone) {
    var c = cfg.cards[i % cfg.cards.length];
    document.body.style.background = c.color;
    if (c.type === 'chart') {
      HAL.data.fetchCardData(c).then(function(data) {
        c.groups = data.groups;
        HAL.cards.curveFamily.render(c, onChartDone);
      });
    } else {
      HAL.cards.title.render(c);
    }
  }

  function scheduleNext() {
    var next = (idx + 1) % cfg.cards.length;
    var nextCard = cfg.cards[next % cfg.cards.length];
    if (nextCard.type === 'chart') {
      transitionTo(next);
    } else {
      setTimeout(transitionTo, cfg.timing.titleCardDisplay, next);
    }
  }

  function transitionTo(nextIdx) {
    idx = nextIdx;
    var c = cfg.cards[idx % cfg.cards.length];
    if (c.type === 'chart') {
      showCard(idx, scheduleNext);
    } else {
      showCard(idx);
      scheduleNext();
    }
  }

  showCard(0);
  setTimeout(transitionTo, cfg.timing.titleCardDisplay, 1);
})();
