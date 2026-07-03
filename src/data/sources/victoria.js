// ═══════════════════════════════════════════════════════════════════════
//  VictoriaMetrics Data Source Plugin
//  — Fetches time-series data from VictoriaMetrics PromQL API via JSONP
//  — JSONP works from any page context, including file:// (no CORS, no
//    server needed). VictoriaMetrics wraps the response in a callback.
//
//  Usage in config.js:
//    { type: 'chart', ...
//      dataSource: {
//        type: 'victoria',
//        url: 'http://192.168.50.9:8428',
//        promql: 'rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100',
//        map: {
//          group:  'name',        // Prometheus label → group name (band)
//          series: 'le',          // Prometheus label → series label, or null
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
  var reqId = 0;  // unique counter for callback names

  var plugin = {

    // ── Fetch via JSONP ───────────────────────────────────────────────
    // Injects a <script> tag that loads data from VictoriaMetrics.
    // Returns a Promise that resolves to { groups: [ { name, series } ] }.
    fetch: function(dataSource) {
      if (!dataSource || !dataSource.url || !dataSource.promql) return null;

      var url = dataSource.url.replace(/\/+$/, '') + '/api/v1/query_range';
      var query = dataSource.promql;
      var map = dataSource.map || {};
      var groupLabel = map.group || 'group';
      var seriesLabel = map.series || null;

      // Time window: last 5 minutes, 9 data points
      var now = Date.now() / 1000;
      var start = now - 300;
      var step = 300 / 8;

      // Unique callback name for this request
      var cbName = '_vm_cb_' + (reqId++);

      return new Promise(function(resolve, reject) {
        // The callback that VictoriaMetrics will call
        window[cbName] = function(json) {
          cleanup();
          var result = plugin.transform(json, groupLabel, seriesLabel);
          resolve(result);
        };

        // Timeout: reject if no response within 10 seconds
        var timer = setTimeout(function() {
          cleanup();
          reject(new Error('VM JSONP timeout'));
        }, 10000);

        function cleanup() {
          clearTimeout(timer);
          delete window[cbName];
          if (script.parentNode) script.parentNode.removeChild(script);
        }

        // Build the JSONP URL
        var params = [
          'query=' + encodeURIComponent(query),
          'start=' + start,
          'end=' + now,
          'step=' + step,
          'callback=' + cbName
        ];
        var scriptUrl = url + '?' + params.join('&');

        // Inject the script tag — this triggers the request
        var script = document.createElement('script');
        script.src = scriptUrl;
        script.onerror = function() {
          cleanup();
          reject(new Error('VM JSONP load failed'));
        };
        document.body.appendChild(script);
      });
    },

    // ── Transform ─────────────────────────────────────────────────────
    // Parses a Prometheus query_range JSON response into the canonical
    // { groups: [ { name, series: [ { label, values } ] } ] } structure.
    transform: function(json, groupLabel, seriesLabel) {
      if (!json || !json.data || !json.data.result) return null;

      var results = json.data.result;
      var groupMap = {};  // { groupName: { seriesName: [values] } }

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
