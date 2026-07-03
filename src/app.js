// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Card cycling, transition logic, boot sequence
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');
  var cfg = window.HAL_CONFIG;
  if (!svgEl || !cfg || !cfg.cards || !cfg.cards.length) return;

  var idx = 0;

  // Clear the SVG immediately so visual state matches the current card.
  function clearCard(color) {
    if (color) document.body.style.background = color;
    svgEl.innerHTML = '';
  }

  function showCard(i, onChartDone) {
    var c = cfg.cards[i % cfg.cards.length];
    clearCard(c.color);

    if (c.type === 'chart') {
      window.HAL.data.fetchCardData(c)
        .then(function(data) {
          c.groups = data && data.groups ? data.groups : [];
          window.HAL.cards.curveFamily.render(c, onChartDone);
        })
        .catch(function() {
          // Fetch failed — skip this card and move to the next
          if (onChartDone) onChartDone();
        });
    } else {
      window.HAL.cards.title.render(c);
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
