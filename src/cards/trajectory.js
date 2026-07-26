// ═══════════════════════════════════════════════════════════════════════
//  Trajectory Overlay Map
//  — Solar system orbits + a single trajectory path
//  — sqrt(r) scale for main view, linear zoom panel for inner planets
//  — Static waypoints from dataSource
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['trajectory'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    // ── Layout ────────────────────────────────────────────────────────
    var cx = 500, cy = 400;
    var maxR = 400;
    var maxAU = 65;

    // sqrt scale: inner planets spread out, outer planets still fit
    var sqrtFactor = maxR / Math.sqrt(maxAU);

    // Linear scale for zoom panel — shows inner solar system zoomed in
    var zoomCX = 830, zoomCY = 640;
    var zoomR = 110;
    var zoomAU = 1.8;  // show 0-1.8 AU (Mercury through Mars, zoomed in)
    var zoomScale = zoomR / zoomAU;

    // ── Solar system data ─────────────────────────────────────────────
    var planets = [
      { name: 'MERCURY', a: 0.387 },
      { name: 'VENUS',   a: 0.723 },
      { name: 'EARTH',   a: 1.000 },
      { name: 'MARS',    a: 1.524 },
      { name: 'JUPITER', a: 5.203 },
      { name: 'SATURN',  a: 9.537 },
      { name: 'URANUS',  a: 19.191 },
      { name: 'NEPTUNE', a: 30.069 },
      { name: 'PLUTO',   a: 39.482 },
    ];

    // Planet positions at V1 encounter dates (card coords: 0=top, CW)
    var epochPos = {
      mercury: 156.3, venus: 87.7,  earth: 106.4, mars: 86.3,
      jupiter: 346.4, saturn: 308.6, uranus: 306.0, neptune: 337.9, pluto: 256.4,
    };

    // ── Helpers ───────────────────────────────────────────────────────
    function polar(rAU, angle, cxp, cyp, sc) {
      var rad = (angle - 90) * Math.PI / 180;
      return {
        x: (cxp || cx) + rAU * (sc || sqrtFactor) * Math.cos(rad),
        y: (cyp || cy) + rAU * (sc || sqrtFactor) * Math.sin(rad),
      };
    }

    function grp(name) {
      var g = e('g');
      g.setAttributeNS(null, 'data-anim-group', name);
      return g;
    }

    // ── Background ────────────────────────────────────────────────────
    svgEl.appendChild(e('rect', {
      x: 0, y: 0, width: data.w || 1000, height: data.h || 750,
      fill: data.color || '#0f1923',
    }));

    // ── Glow filter defs ──────────────────────────────────────────────
    if (!svgEl.querySelector('#gfxGlow')) {
      var defs = e('defs');
      defs.innerHTML =
        '<filter id="txtGlow" x="-20%" y="-20%" width="140%" height="140%">'
        + '<feGaussianBlur stdDeviation="1.5" result="blur"/>'
        + '<feComposite in="SourceGraphic" in2="blur" operator="over"/>'
        + '</filter>'
        + '<filter id="gfxGlow" x="-20%" y="-20%" width="140%" height="140%">'
        + '<feGaussianBlur stdDeviation="2" result="blur"/>'
        + '<feComposite in="SourceGraphic" in2="blur" operator="over"/>'
        + '</filter>';
      svgEl.appendChild(defs);
    }

    // ── Zoom panel clip path ──────────────────────────────────────────
    var clipId = 'zoomClip_' + (Date.now());
    var clipPath = e('clipPath', { id: clipId });
    clipPath.appendChild(e('circle', { cx: zoomCX, cy: zoomCY, r: zoomR }));
    svgEl.appendChild(clipPath);

    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: 20, y: 25, fill: '#ffffff', 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    header.textContent = data.title || '';
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: 20, y: 735, fill: '#ffffff', 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Trajectories from dataSource ──────────────────────────────────
    var trajectories = (data.dataSource && data.dataSource.trajectories) || [];

    // ── Group tracking ────────────────────────────────────────────────
    var groups = {};
    var planetGroupNames = [];
    var trajGroups = [];

    // ── Planet groups ─────────────────────────────────────────────────
    var planetGroups = [];
    for (var pi = 0; pi < planets.length; pi++) {
      var pName = planets[pi].name.toLowerCase();
      var pData = planets[pi];
      var angle = epochPos[pName];
      if (angle === undefined) continue;

      var gP = grp('planet_' + pi);
      var aAU = pData.a;
      var pChildren = [];

      // Orbit ring (solid circle, sqrt scale)
      var orbitR = Math.sqrt(aAU) * sqrtFactor;
      var orbit = e('circle', {
        cx: cx, cy: cy, r: orbitR.toFixed(1),
        fill: 'none', stroke: fg('frame', 0.3), 'stroke-width': 0.5,
      });
      orbit.style.opacity = '0';
      gP.appendChild(orbit);
      pChildren.push(orbit);

      // Zoom panel orbit (linear scale, only inner planets)
      if (aAU <= zoomAU) {
        var zR = aAU * zoomScale;
        var zOrbit = e('circle', {
          cx: zoomCX, cy: zoomCY, r: zR.toFixed(1),
          fill: 'none', stroke: fg('frame', 0.35), 'stroke-width': 0.4,
        });
        zOrbit.style.opacity = '0';
        zOrbit.setAttribute('clip-path', 'url(#' + clipId + ')');
        gP.appendChild(zOrbit);
        pChildren.push(zOrbit);
      }

      // Planet dot at V1 position (main view, sqrt scale)
      var dotP = polar(Math.sqrt(aAU), angle);
      var dot = e('circle', {
        cx: dotP.x, cy: dotP.y, r: 2.5, fill: '#ffffff',
        filter: 'url(#gfxGlow)',
      });
      dot.style.opacity = '0';
      gP.appendChild(dot);
      pChildren.push(dot);

      // Zoom panel dot (linear scale)
      if (aAU <= zoomAU) {
        var zDotP = polar(aAU, angle, zoomCX, zoomCY, zoomScale);
        var zDot = e('circle', {
          cx: zDotP.x, cy: zDotP.y, r: 2, fill: '#ffffff',
          filter: 'url(#gfxGlow)',
        });
        zDot.style.opacity = '0';
        zDot.setAttribute('clip-path', 'url(#' + clipId + ')');
        gP.appendChild(zDot);
        pChildren.push(zDot);
      }

      // Planet label — radially offset from dot (main view only)
      var labelP = polar(Math.sqrt(aAU) + (12 / sqrtFactor), angle);
      var hAnchor = (angle > 90 && angle < 270) ? 'end' : 'start';
      var label = e('text', {
        x: labelP.x, y: labelP.y, fill: '#ffffff', 'font-size': fs(6),
        'font-family': labelFont,
        'text-anchor': hAnchor, 'dominant-baseline': 'central',
        'text-rendering': 'optimizeLegibility',
        filter: 'url(#txtGlow)',
      });
      label.textContent = planets[pi].name;
      label.style.opacity = '0';
      gP.appendChild(label);
      pChildren.push(label);

      svgEl.appendChild(gP);
      planetGroups.push(gP);
      groups['planet_' + pi] = pChildren;
      planetGroupNames.push('planet_' + pi);
    }

    // ── Trajectory groups ─────────────────────────────────────────────
    for (var ti = 0; ti < trajectories.length; ti++) {
      var traj = trajectories[ti];
      var wps = traj.waypoints || [];
      if (wps.length < 2) continue;

      var gT = grp('traj_' + ti);
      var tChildren = [];

      // Main trajectory path (sqrt scale) — render all waypoints
      var d = '';
      var lastWp = null;
      for (var wi = 0; wi < wps.length; wi++) {
        lastWp = wps[wi];
        var pt = polar(Math.sqrt(wps[wi].r), wps[wi].angle);
        d += (wi === 0 || d === '' ? 'M' : 'L') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1);
      }

      var path = e('path', {
        d: d, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.5,
        filter: 'url(#gfxGlow)',
      });
      path.style.opacity = '0';
      gT.appendChild(path);
      tChildren.push(path);

      // Zoom panel trajectory (linear scale, only points within zoomAU)
      var zD = '';
      for (var wi = 0; wi < wps.length; wi++) {
        if (wps[wi].r > zoomAU) continue;
        var zPt = polar(wps[wi].r, wps[wi].angle, zoomCX, zoomCY, zoomScale);
        zD += (zD === '' ? 'M' : 'L') + zPt.x.toFixed(1) + ',' + zPt.y.toFixed(1);
      }
      if (zD) {
        var zPath = e('path', {
          d: zD, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.2,
          filter: 'url(#gfxGlow)',
        });
        zPath.style.opacity = '0';
        zPath.setAttribute('clip-path', 'url(#' + clipId + ')');
        gT.appendChild(zPath);
        tChildren.push(zPath);
      }

      // Endpoint label
      if (traj.label && lastWp) {
        var lp = polar(Math.sqrt(lastWp.r), lastWp.angle);
        var lAnchor = (lastWp.angle > 90 && lastWp.angle < 270) ? 'end' : 'start';
        var lOffset = lAnchor === 'end' ? -8 : 8;
        var lLabel = e('text', {
          x: lp.x + lOffset, y: lp.y - 8, fill: '#ffffff', 'font-size': fs(7),
          'font-family': labelFont,
          'text-anchor': lAnchor, 'dominant-baseline': 'central',
          'text-rendering': 'optimizeLegibility',
          filter: 'url(#txtGlow)',
        });
        lLabel.textContent = traj.label;
        lLabel.style.opacity = '0';
        gT.appendChild(lLabel);
        tChildren.push(lLabel);
      }

      svgEl.appendChild(gT);
      trajGroups.push(gT);
      groups['traj_' + ti] = tChildren;
    }

    // ── Zoom panel border ─────────────────────────────────────────────
    var zoomBorder = e('circle', {
      cx: zoomCX, cy: zoomCY, r: zoomR,
      fill: 'none', stroke: fg('frame', 0.3), 'stroke-width': 1,
    });
    zoomBorder.style.opacity = '0';
    svgEl.appendChild(zoomBorder);
    groups['zoomPanel'] = [zoomBorder];

    // ── SOL in main view ──────────────────────────────────────────────
    var solG = grp('sol');
    var sChildren = [];
    var solDot = e('circle', {
      cx: cx, cy: cy, r: 4, fill: '#ffffff', filter: 'url(#gfxGlow)',
    });
    solDot.style.opacity = '0';
    solG.appendChild(solDot);
    sChildren.push(solDot);
    var solLabel = e('text', {
      x: cx + 8, y: cy + 2, fill: '#ffffff', 'font-size': fs(7),
      'font-family': labelFont,
      'dominant-baseline': 'central',
      'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    solLabel.textContent = 'SOL';
    solLabel.style.opacity = '0';
    solG.appendChild(solLabel);
    sChildren.push(solLabel);
    svgEl.appendChild(solG);
    groups['sol'] = sChildren;

    // ── Animation ─────────────────────────────────────────────────────
    var defaults = [
      { action: 'flickerIn', groups: ['header', 'footer'], order: 'simultaneous' },
      { action: 'flickerIn', groups: ['sol'], order: 'simultaneous' },
      { action: 'flickerIn', groups: ['zoomPanel'], order: 'simultaneous' },
      { action: 'flickerIn', groups: planetGroupNames, order: 'simultaneous' },
    ];
    for (var ti = 0; ti < trajGroups.length; ti++) {
      defaults.push({ action: 'draw', groups: ['traj_' + ti], order: 'sequential', gap: 100, duration: 2000 });
    }
    defaults.push({ action: 'wait', duration: 5000 });
    defaults.push({ action: 'done' });

    window.HAL.anim.run(data, groups, onDone, defaults);
  },
};
