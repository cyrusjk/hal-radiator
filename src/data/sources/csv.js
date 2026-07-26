// ═══════════════════════════════════════════════════════════════════════
//  CSV Data Source Plugin
//  — Loads polar chart daily temperature data from a static CSV file
//  — Format: year, then 365 (or 366) comma-separated daily temperature values
//  — Each row = one year of daily temperatures
//  — Comment lines (#) and blank lines are ignored
//
//  Returns: { groups: [{ name, series: [{ label, values }] }], angles, unit }
//  where each series has 365 daily values matching the ERA5 source
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

        // First column is the year label, rest are daily values
        var label = parts[0];
        var values = [];
        for (var j = 1; j < parts.length; j++) {
          var v = parseFloat(parts[j]);
          if (!isNaN(v)) values.push(v);
        }
        if (values.length < 10) continue;

        series.push({
          label: label,
          values: values,
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
