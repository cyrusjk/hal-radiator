// ═══════════════════════════════════════════════════════════════════════
//  VictoriaMetrics Data Source Plugin
//  — Fetches time-series data from VictoriaMetrics PromQL API
//  — Transforms Prometheus response into { groups, series, values }
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

window.HAL.data.sources.victoria = {

  name: 'victoria',

  // Expected dataSource config:
  //
  //   {
  //     type: 'victoria',
  //     url:   'http://192.168.50.9:8428',
  //     promql: 'rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100',
  //     map: {
  //       group:  'name',          // Prometheus label → group name (band)
  //       series: null,            // Prometheus label → series label, or null if single-series
  //     }
  //   }
  //
  // If map.series is null, each group gets one series labelled 'value'.
  // If map.series is set, series with the same group label are merged into
  // one band, differentiated by the series label (e.g. 'le' for percentiles).

  fetch: function(dataSource) {
    if (!dataSource || !dataSource.url || !dataSource.promql) return null;

    var url = dataSource.url.replace(/\/+$/, '') + '/api/v1/query_range';
    var query = dataSource.promql;
    var map = dataSource.map || {};
    var groupLabel = map.group || 'group';
    var seriesLabel = map.series || null;

    // Default time range: last 5 minutes, 9 data points (matching DATA_PTS)
    var now = Date.now() / 1000;
    var step = 300 / 8; // ~37.5s steps over 5 minutes for 9 points
    var start = now - 300;
    var params = 'query=' + encodeURIComponent(query) +
                 '&start=' + start + '&end=' + now + '&step=' + step;

    return fetch(url + '?' + params)
      .then(function(r) { if (!r.ok) throw new Error('VM fetch failed: ' + r.status); return r.json(); })
      .then(function(json) { return window.HAL.data.sources.victoria.transform(json, groupLabel, seriesLabel); });
  },

  // Transform Prometheus query_range response → { groups: [ { name, series: [...] } ] }
  transform: function(json, groupLabel, seriesLabel) {
    if (!json || !json.data || !json.data.result) return null;

    var results = json.data.result;
    var groupMap = {};

    for (var i = 0; i < results.length; i++) {
      var metric = results[i].metric;
      var values = results[i].values;

      var grpName = metric[groupLabel] || 'unknown';
      var serName = seriesLabel ? (metric[seriesLabel] || 'value') : 'value';

      var vals = [];
      for (var vi = 0; vi < values.length; vi++) {
        vals.push(parseFloat(values[vi][1]));
      }
      if (vals.length === 0) continue;

      if (!groupMap[grpName]) groupMap[grpName] = {};
      groupMap[grpName][serName] = vals;
    }

    // Build the canonical { groups: [...] } structure
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
