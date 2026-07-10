// ═══════════════════════════════════════════════════════════════════════
//  VictoriaMetrics Data Source Plugin
//  — Fetches time-series data from VictoriaMetrics PromQL API
//  — Works from any HTTP server (VM has open CORS,
//    Access-Control-Allow-Origin: *)
//
//  Usage in config.js:
//    { type: 'chart', ...
//      dataSource: {
//        type: 'victoria',
//        url: 'http://192.168.50.9:8428',
//        range: 300,            // time window in seconds (default 300)
//        step: 30,              // [optional] seconds between points.
//                               // If set, ALL points from VM are accepted
//                               // and the renderer adapts its grid spacing
//                               // to match the actual number of points.
//                               // If omitted, falls back to 'points' (default 60)
//                               // which computes step = range / (points - 1)
//        points: 60,            // [optional, used only when step is not set]
//                               // Target number of points (VM downsamples).
//                               // Sets step = range / (points - 1)
//        promql: '...',
//        map: {
//          group:  'name',        // Prometheus label → group name (band)
//          series: 'le',          // Prometheus label → series label, or null
//        },
//        alias: {                 // [optional] rename series labels
//          node_load1: "1 MIN",   //   exact match
//          node_load5: "5 MIN",
//          strip: "node_load"     //   or strip prefix from all series
//        }
//      }
//    }
//
//  If map.series is null, each group gets a single curve labelled 'value'.
//  If map.series is set (e.g. 'le' for percentiles), series with the same
//  group label are merged into one band, differentiated by the series label.
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

(function() {

  var plugin = {

    // ── Fetch ─────────────────────────────────────────────────────────
    // Returns a Promise that resolves to { groups: [ { name, series } ] }
    // or null if the config is invalid.
    fetch: function(dataSource) {
      if (!dataSource || !dataSource.url || !dataSource.promql) return null;

      var url = dataSource.url.replace(/\/+$/, '') + '/api/v1/query_range';
      var query = dataSource.promql;
      var map = dataSource.map || {};
      var groupLabel = map.group || 'group';
      var seriesLabel = map.series || null;

      // Configurable time window: range in seconds (default 300 = 5 min)
      var windowSec = dataSource.range || 300;
      var step;
      if (dataSource.step) {
        // User specified exact step — use it. ALL points are returned.
        step = dataSource.step;
      } else {
        // Fall back to points-based step for backward compatibility.
        var nPoints = dataSource.points || 60;
        step = Math.max(Math.floor(windowSec / (nPoints - 1)), 1);
      }

      var now = Date.now() / 1000;
      var start = now - windowSec;

      return fetch(url + '?' + [
        'query=' + encodeURIComponent(query),
        'start=' + start,
        'end=' + now,
        'step=' + step
      ].join('&'), { signal: AbortSignal.timeout(10000) })
        .then(function(r) { if (!r.ok) throw new Error('VM fetch failed: ' + r.status); return r.json(); })
        .then(function(json) { return plugin.transform(json, groupLabel, seriesLabel, dataSource); });
    },

    // ── Transform ─────────────────────────────────────────────────────
    // Parses a Prometheus query_range JSON response into the canonical
    // { groups: [ { name, series: [ { label, values } ] } ] } structure.
    transform: function(json, groupLabel, seriesLabel, dataSource) {
      if (!json || !json.data || !json.data.result) return null;

      var results = json.data.result;
      var groupMap = {};  // { groupName: { seriesName: [values] } }

      // Prepare alias map: exact matches take priority over strip
      var alias = (dataSource && dataSource.alias) || {};
      var strip = (typeof alias.strip === 'string') ? alias.strip : null;

      for (var i = 0; i < results.length; i++) {
        var metric = results[i].metric;
        var values = results[i].values;

        var grpName = metric[groupLabel] || 'unknown';
        var serName = seriesLabel ? (metric[seriesLabel] || 'value') : 'value';

        // Apply alias: exact match first, then strip prefix
        serName = alias[serName] || serName;
        if (strip && serName.indexOf(strip) === 0) {
          serName = serName.slice(strip.length);
        }

        var vals = [];
        for (var vi = 0; vi < values.length; vi++) {
          vals.push(parseFloat(values[vi][1]));
        }
        if (vals.length === 0) continue;

        if (!groupMap[grpName]) groupMap[grpName] = {};
        groupMap[grpName][serName] = vals;
      }

      // Flatten groupMap into the canonical array structure
      var groups = [];
      var grpNames = Object.keys(groupMap);
      for (var gi = 0; gi < grpNames.length; gi++) {
        var gn = grpNames[gi];
        var series = [];
        var serNames = Object.keys(groupMap[gn]);
        for (var si = 0; si < serNames.length; si++) {
          series.push({ label: serNames[si], values: groupMap[gn][serNames[si]] });
        }
        groups.push({ name: gn, series: series });
      }

      return { groups: groups };
    },

  };

  window.HAL.data.sources.victoria = plugin;
})();
