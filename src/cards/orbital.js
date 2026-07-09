// ═══════════════════════════════════════════════════════════════════════
//  Orbital Mechanics Map
//  — Per-orbit groups: line_N, bold_N, moon_N  (sequential pop-in)
//  — Global groups: markers, labels
//  — Reference axis + central body
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['orbital'] = {

  render: function(data, onDone) {
    var svgEl = data._container || document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var series = (data.series || []);
    if (series.length === 0) { if (onDone) onDone(); return; }

    // ── Layout ────────────────────────────────────────────────────────
    var cx = 500, cy = 400;
    var maxR = 280;
    var centerLabel = data.center || '';

    var maxRData = 0;
    for (var si = 0; si < series.length; si++) {
      if (series[si].r > maxRData) maxRData = series[si].r;
    }
    if (maxRData === 0) maxRData = 1;

    // ── Card background ───────────────────────────────────────────────
    if (!data._container) svgEl.innerHTML = '';
    var bg = e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color });
    svgEl.appendChild(bg);

    // ── Glow filter defs ──────────────────────────────────────────────
    if (!svgEl.querySelector('#glowDot')) {
      var defs = e('defs');
      defs.innerHTML = '<filter id="glowDot" x="-50%" y="-50%" width="200%" height="200%">'
        + '<feGaussianBlur stdDeviation="4" result="blur"/>'
        + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
      svgEl.appendChild(defs);
    }
    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    header.textContent = data.title || '';
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: 20, y: 735, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Group factory ──────────────────────────────────────────────────
    function grp(name) {
      var g = e('g');
      g.setAttributeNS(null, 'data-anim-group', name);
      return g;
    }

    // ── Polar → Cartesian (supports eccentric orbits) ────────────────
    function polar(r, a, ecc, omega) {
      // r = semi-major axis (or radius for circle)
      // a = angle in card coords (0=top, CW)
      // ecc = eccentricity (0 = circle)
      // omega = argument of periapsis in card coords
      if (ecc) {
        var nu = (a - (omega || 0)) * Math.PI / 180;
        r = r * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
      }
      var rad = (a - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
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

    // ── Per-orbit target radius ───────────────────────────────────────
    function orbitR(ri) { return (series[ri].r / maxRData) * maxR; }

    // ── Static groups ─────────────────────────────────────────────────
    var gHeader  = grp('header');
    var gFooter  = grp('footer');
    var gCenter  = grp('centerBody');
    var gCenterL = grp('centerLabel');
    var gAxis    = grp('axis');
    var gMarkers = grp('markers');
    var gLabels  = grp('labels');

    gHeader.appendChild(header);
    gFooter.appendChild(footer);
    svgEl.appendChild(gHeader);
    svgEl.appendChild(gFooter);
    svgEl.appendChild(gCenter);
    svgEl.appendChild(gCenterL);
    svgEl.appendChild(gAxis);
    svgEl.appendChild(gMarkers);
    svgEl.appendChild(gLabels);

    // ── Center body ───────────────────────────────────────────────────
    var centerR = data.centerR || (series.length > 6 ? 10 : 14);
    var centerDot = e('circle', {
      cx: cx, cy: cy, r: centerR, fill: '#ffffff', stroke: 'none',
    });
    centerDot.style.opacity = '0';
    gCenter.appendChild(centerDot);

    if (centerLabel) {
      var cl = e('text', {
        x: cx, y: cy + 4, fill: fg('frame', 0.9),
        'font-size': fs(8), 'font-family': labelFont,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'text-rendering': 'optimizeLegibility',
      });
      cl.textContent = centerLabel;
      cl.style.opacity = '0';
      gCenterL.appendChild(cl);
    }

    // ── Reference axis ────────────────────────────────────────────────
    var axis = e('line', {
      x1: cx, y1: cy, x2: cx + maxR + 30, y2: cy,
      stroke: fg('frame', 0.4), 'stroke-width': 0.6,
    });
    axis.style.opacity = '0';
    gAxis.appendChild(axis);

    // ── Per-orbit rendering ───────────────────────────────────────────
    var outerThreshold = 100;
    var allOrbitGroups = [];

    for (var si = 0; si < series.length; si++) {
      var s = series[si];
      var rScaled = orbitR(si);
      var isOuter = rScaled > outerThreshold;
      var bAngle = s.bodyAngle || 0;
      var ecc = s.eccentricity || 0;
      var omega = s.omega || 0;
      var markers = (s.markers || []).slice();
      // Markers with 'style' define orbit segments; style-less markers are data annotations only
      var segMarkers = markers.filter(function(m) { return m.style; });
      segMarkers.sort(function(a, b) { return a.angle - b.angle; });

      // Create per-orbit groups line_{si}, bold_{si}, moon_{si}, glow_{si}
      var gLine = grp('line_' + si);
      var gBold = grp('bold_' + si);
      var gMoon  = grp('moon_' + si);
      var gGlow  = grp('glow_' + si);
      svgEl.appendChild(gLine);
      svgEl.appendChild(gBold);
      svgEl.appendChild(gMoon);
      svgEl.appendChild(gGlow);
      allOrbitGroups.push({ line: gLine, bold: gBold, moon: gMoon, glow: gGlow, si: si });

      // ── Segmented orbit lines ─────────────────────────────────
      if (segMarkers.length >= 2) {
        for (var mi = 0; mi < segMarkers.length; mi++) {
          var mk  = segMarkers[mi];
          var nxt = segMarkers[(mi + 1) % segMarkers.length];
          var rng = arcRange(mk.angle, nxt.angle);
          var style = mk.style || 'solid';
          var seg = e('path', {
            d: arcPath(rScaled, rng.s, rng.e, 72, ecc, omega),
            fill: 'none',
            stroke: style === 'dashed' ? fg('frame', 0.45) : fg('frame', 0.65),
            'stroke-width': style === 'dashed' ? 0.7 : 0.9,
          });
          if (style === 'dashed') seg.setAttribute('stroke-dasharray', '4,4');
          seg.style.opacity = '0';
          gLine.appendChild(seg);
        }
      } else {
        var fallback = e('path', {
          d: arcPath(rScaled, 0, 360, 240, ecc, omega),
          fill: 'none', stroke: fg('frame', 0.6), 'stroke-width': 0.8,
        });
        fallback.style.opacity = '0';
        gLine.appendChild(fallback);
      }

      // ── Bold trailing arc ─────────────────────────────────────
      var boldDeg = s.boldArc || 60;
      var boldRng = arcRange(bAngle - boldDeg, bAngle);
      var boldArc = e('path', {
        d: arcPath(rScaled, boldRng.s, boldRng.e, 20, ecc, omega),
        fill: 'none', stroke: fg('frame', 1.5), 'stroke-width': 2.2,
      });
      boldArc.style.opacity = '0';
      // Append bold to the per-orbit line group so they appear together
      gBold.appendChild(boldArc);

      // ── Moon body dot + label ─────────────────────────────────
      var adjBodyR = ecc ? rScaled * (1 - ecc*ecc) / (1 + ecc * Math.cos((bAngle - omega) * Math.PI / 180)) : rScaled;
      var bp = polar(adjBodyR, bAngle);
      var bodyR = Math.max(4, Math.min(10, (s.value || 5) / 10));
      var dot = e('circle', {
        cx: bp.x, cy: bp.y, r: bodyR,
        fill: '#ffffff', stroke: 'none',
      });
      dot.style.opacity = '0';
      gMoon.appendChild(dot);

      var labelOffset = bodyR + 10;
      var lp = polar(adjBodyR + labelOffset, bAngle);
      var anchor = (bAngle > 90 && bAngle < 270) ? 'end' : 'start';
      var ml = e('text', {
        x: lp.x, y: lp.y,
        fill: fg('frame', 0.9), 'font-size': fs(7),
        'font-family': labelFont, 'text-anchor': anchor,
        'dominant-baseline': 'central',
        'text-rendering': 'optimizeLegibility',
        filter: 'url(#txtGlow)',
      });
      ml.textContent = s.label || '';
      ml.style.opacity = '0';
      gMoon.appendChild(ml);

      // ── Data marker dots + labels (global marker/label groups) ─
      for (var mi2 = 0; mi2 < markers.length; mi2++) {
        var mk2 = markers[mi2];
        var adjMrk = ecc ? rScaled * (1 - ecc*ecc) / (1 + ecc * Math.cos((mk2.angle - omega) * Math.PI / 180)) : rScaled;
        // Optional marker-level r override (data units, scaled to display)
        var mkR = mk2.r != null ? (mk2.r / maxRData) * maxR : adjMrk;
        var mp = polar(mkR, mk2.angle);
        var isBodyPos = Math.abs(mk2.angle - bAngle) < 0.5 && mk2.r == null;

        // Marker dot (skip at body position)
        if (!isBodyPos) {
          var md = e('circle', {
            cx: mp.x, cy: mp.y, r: 2.5,
            fill: fg('frame', 0.7), stroke: 'none',
          });
          md.style.opacity = '0';
          gMarkers.appendChild(md);
        }

        // Glow highlight — fuzzy bright white bloom
        if (mk2.glow) {
          var glowCfg = typeof mk2.glow === 'object' ? mk2.glow : {};
          var gh = e('circle', {
            cx: mp.x, cy: mp.y, r: glowCfg.r || 12,
            fill: 'rgba(255,255,255,0.7)',
            stroke: 'none',
            filter: 'url(#glowDot)',
          });
          gh.style.opacity = '0';
          gGlow.appendChild(gh);
        }

        // Label + leader
        if (mk2.label && !isBodyPos) {
          var LABEL_OFFSET = 16;
          var tp = polar(mkR + LABEL_OFFSET, mk2.angle);
          var txt;

          if (isOuter) {
            // Perpendicular to orbit tangent = radial, outward
            var radialAngle = mk2.angle - 90;
            txt = e('text', {
              x: tp.x, y: tp.y,
              fill: fg('frame', 0.75), 'font-size': fs(5),
              'font-family': labelFont,
              'text-anchor': 'start', 'dominant-baseline': 'central',
              'text-rendering': 'optimizeLegibility',
              filter: 'url(#txtGlow)',
            });
            txt.setAttribute('transform', 'rotate(' + radialAngle + ',' + tp.x + ',' + tp.y + ')');
          } else {
            var ha = mk2.angle > 90 && mk2.angle < 270 ? 'end' : 'start';
            txt = e('text', {
              x: tp.x, y: tp.y,
              fill: fg('frame', 0.75), 'font-size': fs(5),
              'font-family': labelFont,
              'text-anchor': ha, 'dominant-baseline': 'central',
              'text-rendering': 'optimizeLegibility',
              filter: 'url(#txtGlow)',
            });
          }
          txt.textContent = mk2.label;
          txt.style.opacity = '0';
          gLabels.appendChild(txt);

          var lead = e('line', {
            x1: mp.x, y1: mp.y, x2: tp.x, y2: tp.y,
            stroke: fg('frame', 0.25), 'stroke-width': 0.4,
          });
          lead.style.opacity = '0';
          gLabels.appendChild(lead);
        }
      }
    }

    // ── Collect animation groups ──────────────────────────────────────
    function collectGroup(name) {
      var arr = [];
      var els = svgEl.querySelectorAll('g[data-anim-group="' + name + '"]');
      for (var i = 0; i < els.length; i++) {
        for (var ci = 0; ci < els[i].children.length; ci++) {
          arr.push(els[i].children[ci]);
        }
      }
      return arr;
    }

    var groups = {
      header:      [header],
      footer:      [footer],
      centerBody:  [centerDot],
      centerLabel: centerLabel ? [cl] : [],
      axis:        [axis],
      markers:     collectGroup('markers'),
      labels:      collectGroup('labels'),
    };

    // Per-orbit groups
    for (var oi = 0; oi < allOrbitGroups.length; oi++) {
      var og = allOrbitGroups[oi];
      groups['line_' + og.si] = [];
      // Collect children from gLine element
      for (var ci = 0; ci < og.line.children.length; ci++) {
        groups['line_' + og.si].push(og.line.children[ci]);
      }
      groups['bold_' + og.si] = [];
      for (var ci = 0; ci < og.bold.children.length; ci++) {
        groups['bold_' + og.si].push(og.bold.children[ci]);
      }
      groups['moon_' + og.si] = [];
      for (var ci = 0; ci < og.moon.children.length; ci++) {
        groups['moon_' + og.si].push(og.moon.children[ci]);
      }
      groups['glow_' + og.si] = [];
      for (var ci = 0; ci < og.glow.children.length; ci++) {
        groups['glow_' + og.si].push(og.glow.children[ci]);
      }
    }

    // ── Run animation ─────────────────────────────────────────────────
    window.HAL.anim.run(data, groups, onDone);
  }
};
