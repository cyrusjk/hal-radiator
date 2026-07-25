// ═══════════════════════════════════════════════════════════════════════
//  Polar / Cyclic Chart Card
//  — Cyclic data renderer: concentric rings, radial spokes, data polygons
//  — Spoke count = values length of first series (any cyclic data fits)
//  — Reads series from data.groups[0].series, fallback to data.series
//  — Config-driven: color gradients, arcs with ticks, connector lines, legend
//  — Animation groups: header, footer, rings, spokes, dataPolygons, arcs, legend
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

// ── Pure helpers extracted from the renderer for testability ─────────

// Polar → Cartesian: angle in radians, 0 = top, CW
function polarPt(cx, cy, r, angleRad) {
  return { x: cx + r * Math.sin(angleRad), y: cy - r * Math.cos(angleRad) };
}

// Build ring path (concentric circle)
function ringPath(cx, cy, r, steps) {
  steps = steps || 120;
  var d = '';
  for (var a = 0; a <= 360; a += 360 / steps) {
    var rad = a * Math.PI / 180;
    var p = polarPt(cx, cy, r, rad);
    d += (a === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }
  return d;
}

// Compute spoke stats per angular bucket (min, max, avg, mean across series)
function computeSpokeStats(series, nSpokes) {
  var stats = [];
  var svLen = series[0].values ? series[0].values.length : 0;
  for (var vi = 0; vi < nSpokes; vi++) {
    var vals = [];
    var startIdx = svLen > 0 ? Math.floor(vi * svLen / nSpokes) : 0;
    var endIdx = svLen > 0 ? Math.floor((vi + 1) * svLen / nSpokes) : 0;
    if (endIdx <= startIdx) endIdx = startIdx + 1;
    for (var si = 0; si < series.length; si++) {
      var sv = series[si].values || [];
      var sum = 0, cnt = 0;
      for (var di = startIdx; di < endIdx && di < sv.length; di++) {
        if (sv[di] != null) { sum += sv[di]; cnt++; }
      }
      if (cnt > 0) vals.push(sum / cnt);
    }
    if (vals.length === 0) {
      stats.push({ min: 0, max: 0, avg: 0, mean: 0 });
      continue;
    }
    vals.sort(function(a,b){return a-b;});
    var sum = 0;
    for (var i = 0; i < vals.length; i++) sum += vals[i];
    var avg = sum / vals.length;
    var mid = Math.floor(vals.length / 2);
    var mean = vals.length % 2 === 0 ? (vals[mid-1] + vals[mid]) / 2 : vals[mid];
    stats.push({ min: vals[0], max: vals[vals.length-1], avg: avg, mean: mean });
  }
  return stats;
}

// Generate color palette from two control points (cool→white→warm)
function generateColors(n, coolColor, warmColor) {
  if (n === 0) return [];
  var colors = [];
  var cc = coolColor || { r: 100, g: 180, b: 255 };
  var wc = warmColor || { r: 255, g: 180, b: 80 };
  for (var ci = 0; ci < n; ci++) {
    var t = n > 1 ? ci / (n - 1) : 0.5;
    var mid = 0.4;
    var mix, r, g, b;
    if (t <= mid) {
      mix = t / mid;
      r = Math.round(cc.r + (255 - cc.r) * mix);
      g = Math.round(cc.g + (255 - cc.g) * mix);
      b = Math.round(cc.b + (255 - cc.b) * mix);
    } else {
      mix = (t - mid) / (1 - mid);
      r = Math.round(255 + (wc.r - 255) * mix);
      g = Math.round(255 + (wc.g - 255) * mix);
      b = Math.round(255 + (wc.b - 255) * mix);
    }
    colors.push('rgb(' + r + ',' + g + ',' + b + ')');
  }
  return colors;
}

// Apply smoothing: moving-window average
function smoothValues(values, factor) {
  if (!factor || factor <= 0) return values.slice();
  var smoothed = values.slice();
  var windowSize = Math.round(factor * values.length);
  if (windowSize <= 0) return smoothed;
  // Window spans entire dataset: use overall average (perfect circle)
  if (windowSize >= values.length) {
    var sum = 0, cnt = 0;
    for (var tvi = 0; tvi < values.length; tvi++) {
      if (values[tvi] != null) { sum += values[tvi]; cnt++; }
    }
    var overallAvg = cnt > 0 ? sum / cnt : 0;
    for (var tvi = 0; tvi < values.length; tvi++) {
      if (values[tvi] != null) smoothed[tvi] = overallAvg;
    }
    return smoothed;
  }
  var halfWin = Math.floor(windowSize / 2);
  for (var tvi = 0; tvi < values.length; tvi++) {
    if (values[tvi] == null) continue;
    var sum = 0, cnt = 0;
    for (var wi = tvi - halfWin; wi <= tvi + halfWin; wi++) {
      if (wi >= 0 && wi < values.length && values[wi] != null) {
        sum += values[wi]; cnt++;
      }
    }
    if (cnt > 0) smoothed[tvi] = sum / cnt;
  }
  return smoothed;
}

// Find first rising crossing that stays above target for MIN_CROSS days
function findSpringCrossing(values, target) {
  var MIN_CROSS = 14;
  var i = 0;
  while (i < values.length - 1) {
    var p0 = values[i], p1 = values[i + 1];
    if (p0 != null && p1 != null && p0 <= target && p1 >= target) {
      var above = 0, j;
      for (j = i + 1; j < values.length && above < MIN_CROSS; j++) {
        if (values[j] != null && values[j] >= target) above++;
        else if (values[j] != null) break;
      }
      if (above >= MIN_CROSS) {
        var t = (target - p0) / (p1 - p0);
        return (i + t) / values.length * 360;
      }
      i = j;
      continue;
    }
    i++;
  }
  return null;
}

// Cluster a set of angles: find the tightest grouping
function clusterAngles(angles) {
  if (angles.length === 0) return { start: 0, end: 0, span: 0, gap: 0 };
  var s = angles.slice().sort(function(a,b){return a-b;});
  var uniq = [s[0]];
  for (var i = 1; i < s.length; i++) { if (s[i] !== s[i-1]) uniq.push(s[i]); }
  if (uniq.length === 1) {
    return { start: uniq[0] - 1, end: uniq[0] + 1, span: 2, gap: 358 };
  }
  var maxGap = 0, gapIdx = 0;
  for (var i = 0; i < uniq.length; i++) {
    var next = uniq[(i + 1) % uniq.length];
    var gap = (i === uniq.length - 1) ? (uniq[0] + 360 - uniq[i]) : (uniq[i+1] - uniq[i]);
    if (gap > maxGap) { maxGap = gap; gapIdx = i; }
  }
  var gapStart = uniq[gapIdx];
  var clusterStart = (gapStart + maxGap) % 360;
  var clusterEnd = gapStart;
  if (clusterEnd <= clusterStart) clusterEnd += 360;
  return { start: clusterStart, end: clusterEnd, span: clusterEnd - clusterStart, gap: maxGap };
}

// Compute per-year stat angles (min, max, avg, mean spring crossing)
function computeYearStats(series) {
  var minAngles = [], maxAngles = [], avgAngles = [], meanAnglesAll = [];
  var minVals = [], maxVals = [], avgVals = [], meanVals = [];
  for (var si = 0; si < series.length; si++) {
    var sv = series[si].values || [];
    var valid = [];
    for (var vi = 0; vi < sv.length; vi++) {
      if (sv[vi] != null) valid.push({ idx: vi, v: sv[vi] });
    }
    if (valid.length === 0) continue;

    var minV = Infinity, minA = 0;
    for (var i = 0; i < valid.length; i++) {
      if (valid[i].v < minV) { minV = valid[i].v; minA = valid[i].idx / sv.length * 360; }
    }
    minAngles.push(minA); minVals.push(minV);

    var maxV = -Infinity, maxA = 0;
    for (var i = 0; i < valid.length; i++) {
      if (valid[i].v > maxV) { maxV = valid[i].v; maxA = valid[i].idx / sv.length * 360; }
    }
    maxAngles.push(maxA); maxVals.push(maxV);

    var sum = 0;
    for (var i = 0; i < valid.length; i++) sum += valid[i].v;
    var avg = sum / valid.length;
    var avgCross = findSpringCrossing(sv, avg);
    if (avgCross != null) { avgAngles.push(avgCross); avgVals.push(avg); }

    var sorted = sv.filter(function(v){return v!=null;}).sort(function(a,b){return a-b;});
    var mid = Math.floor(sorted.length / 2);
    var median = sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
    var meanCross = findSpringCrossing(sv, median);
    if (meanCross != null) { meanAnglesAll.push(meanCross); meanVals.push(median); }
  }
  return { minAngles: minAngles, maxAngles: maxAngles, avgAngles: avgAngles, meanAnglesAll: meanAnglesAll,
           minVals: minVals, maxVals: maxVals, avgVals: avgVals, meanVals: meanVals };
}

// Build an SVG arc path (elliptical arc segment at radius arcR)
function buildArcPath(cx, cy, arcR, startAngleDeg, endAngleDeg) {
  var startAngle = startAngleDeg * Math.PI / 180;
  var endAngle = endAngleDeg * Math.PI / 180;
  var p = polarPt(cx, cy, arcR, startAngle);
  var q = polarPt(cx, cy, arcR, endAngle);
  var span = endAngle - startAngle;
  var large = (Math.abs(span) % (Math.PI * 2)) > Math.PI ? 1 : 0;
  return 'M' + p.x.toFixed(1) + ',' + p.y.toFixed(1) +
    ' A' + arcR.toFixed(1) + ',' + arcR.toFixed(1) + ' 0 ' +
    large + ',1 ' + q.x.toFixed(1) + ',' + q.y.toFixed(1);
}

// ── Renderer ──────────────────────────────────────────────────────────
window.HAL.cards['polar'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    window.HAL.svg.addGlowFilter(svgEl);
    var vis = window.HAL_CONFIG.visual || {};
    var vc = vis.chart || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var groupsData = data.groups || [];
    var series = (groupsData.length > 0 && groupsData[0].series)
      ? groupsData[0].series : (data.series || []);
    if (series.length === 0) { if (onDone) onDone(); return; }

    // ── Layout ────────────────────────────────────────────────────
    var cx = data.cx || vc.cx || 500;
    var cy = data.cy || vc.cy || 400;
    var maxR = data.maxR || vc.maxR || 260;
    var minR = data.minR || vc.minR || 30;
    var radius = maxR - minR;
    var nSpokes = data.spokes || 12;
    if (nSpokes < 2) { if (onDone) onDone(); return; }

    var mOpts = data.markers || {};
    var showDataMin  = mOpts.min !== false;
    var showDataMax  = mOpts.max !== false;
    var showDataAvg  = mOpts.avg !== false;
    var showDataMean = mOpts.mean !== false;
    var showArcs     = mOpts.arcs !== false;
    var showConnectors = mOpts.connectors !== false;
    var smoothFactor = Math.max(0, Math.min(1, data.smooth || 0));
    var angleStep = (2 * Math.PI) / nSpokes;
    var spokeLabels = data.labels || [];

    // Value range
    var valMin = data.valMin, valMax = data.valMax;
    if (valMin == null || valMax == null) {
      valMin = Infinity; valMax = -Infinity;
      for (var si = 0; si < series.length; si++) {
        var sv = series[si].values || [];
        for (var vi = 0; vi < sv.length; vi++) {
          if (sv[vi] != null) {
            if (sv[vi] < valMin) valMin = sv[vi];
            if (sv[vi] > valMax) valMax = sv[vi];
          }
        }
      }
    }
    var pad = (valMax - valMin) * 0.15 || 1.5;
    valMin -= pad; valMax += pad;
    var valRange = valMax - valMin || 1;

    function valToR(v) {
      return minR + ((v - valMin) / valRange) * radius;
    }

    // Spoke-level stats
    var spokeStats = computeSpokeStats(series, nSpokes);
    var globalMin = Infinity, globalMax = -Infinity, globalAvgSum = 0, globalAvgN = 0;
    for (var vi = 0; vi < nSpokes; vi++) {
      if (spokeStats[vi].min < globalMin) globalMin = spokeStats[vi].min;
      if (spokeStats[vi].max > globalMax) globalMax = spokeStats[vi].max;
      globalAvgSum += spokeStats[vi].avg; globalAvgN++;
    }
    var globalAvg = globalAvgSum / globalAvgN;

    // ── Background ─────────────────────────────────────────────────
    svgEl.appendChild(e('rect', {
      x: 0, y: 0, width: data.w || 1000, height: data.h || 750, fill: data.color
    }));

    // ── Header / Footer ────────────────────────────────────────────
    var header = e('text', {
      filter: 'url(#txtGlow)',
      x: data.titleX || 15, y: data.titleY || 15,
      fill: fg('frame', 1.9), 'font-size': fs(data.titleSize || 14),
      'font-family': (vis.fonts || {}).title || labelFont,
      'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    var subtitle = null;
    if (data.subtitle) {
      subtitle = e('text', {
        filter: 'url(#txtGlow)',
        x: (data.titleX || 20) + (data.titleSize || 14) * 5.5, y: data.titleY || 25,
        fill: fg('frame', 0.85), 'font-size': fs(data.subSize || 9),
        'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      });
      subtitle.textContent = data.subtitle;
      subtitle.style.opacity = '0';
      svgEl.appendChild(subtitle);
    }

    var footer = e('text', {
      filter: 'url(#txtGlow)',
      x: 20, y: 735, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Rings ──────────────────────────────────────────────────────
    var ringElements = [];
    var scaleLabels = [];
    var nRings = data.rings || 5;
    for (var ri = 0; ri <= nRings; ri++) {
      var ringR = minR + (ri / nRings) * radius;
      var isOuter = ri === nRings;
      var ringColor = isOuter ? (data.outerRingColor || 'rgba(255,255,255,0.35)') : (data.ringColor || fg('frame', 0.08 + ri * 0.03));
      var ring = e('path', {
        d: ringPath(cx, cy, ringR),
        fill: 'none', stroke: ringColor,
        'stroke-width': ri === 0 ? (data.ringWidth0 || 0.3) : (data.ringWidth || 0.5),
      });
      svgEl.appendChild(ring);
      ringElements.push(ring);

      if (ri > 0 && data.scaleLabels !== false) {
        var ringVal = valMin + (ri / nRings) * valRange;
        var lblP = polarPt(cx, cy, ringR, 0);
        var sl = e('text', {
          filter: 'url(#txtGlow)',
          x: lblP.x + 4, y: lblP.y + 3,
          fill: fg('frame', 0.7), 'font-size': fs(data.scaleFontSize || 8),
          'font-family': labelFont,
        });
        sl.textContent = ringVal.toFixed(data.scalePrecision || 1);
        sl.style.opacity = '0';
        scaleLabels.push(sl);
      }
    }

    // ── Spokes ─────────────────────────────────────────────────────
    var spokeElements = [];
    var monthLabelElements = [];
    var prevLabelIdx = -1;
    for (var si = 0; si < nSpokes; si++) {
      var angle = si * angleStep;
      var p = polarPt(cx, cy, maxR, angle);
      var spoke = e('line', {
        x1: cx, y1: cy, x2: p.x, y2: p.y,
        stroke: data.spokeColor || fg('frame', 0.12),
        'stroke-width': data.spokeWidth || 0.3,
      });
      spoke.style.opacity = '0';
      svgEl.appendChild(spoke);
      spokeElements.push(spoke);

      var labelOffset = data.labelOffset || 22;
      var lp = polarPt(cx, cy, maxR + labelOffset, angle);
      var lblText = '';
      var labelIdx = 0;
      if (spokeLabels.length > 0 && spokeLabels.length !== nSpokes) {
        labelIdx = Math.round(si * (spokeLabels.length - 1) / (nSpokes - 1));
        lblText = spokeLabels[labelIdx] || '';
      } else {
        lblText = spokeLabels[si] || '';
        labelIdx = si;
      }
      if (lblText && labelIdx !== prevLabelIdx) {
        prevLabelIdx = labelIdx;
        var lbl = e('text', {
          filter: 'url(#txtGlow)',
          x: lp.x, y: lp.y + 3,
          fill: data.labelColor || fg('frame', 0.7),
          'font-size': fs(data.labelFontSize || 9),
          'font-family': labelFont, 'text-anchor': 'middle',
        });
        lbl.textContent = lblText;
        lbl.style.opacity = '0';
        spokeElements.push(lbl);
        monthLabelElements.push(lbl);
      }
    }
    for (var si = 0; si < scaleLabels.length; si++) svgEl.appendChild(scaleLabels[si]);
    for (var mi = 0; mi < monthLabelElements.length; mi++) svgEl.appendChild(monthLabelElements[mi]);

    // ── Colors ─────────────────────────────────────────────────────
    var colors = data.colors || generateColors(series.length, data.coolColor, data.warmColor);

    // ── Data polygons ──────────────────────────────────────────────
    var polygonElements = [];
    for (var si = 0; si < series.length; si++) {
      var sv = series[si].values || [];
      var smoothed = smoothValues(sv, smoothFactor);
      var pathD = '';
      var sColor = colors[si % colors.length];
      var baseAlpha = data.baseAlpha != null ? data.baseAlpha : 0.3;
      var alphaStep = series.length > 1 ? ((data.alphaMax || 0.8) - baseAlpha) / (series.length - 1) : 0;
      var sAlpha = baseAlpha + si * alphaStep;

      for (var vi = 0; vi < smoothed.length; vi++) {
        if (smoothed[vi] == null) continue;
        var r = valToR(smoothed[vi]);
        var a = (vi / smoothed.length) * 2 * Math.PI;
        var pt = polarPt(cx, cy, r, a);
        pathD += (pathD === '' ? 'M' : 'L') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1);
      }
      if (pathD !== '') {
        var partial = series[si]._partial;
        if (!partial && smoothed.length > 10) {
          var nullTail = 0, threshold = Math.max(10, Math.floor(smoothed.length * 0.1));
          for (var ni = smoothed.length - 1; ni >= Math.max(0, smoothed.length - threshold); ni--) {
            if (smoothed[ni] == null) nullTail++;
          }
          partial = nullTail >= threshold;
        }
        if (!partial) {
          var firstR = valToR(smoothed[0]);
          var firstP = polarPt(cx, cy, firstR, 0);
          pathD += 'L' + firstP.x.toFixed(1) + ',' + firstP.y.toFixed(1) + 'Z';
        }
      }
      var lineW = data.lineWidth || 0.8;
      var lineA = data.lineAlpha != null ? data.lineAlpha : 1.0;
      var poly = e('path', {
        d: pathD, fill: 'none', stroke: sColor,
        'stroke-width': lineW,
        'stroke-opacity': (lineA * sAlpha).toFixed(2),
        filter: 'url(#gfxGlow)',
      });
      svgEl.appendChild(poly);
      polygonElements.push(poly);
    }
    for (var pdi = 0; pdi < polygonElements.length; pdi++) {
      polygonElements[pdi].style.opacity = '0';
    }

    // ── Year stats (min/max/avg/mean dots) ─────────────────────────
    var yearStats = computeYearStats(series);
    for (var mi = 0; mi < series.length; mi++) {
      var sv = series[mi].values || [];
      if (sv.length < 2) continue;
      var minIdx = -1, minVal = Infinity, maxIdx = -1, maxVal = -Infinity;
      for (var vi = 0; vi < sv.length; vi++) {
        if (sv[vi] == null) continue;
        if (showDataMin && sv[vi] < minVal) { minVal = sv[vi]; minIdx = vi; }
        if (showDataMax && sv[vi] > maxVal) { maxVal = sv[vi]; maxIdx = vi; }
      }
      if (showDataMin && minIdx >= 0) {
        var p = polarPt(cx, cy, valToR(minVal), (minIdx / sv.length) * 2 * Math.PI);
        var dot = e('circle', { cx: p.x, cy: p.y, r: 3, fill: '#ffffff', stroke: 'none', filter: 'url(#gfxGlow)' });
        dot.style.opacity = '0';
        svgEl.appendChild(dot);
        polygonElements.push(dot);
      }
      if (showDataMax && maxIdx >= 0) {
        var p = polarPt(cx, cy, valToR(maxVal), (maxIdx / sv.length) * 2 * Math.PI);
        var dot = e('circle', { cx: p.x, cy: p.y, r: 3, fill: '#ffffff', stroke: 'none', filter: 'url(#gfxGlow)' });
        dot.style.opacity = '0';
        svgEl.appendChild(dot);
        polygonElements.push(dot);
      }
      if (showDataAvg && mi < yearStats.avgAngles.length) {
        var angRad = yearStats.avgAngles[mi] * Math.PI / 180;
        var p = polarPt(cx, cy, valToR(yearStats.avgVals[mi] || 0), angRad);
        var dot = e('circle', { cx: p.x, cy: p.y, r: 3, fill: '#ffffff', stroke: 'none', filter: 'url(#gfxGlow)' });
        dot.style.opacity = '0';
        svgEl.appendChild(dot);
        polygonElements.push(dot);
      }
      if (showDataMean && mi < yearStats.meanAnglesAll.length) {
        var angRad = yearStats.meanAnglesAll[mi] * Math.PI / 180;
        var p = polarPt(cx, cy, valToR(yearStats.meanVals[mi] || 0), angRad);
        var dot = e('circle', { cx: p.x, cy: p.y, r: 3, fill: '#ffffff', stroke: 'none', filter: 'url(#gfxGlow)' });
        dot.style.opacity = '0';
        svgEl.appendChild(dot);
        polygonElements.push(dot);
      }
    }

    // ── Arc bands ──────────────────────────────────────────────────
    var arcElements = [];
    if (data.arcs && showArcs) {
      var clusters = {
        min: clusterAngles(yearStats.minAngles),
        max: clusterAngles(yearStats.maxAngles),
        avg: clusterAngles(yearStats.avgAngles),
        mean: clusterAngles(yearStats.meanAnglesAll)
      };
      var allAngles = {
        min: yearStats.minAngles,
        max: yearStats.maxAngles,
        avg: yearStats.avgAngles,
        mean: yearStats.meanAnglesAll
      };

      for (var ai = 0; ai < data.arcs.length; ai++) {
        var ac = data.arcs[ai];
        var statKey = ac.stat || 'avg';
        var arcR = maxR + (ac.rOff || 0);
        var arcColor = ac.color || '#ffffff';
        var arcW = ac.width || 2;
        var cluster = clusters[statKey];
        if (!cluster || cluster.span === 0) continue;

        var startAngleDeg = cluster.start;
        var endAngleDeg = cluster.end;

        // Draw arc(s) — wrap across 0 if needed
        function drawArc(sDeg, eDeg) {
          var d = buildArcPath(cx, cy, arcR, sDeg, eDeg);
          var arc = e('path', {
            d: d, fill: 'none', stroke: arcColor,
            'stroke-width': arcW,
            'stroke-opacity': ac.alpha != null ? ac.alpha : 0.6,
          });
          arc.style.opacity = '0';
          svgEl.appendChild(arc);
          arcElements.push(arc);
        }
        if (startAngleDeg > endAngleDeg) {
          drawArc(startAngleDeg, 360);
          drawArc(0, endAngleDeg);
        } else {
          drawArc(startAngleDeg, endAngleDeg);
        }

        // Ticks
        if (ac.ticks !== false) {
          var tickLen = ac.tickLen || 5;
          var tickW = ac.tickWidth || 1.0;
          var tickColor = ac.tickColor || arcColor;
          var tickAlpha = ac.tickAlpha != null ? ac.tickAlpha : (ac.alpha != null ? ac.alpha : 0.6);
          var yearAngles = allAngles[statKey] || [];
          for (var yi = 0; yi < yearAngles.length; yi++) {
            var angRad = yearAngles[yi] * Math.PI / 180;
            var inner = polarPt(cx, cy, arcR - tickLen, angRad);
            var outer = polarPt(cx, cy, arcR + tickLen, angRad);
            var tick = e('line', {
              x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y,
              stroke: tickColor, 'stroke-width': tickW, 'stroke-opacity': tickAlpha,
            });
            tick.style.opacity = '0';
            svgEl.appendChild(tick);
            arcElements.push(tick);
          }
        }

        // Connector lines
        if (showConnectors && ac.connectors !== false && ac.lineColor) {
          var yearAngles = allAngles[statKey] || [];
          for (var yi = 0; yi < yearAngles.length && yi < series.length; yi++) {
            var angDeg = yearAngles[yi];
            var sv = series[yi].values || [];
            var pos = (angDeg / 360) * sv.length;
            var idx = Math.floor(pos);
            var frac = pos - idx;
            var nextIdx = (idx + 1) % sv.length;
            if (sv[idx] == null || sv[nextIdx] == null) continue;
            var v = sv[idx] + (sv[nextIdx] - sv[idx]) * frac;
            var r = valToR(v);
            var angRad = angDeg * Math.PI / 180;
            var innerP = polarPt(cx, cy, r, angRad);
            var outerP = polarPt(cx, cy, arcR, angRad);
            var cl = e('line', {
              x1: innerP.x, y1: innerP.y, x2: outerP.x, y2: outerP.y,
              stroke: ac.lineColor, 'stroke-width': 0.75, 'stroke-opacity': 0.4,
            });
            cl.style.opacity = '0';
            svgEl.appendChild(cl);
            arcElements.push(cl);
          }
        }
      }
    }

    // ── Legend ─────────────────────────────────────────────────────
    var legendElements = [];
    if (data.legend !== false && series.length > 1) {
      var legendX = data.legendX || 20;
      var legendY = data.legendY || 660;
      var legendCols = data.legendCols || 2;
      var legendSpacing = data.legendSpacing || 14;
      var legendFontSize = data.legendFontSize || 8;
      var itemsPerCol = Math.ceil(series.length / legendCols);
      for (var si = 0; si < series.length; si++) {
        var col = Math.floor(si / itemsPerCol);
        var row = si % itemsPerCol;
        var lx = legendX + col * 100;
        var ly = legendY + row * legendSpacing;
        var dot = e('rect', {
          x: lx, y: ly - 3, width: 6, height: 6,
          fill: colors[si % colors.length],
          opacity: (0.35 + si * 0.06).toFixed(2),
        });
        svgEl.appendChild(dot);
        legendElements.push(dot);
        var lt = e('text', {
          filter: 'url(#txtGlow)',
          x: lx + 10, y: ly + 3,
          fill: fg('frame', 0.35 + si * 0.06), 'font-size': fs(legendFontSize),
          'font-family': labelFont,
        });
        lt.textContent = series[si].label || '';
        svgEl.appendChild(lt);
        legendElements.push(lt);
      }
    }
    if (legendElements.length && arcElements.length) {
      for (var li = 0; li < legendElements.length; li++) {
        svgEl.insertBefore(legendElements[li], arcElements[0]);
      }
    }

    // ── Group map ─────────────────────────────────────────────────
    var groupMap = {};
    groupMap.header = [header];
    if (subtitle) groupMap.header.push(subtitle);
    groupMap.footer = footer;
    groupMap.rings = ringElements;
    groupMap.scaleLabels = scaleLabels;
    groupMap.spokes = spokeElements;
    groupMap.monthLabels = monthLabelElements;
    groupMap.dataPolygons = polygonElements;
    groupMap.legend = legendElements;
    groupMap.arcs = arcElements;

    // ── Animation ─────────────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer'] },
      { action: 'wait',       duration: 400 },
      { action: 'appear',     groups: ['rings'], order: 'sequential', gap: 80 },
      { action: 'appear',     groups: ['spokes'], order: 'simultaneous' },
      { action: 'appear',     groups: ['scaleLabels'], order: 'simultaneous' },
      { action: 'appear',     groups: ['monthLabels'], order: 'simultaneous' },
      { action: 'wait',       duration: 400 },
      { action: 'appear',     groups: ['dataPolygons', 'legend'], order: 'sequential', gap: 150 },
      { action: 'wait',       duration: 400 },
      { action: 'wait',       duration: 200 },
      { action: 'appear',     groups: ['arcs'], order: 'simultaneous' },
      { action: 'wait',       duration: 6000 },
      { action: 'disappear',  groups: ['legend'], order: 'sequential', gap: 40 },
      { action: 'disappear',  groups: ['arcs'], order: 'simultaneous' },
      { action: 'disappear',  groups: ['legend'], order: 'sequential', gap: 40 },
      { action: 'disappear',  groups: ['dataPolygons'], order: 'sequential', gap: 100 },
      { action: 'wait',       duration: 200 },
      { action: 'disappear',  groups: ['monthLabels'], order: 'simultaneous' },
      { action: 'disappear',  groups: ['scaleLabels'], order: 'simultaneous' },
      { action: 'disappear',  groups: ['spokes'], order: 'simultaneous' },
      { action: 'disappear',  groups: ['rings'], order: 'sequential', gap: 80 },
      { action: 'wait',       duration: 200 },
      { action: 'disappear',  groups: ['header', 'footer'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
