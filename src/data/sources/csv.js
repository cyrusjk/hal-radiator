// ═══════════════════════════════════════════════════════════════════════
//  CSV Data Source Plugin
//  — Loads polar chart data from a static CSV file at runtime
//  — Supports multi-year format: each row is one year with monthly values
//  — Column format: year, jan, feb, mar, ... (12 monthly values per row)
//  — Comment lines (#) and blank lines are ignored
// ═══════════════════════════════════════════════════════════════════════
//
//  CSV format:
//    year,values
//    2015,7.2,8.5,11.8,15.3,19.1,23.5,26.2,25.8,21.4,16.1,10.3,7.8
//    2016,6.8,8.2,12.1,15.8,19.5,23.8,26.5,26.1,21.7,16.3,10.5,7.5
//
//  Returns: { groups: [{ name: 'TEMPERATURE', series: [{ label, values }] }] }
//  where each series has 365 daily values interpolated from the 12 monthly means

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

window.HAL.data.sources.csv = {
  name: 'csv',

  fetch: function(dataSource) {
    var url = dataSource.url || 'data/polar-temperature.csv';

    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('CSV fetch failed: ' + r.status);
      return r.text();
    }).then(function(text) {
      var lines = text.split('\n');
      var series = [];
      var headerRow = true;
      var angles_12 = [0,30,60,90,120,150,180,210,240,270,300,330];
      // Daily angles: 0 to 359 degrees, 365 steps
      var dailyAngles = [];
      for (var d = 0; d < 365; d++) {
        dailyAngles.push(Math.round(d * 360 / 365));
      }

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.charAt(0) === '#') continue;

        var parts = line.split(',');
        for (var j = 0; j < parts.length; j++) {
          parts[j] = parts[j].trim();
        }

        if (headerRow) {
          headerRow = false;
          continue;
        }

        // First column is the year label, rest are 12 monthly values
        var label = parts[0];
        var monthlyValues = [];
        for (var j = 1; j < parts.length && j <= 12; j++) {
          var v = parseFloat(parts[j]);
          if (!isNaN(v)) monthlyValues.push(v);
        }
        if (monthlyValues.length < 3) continue;

        // Interpolate 12 monthly values → 365 daily values
        // Place each month's value at day ~15 of that month, then
        // linear interpolate between them, wrapping last→first.
        var monthDays = [0,31,59,90,120,151,181,212,243,273,304,334,365];
        var dailyValues = [];
        for (var d = 0; d < 365; d++) {
          // Find which month segment this day falls in
          var mi = 0;
          while (mi < 11 && monthDays[mi+1] <= d) mi++;
          var t = (d - monthDays[mi]) / (monthDays[mi+1] - monthDays[mi]);
          var v0 = monthlyValues[mi];
          var v1 = monthlyValues[(mi + 1) % 12];
          dailyValues.push(Math.round((v0 + (v1 - v0) * t) * 10) / 10);
        }

        series.push({
          label: label,
          values: dailyValues,
        });
      }

      return {
        groups: [{
          name: 'TEMPERATURE',
          series: series,
        }],
        angles: dailyAngles,
        unit: '°C',
      };
    });
  },
};
