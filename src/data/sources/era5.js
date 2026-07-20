// ═══════════════════════════════════════════════════════════════════════
//  ERA5 Data Source Plugin
//  — Fetches monthly ERA5-Land surface temperature means via Open-Meteo
//  — Proxied through serve.py /api/era5 (bypasses CORS)
//  — Averages across configured geographic locations
//  — Returns yearly-cyclic temperature data for any polar chart
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

(function() {

  window.HAL.data.sources.era5 = {
    name: 'era5',

    fetch: function(dataSource) {
      var params = [];
      var locations = (dataSource && dataSource.locations);
      if (locations) {
        params.push('locations=' + encodeURIComponent(JSON.stringify(locations)));
      }
      var now = new Date();
      var startYear = (dataSource && dataSource.startYear) || 2015;
      var endYear = (dataSource && dataSource.endYear) || now.getFullYear();
      params.push('startYear=' + startYear);
      params.push('endYear=' + endYear);

      var url = '/api/era5?' + params.join('&');

      return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || data.error) {
            return {
              error: data ? data.error : 'No response from ERA5 API',
              groups: []
            };
          }
          var years = Object.keys(data.yearlyTemps || {}).sort();
          // Interpolate monthly data (12 values) to N=52 weekly points, matching prototype
          function interpolate(monthly, N) {
            var out = [];
            var nMonths = monthly.length;
            for (var i = 0; i < N; i++) {
              var pos = (i / N) * nMonths;
              var m0 = Math.floor(pos);
              var m1 = Math.min(m0 + 1, nMonths - 1);
              var t = pos - m0;
              var a = monthly[m0], b = monthly[m1];
              if (a == null || b == null) { out.push(null); continue; }
              out.push(a + (b - a) * t);
            }
            return out;
          }
          var series = years.map(function(y) {
            return { label: y, values: interpolate(data.yearlyTemps[y], 52) };
          });

          return {
            yearlyTemps: data.yearlyTemps,
            groups: [{
              name: 'TEMPERATURE',
              series: series
            }]
          };
        })
        .catch(function(err) {
          return {
            error: 'ERA5 fetch failed: ' + (err.message || String(err)),
            groups: []
          };
        });
    }
  };

})();
