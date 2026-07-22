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



window.HAL.cards['polar'] = {



  render: function(data, onDone) {

    var svgEl = window.HAL.svg.getContainer(data);

    var vis = window.HAL_CONFIG.visual || {};

    var vc = vis.chart || {};

    var labelFont = (vis.fonts || {}).label || 'monospace';

    var e = window.HAL.svg.el;

    var ns = window.HAL.svg.ns;

    var fg = window.HAL.svg.fg;

    var fs = window.HAL.svg.fs;



    var groupsData = data.groups || [];

    var series = (groupsData.length > 0 && groupsData[0].series)

      ? groupsData[0].series

      : (data.series || []);



    if (series.length === 0) { if (onDone) onDone(); return; }



    // ── Layout ────────────────────────────────────────────────────────

    var cx = data.cx || vc.cx || 500;

    var cy = data.cy || vc.cy || 400;

    var maxR = data.maxR || vc.maxR || 260;

    var minR = data.minR || vc.minR || 30;

    var radius = maxR - minR;



    var nSpokes = (series[0].values || []).length;

    if (nSpokes < 2) { if (onDone) onDone(); return; }

    var angleStep = (2 * Math.PI) / nSpokes;



    var spokeLabels = data.labels || [];



    // Value range

    var valMin = data.valMin;

    var valMax = data.valMax;

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

    // Add 15% padding so data points don't sit directly on minR/maxR
    var pad = (valMax - valMin) * 0.15 || 1.5;
    valMin -= pad;
    valMax += pad;

    var valRange = valMax - valMin || 1;



    function valToR(v) {

      return minR + ((v - valMin) / valRange) * radius;

    }



    // ── Spoke stats (across all series) ───────────────────────────────

    // For each spoke (month), compute min/avg/mean/max across all years

    var spokeStats = [];

    for (var vi = 0; vi < nSpokes; vi++) {

      var vals = [];

      for (var si = 0; si < series.length; si++) {

        var sv = series[si].values || [];

        if (vi < sv.length && sv[vi] != null) vals.push(sv[vi]);

      }

      if (vals.length === 0) {

        spokeStats.push({ min: valMin, max: valMax, avg: (valMin+valMax)/2, mean: (valMin+valMax)/2 });

        continue;

      }

      vals.sort(function(a,b){return a-b;});

      var sum = 0;

      for (var i = 0; i < vals.length; i++) sum += vals[i];

      var avg = sum / vals.length;

      var mid = Math.floor(vals.length / 2);

      var mean = vals.length % 2 === 0 ? (vals[mid-1] + vals[mid]) / 2 : vals[mid];

      spokeStats.push({

        min: vals[0],

        max: vals[vals.length - 1],

        avg: avg,

        mean: mean

      });

    }



    // Compute global stats across all spokes

    var globalMin = Infinity, globalMax = -Infinity;

    var globalAvgSum = 0, globalAvgN = 0;

    for (var vi = 0; vi < nSpokes; vi++) {

      if (spokeStats[vi].min < globalMin) globalMin = spokeStats[vi].min;

      if (spokeStats[vi].max > globalMax) globalMax = spokeStats[vi].max;

      globalAvgSum += spokeStats[vi].avg;

      globalAvgN++;

    }

    var globalAvg = globalAvgSum / globalAvgN;



    // ── Card background ───────────────────────────────────────────────

    svgEl.appendChild(e('rect', {

      x: 0, y: 0, width: data.w || 1000, height: data.h || 750,

      fill: data.color

    }));



    // ── Header ────────────────────────────────────────────────────────

    var headerFont = (vis.fonts || {}).title || labelFont;

    var headerSize = data.titleSize || 14;

    var header = e('text', {

      x: data.titleX || 15, y: data.titleY || 15,

      fill: fg('frame', 1.9), 'font-size': fs(headerSize),

      'font-family': headerFont, 'text-rendering': 'optimizeLegibility',

    });

    header.textContent = (data.title || '') + '  ' + (data.label || '');

    header.style.opacity = '0';

    svgEl.appendChild(header);



    var subtitle = null;

    if (data.subtitle) {

      var subSize = data.subSize || 9;

      subtitle = e('text', {

        x: data.titleX || 15, y: (data.titleY || 15) + 16,

        fill: fg('frame', 0.85), 'font-size': fs(subSize),

        'font-family': labelFont, 'text-rendering': 'optimizeLegibility',

      });

      subtitle.textContent = data.subtitle;

      subtitle.style.opacity = '0';

      svgEl.appendChild(subtitle);

    }



    var footer = e('text', {

      x: 20, y: 735, fill: fg('frame', 0.85), 'font-size': fs(10),

      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',

    });

    footer.textContent = data.label || '';

    footer.style.opacity = '0';

    svgEl.appendChild(footer);



    // ── Polar→cartesian helper ────────────────────────────────────────

    function polar(r, angle) {

      return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };

    }



    // ── Rings ─────────────────────────────────────────────────────────

    var ringElements = [];

    var nRings = data.rings || 5;

    var scaleLabels = [];



    for (var ri = 0; ri <= nRings; ri++) {

      var ringR = minR + (ri / nRings) * radius;

      var pathD = '';

      for (var a = 0; a <= 360; a += 3) {

        var rad = a * Math.PI / 180;

        var p = polar(ringR, rad);

        pathD += (a === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);

      }

      var isOuter = ri === nRings;
      var ringColor = isOuter ? (data.outerRingColor || 'rgba(255,255,255,0.35)') : (data.ringColor || fg('frame', 0.08 + ri * 0.03));

      var ringWidth = ri === 0 ? (data.ringWidth0 || 0.3) : (data.ringWidth || 0.5);

      var ring = e('path', {

        d: pathD, fill: 'none', stroke: ringColor, 'stroke-width': ringWidth,

      });

      svgEl.appendChild(ring);

      ringElements.push(ring);



      if (ri > 0 && data.scaleLabels !== false) {

        var ringVal = valMin + (ri / nRings) * valRange;

        var lblP = polar(ringR, 0);

        var sl = e('text', {

          x: lblP.x + 4, y: lblP.y + 3,

          fill: fg('frame', 0.7), 'font-size': fs(data.scaleFontSize || 8),

          'font-family': labelFont,

        });

        sl.textContent = ringVal.toFixed(data.scalePrecision || 1);

        sl.style.opacity = '0';



        scaleLabels.push(sl);

      }

    }



    // ── Spokes ────────────────────────────────────────────────────────

    var spokeElements = [];
    var monthLabelElements = [];



    var prevLabelIdx = -1;
    for (var si = 0; si < nSpokes; si++) {

      var angle = si * angleStep;

      var p = polar(maxR, angle);

      var spoke = e('line', {

        x1: cx, y1: cy, x2: p.x, y2: p.y,

        stroke: data.spokeColor || fg('frame', 0.12),

        'stroke-width': data.spokeWidth || 0.3,

      });

      spoke.style.opacity = '0';

      svgEl.appendChild(spoke);

      spokeElements.push(spoke);



      var labelOffset = data.labelOffset || 22;

      var lp = polar(maxR + labelOffset, angle);

      var lblText = '';

      if (spokeLabels.length > 0 && spokeLabels.length !== nSpokes) {

        // Distribute proportionally: map each spoke to nearest label

        var labelIdx = Math.round(si * (spokeLabels.length - 1) / (nSpokes - 1));

        lblText = spokeLabels[labelIdx] || '';

      } else {

        lblText = spokeLabels[si] || '';

      }

      // Only draw label at the first spoke where this label appears

      if (lblText && labelIdx !== prevLabelIdx) {
        prevLabelIdx = labelIdx;

        var lbl = e('text', {

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

    // Batch-append scale labels and month labels in correct Z-order
    for (var si = 0; si < scaleLabels.length; si++) svgEl.appendChild(scaleLabels[si]);
    for (var mi = 0; mi < monthLabelElements.length; mi++) svgEl.appendChild(monthLabelElements[mi]);

    // ── Per-year color palette ────────────────────────────────────────

    var colors = data.colors;

    if (!colors || colors.length === 0) {

      var n = series.length;

      colors = [];

      var coolColor = data.coolColor || { r: 100, g: 180, b: 255 };

      var warmColor = data.warmColor || { r: 255, g: 180, b: 80 };

      for (var ci = 0; ci < n; ci++) {

        var t = n > 1 ? ci / (n - 1) : 0.5;

        var mid = 0.4;

        if (t <= mid) {

          var mix = t / mid;

          colors.push('rgb(' +

            Math.round(coolColor.r + (255 - coolColor.r) * mix) + ',' +

            Math.round(coolColor.g + (255 - coolColor.g) * mix) + ',' +

            Math.round(coolColor.b + (255 - coolColor.b) * mix) + ')');

        } else {

          var mix = (t - mid) / (1 - mid);

          colors.push('rgb(' +

            Math.round(255 + (warmColor.r - 255) * mix) + ',' +

            Math.round(255 + (warmColor.g - 255) * mix) + ',' +

            Math.round(255 + (warmColor.b - 255) * mix) + ')');

        }

      }

    }



    // ── Data polygons ─────────────────────────────────────────────────

    var polygonElements = [];

    var nSeries = series.length;



    for (var si = 0; si < nSeries; si++) {

      var sv = series[si].values || [];

      var pathD = '';

      var sColor = colors[si % colors.length];

      var baseAlpha = data.baseAlpha != null ? data.baseAlpha : 0.3;

      var alphaStep = nSeries > 1 ? ((data.alphaMax || 0.8) - baseAlpha) / (nSeries - 1) : 0;

      var sAlpha = baseAlpha + si * alphaStep;



      for (var vi = 0; vi < sv.length && vi < nSpokes; vi++) {

        if (sv[vi] == null) continue;

        var r = valToR(sv[vi]);

        var angle = vi * angleStep;

        var p = polar(r, angle);

        pathD += (pathD === '' ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);

      }

      if (pathD !== '') {

        // Partial year: do NOT close back to first point
        var partial = series[si]._partial || sv.length < nSpokes;
        if (!partial) {

          var firstR = valToR(sv[0]);

          var firstP = polar(firstR, 0);

          pathD += 'L' + firstP.x.toFixed(1) + ',' + firstP.y.toFixed(1) + 'Z';

        }

      }



      var lineW = data.lineWidth || 0.8;

      var lineA = data.lineAlpha != null ? data.lineAlpha : 1.0;



      var poly = e('path', {

        d: pathD, fill: 'none', stroke: sColor,

        'stroke-width': lineW,

        'stroke-opacity': (lineA * sAlpha).toFixed(2),

      });

      svgEl.appendChild(poly);

      polygonElements.push(poly);

    }

    // Set data polygons hidden initially -- revealed by animation
    for (var pdi = 0; pdi < polygonElements.length; pdi++) {
      polygonElements[pdi].style.opacity = '0';
    }

    // ── Arcs (min/avg/mean/max bands) ─────────────────────────────────

    // Each arc config defines which stat it represents and its visual.

    // The arc draws as a SEGMENT covering only the angular range of

    // spokes where that stat's cluster falls. Perpendicular ticks at

    // each contributing spoke. Connector lines from year paths.

    var arcElements = [];



    if (data.arcs) {

      // Per-cycle stat angle: for each year find WHERE (which angle) each

      // stat occurs. Cluster by widest-gap → one arc per stat.

      //   min:  angle of minimum temp per year

      //   max:  angle of maximum temp per year

      //   avg:  angle where value crosses yearly average (first crossing)

      //   mean: angle where value crosses yearly median (first crossing)

      function findCrossings(values, target) {

        var angles = [];

        for (var i = 1; i < values.length; i++) {

          var p0 = values[i-1], p1 = values[i];

          if (p0 != null && p1 != null &&

              ((p0 <= target && p1 >= target) || (p0 >= target && p1 <= target))) {

            var t = (target - p0) / (p1 - p0);

            angles.push((i - 1 + t) / values.length * 360);

          }

        }

        return angles;

      }


      // ── Arc stat computation helpers ────────────────────────────────
    
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



      var minAngles = [], maxAngles = [], avgAngles = [], meanAnglesAll = [];
      var minVals = [], maxVals = [], avgVals = [], meanVals = [];
      var rawData = data.yearlyTemps || {};
      var rawYears = Object.keys(rawData).sort();

      for (var si = 0; si < series.length; si++) {

        var sv = series[si].values || [];

        var valid = [];

        for (var vi = 0; vi < sv.length; vi++) {

          if (sv[vi] != null) valid.push({ idx: vi, v: sv[vi] });

        }

        if (valid.length === 0) continue;
        // Skip partial years — their stats don't represent a full cycle
        if (series[si]._partial) continue;

        // MIN angle — center of coldest 4-week window using interpolated series
        // This spreads adjacent years that share the same calendar minimum month
        var minV = Infinity, minA = 0;
        if (sv.length >= 52) {
          var ww = Math.min(4, Math.floor(sv.length / 12));
          var bestRoll = Infinity;
          for (var wi = 0; wi < sv.length; wi++) {
            var sum = 0, cnt = 0;
            for (var wj = 0; wj < ww; wj++) {
              var vi = (wi + wj) % sv.length;
              if (sv[vi] != null) { sum += sv[vi]; cnt++; }
            }
            if (cnt === ww) {
              var avg = sum / ww;
              if (avg < bestRoll) { bestRoll = avg; minV = sv[wi]; minA = (wi + ww/2) / sv.length * 360; }
            }
          }
        }
        if (minV === Infinity) {
          // Fallback: min point
          for (var ri = 0; ri < (rawVals || []).length; ri++) {
            if (rawVals[ri] < minV) { minV = rawVals[ri]; minA = ri / 12 * 360; }
          }
          if (minV === Infinity) {
            for (var i = 0; i < valid.length; i++) {
              if (valid[i].v < minV) { minV = valid[i].v; minA = valid[i].idx / sv.length * 360; }
            }
          }
        }
        minAngles.push(minA);
        minVals.push(minV);

        // MAX angle — center of warmest 4-week window using interpolated series
        var maxV = -Infinity, maxA = 0;
        if (sv.length >= 52) {
          var ww = Math.min(4, Math.floor(sv.length / 12));
          var bestRoll = -Infinity;
          for (var wi = 0; wi < sv.length; wi++) {
            var sum = 0, cnt = 0;
            for (var wj = 0; wj < ww; wj++) {
              var vi = (wi + wj) % sv.length;
              if (sv[vi] != null) { sum += sv[vi]; cnt++; }
            }
            if (cnt === ww) {
              var avg = sum / ww;
              if (avg > bestRoll) { bestRoll = avg; maxV = sv[wi]; maxA = (wi + ww/2) / sv.length * 360; }
            }
          }
        }
        if (maxV === -Infinity) {
          // Fallback: max point
          for (var ri = 0; ri < (rawVals || []).length; ri++) {
            if (rawVals[ri] > maxV) { maxV = rawVals[ri]; maxA = ri / 12 * 360; }
          }
          if (maxV === -Infinity) {
            for (var i = 0; i < valid.length; i++) {
              if (valid[i].v > maxV) { maxV = valid[i].v; maxA = valid[i].idx / sv.length * 360; }
            }
          }
        }
        maxAngles.push(maxA);
        maxVals.push(maxV);

        // AVG + MEAN crossings

        var sum = 0;

        for (var i = 0; i < valid.length; i++) sum += valid[i].v;

        var avg = sum / valid.length;

        // avg: first crossing of yearly average temp (spring rising edge)
        var crosses = findCrossings(sv, avg);

        if (crosses.length > 0) {

          crosses.sort(function(a,b){return a-b;});

          avgAngles.push(crosses[0]);
          avgVals.push(avg);

        }

        // mean: first crossing of yearly median temp (spring rising edge)
        var sorted = sv.filter(function(v){return v!=null;}).sort(function(a,b){return a-b;});
        var mid = Math.floor(sorted.length / 2);
        var median = sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
        var mCrosses = findCrossings(sv, median);
        if (mCrosses.length > 0) {
          mCrosses.sort(function(a,b){return a-b;});
          meanAnglesAll.push(mCrosses[0]);
          meanVals.push(median);
        }

      }

      // ── Min/Max markers on year traces ──
      for (var mi = 0; mi < series.length; mi++) {
        if (series[mi]._partial) continue;
        var sv = series[mi].values || [];
        if (sv.length < 2) continue;
        // Find actual min value position
        var minIdx = -1, minVal = Infinity;
        // Find actual max value position
        var maxIdx = -1, maxVal = -Infinity;
        for (var vi = 0; vi < sv.length; vi++) {
          if (sv[vi] == null) continue;
          if (sv[vi] < minVal) { minVal = sv[vi]; minIdx = vi; }
          if (sv[vi] > maxVal) { maxVal = sv[vi]; maxIdx = vi; }
        }
        if (minIdx >= 0) {
          var minAng = (minIdx / sv.length) * 360;
          var minAngRad = minAng * Math.PI / 180;
          var minP = polar(valToR(minVal), minAngRad);
          var dotM = e('circle', {
            cx: minP.x, cy: minP.y, r: 3,
            fill: '#ffffff', stroke: 'none',
          });
          dotM.style.opacity = '0';
          svgEl.appendChild(dotM);
          polygonElements.push(dotM);
        }
        if (maxIdx >= 0) {
          var maxAng = (maxIdx / sv.length) * 360;
          var maxAngRad = maxAng * Math.PI / 180;
          var maxP = polar(valToR(maxVal), maxAngRad);
          var dotX = e('circle', {
            cx: maxP.x, cy: maxP.y, r: 3,
            fill: '#ffffff', stroke: 'none',
          });
          dotX.style.opacity = '0';
          svgEl.appendChild(dotX);
          polygonElements.push(dotX);
        }
      }



      var clusters = {};

      clusters.min  = clusterAngles(minAngles);

      clusters.max  = clusterAngles(maxAngles);

      clusters.avg  = clusterAngles(avgAngles);

      clusters.mean = clusterAngles(meanAnglesAll);

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
        var startAngle = startAngleDeg * Math.PI / 180;
        var endAngle = endAngleDeg * Math.PI / 180;

        // Draw arc path — SVG A (elliptical arc) for exact start/end
        function arcPt(a) { return polar(arcR, a); }
        function arcPath(s, e) {
          var p = arcPt(s);
          var q = arcPt(e);
          var span = e - s;
          // Normalize span to 0-2PI for large-arc flag
          var large = (span % (Math.PI * 2)) > Math.PI ? 1 : 0;
          return 'M' + p.x.toFixed(1) + ',' + p.y.toFixed(1) +
            ' A' + arcR.toFixed(1) + ',' + arcR.toFixed(1) + ' 0 ' +
            large + ',1 ' + q.x.toFixed(1) + ',' + q.y.toFixed(1);
        }
        if (startAngleDeg > endAngleDeg) {
          // Wrap across 0: two arcs
          var d1 = arcPath(startAngle, Math.PI * 2);
          var d2 = arcPath(0, endAngle);
          var arc = e('path', {
            d: d1, fill: 'none', stroke: arcColor,
            'stroke-width': arcW,
            'stroke-opacity': ac.alpha != null ? ac.alpha : 0.6,
          });
          arc.style.opacity = '0';
          svgEl.appendChild(arc);
          arcElements.push(arc);

          var arc2 = e('path', {
            d: d2, fill: 'none', stroke: arcColor,
            'stroke-width': arcW,
            'stroke-opacity': ac.alpha != null ? ac.alpha : 0.6,
          });
          arc2.style.opacity = '0';
          svgEl.appendChild(arc2);
          arcElements.push(arc2);
        } else {
          var d = arcPath(startAngle, endAngle);
          var arc = e('path', {
            d: d, fill: 'none', stroke: arcColor,
            'stroke-width': arcW,
            'stroke-opacity': ac.alpha != null ? ac.alpha : 0.6,
          });
          arc.style.opacity = '0';
          svgEl.appendChild(arc);
          arcElements.push(arc);
        }

        // ── Ticks: one perpendicular line per year at its stat angle ──
        if (ac.ticks !== false) {
          var tickLen = ac.tickLen || 5;
          var tickW = ac.tickWidth || 1.0;
          var tickColor = ac.tickColor || arcColor;
          var tickAlpha = ac.tickAlpha != null ? ac.tickAlpha : (ac.alpha != null ? ac.alpha : 0.6);

          var yearAngles = [];
          if (statKey === 'min') yearAngles = minAngles;
          else if (statKey === 'max') yearAngles = maxAngles;
          else if (statKey === 'avg') yearAngles = avgAngles;
          else if (statKey === 'mean') yearAngles = meanAnglesAll;

          for (var yi = 0; yi < yearAngles.length; yi++) {
            var angDeg = yearAngles[yi];
            var angRad = angDeg * Math.PI / 180;
            var inner = polar(arcR - tickLen, angRad);
            var outer = polar(arcR + tickLen, angRad);
            var tick = e('line', {
              x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y,
              stroke: tickColor,
              'stroke-width': tickW,
              'stroke-opacity': tickAlpha,
            });
            tick.style.opacity = '0';
            svgEl.appendChild(tick);
            arcElements.push(tick);
          }
        }

        // ── Connector lines: from each year's data point at stat angle to arc ──
        if (ac.connectors !== false && ac.lineColor) {
          var lineA = ac.lineAlpha != null ? ac.lineAlpha : 0.15;
          var yearAngles = [];
          if (statKey === 'min') yearAngles = minAngles;
          else if (statKey === 'max') yearAngles = maxAngles;
          else if (statKey === 'avg') yearAngles = avgAngles;
          else if (statKey === 'mean') yearAngles = meanAnglesAll;

          for (var yi = 0; yi < yearAngles.length && yi < series.length; yi++) {
            var angDeg = yearAngles[yi];
            var sv = series[yi].values || [];
            // Interpolate value at stat angle from the 52-point series
            // This ensures connector starts ON the year trace
            var v;
            var pos = (angDeg / 360) * sv.length;
            var idx = Math.floor(pos);
            var frac = pos - idx;
            var nextIdx = (idx + 1) % sv.length;
            if (sv[idx] == null || sv[nextIdx] == null) continue;
            v = sv[idx] + (sv[nextIdx] - sv[idx]) * frac;
            var r = valToR(v);
            var angRad = angDeg * Math.PI / 180;
            var innerP = polar(r, angRad);
            var outerP = polar(arcR, angRad);
            var cl = e('line', {
              x1: innerP.x, y1: innerP.y, x2: outerP.x, y2: outerP.y,
              stroke: ac.lineColor, 'stroke-width': 0.75,
              'stroke-opacity': 0.4,
            });
            cl.style.opacity = '0';
            svgEl.appendChild(cl);
            arcElements.push(cl);
          }
        }
      }

    }


    // ── Legend ────────────────────────────────────────────────────────

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

          x: lx + 10, y: ly + 3,

          fill: fg('frame', 0.35 + si * 0.06), 'font-size': fs(legendFontSize),

          'font-family': labelFont,

        });

        lt.textContent = series[si].label || '';

        svgEl.appendChild(lt);

        legendElements.push(lt);

      }

    }



    // Move legend before arcs for correct Z-order
    if (legendElements.length && arcElements.length) {
      for (var li = 0; li < legendElements.length; li++) {
        svgEl.insertBefore(legendElements[li], arcElements[0]);
      }
    }

    // ── Group map ─────────────────────────────────────────────────────

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



    // ── Animation ─────────────────────────────────────────────────────

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