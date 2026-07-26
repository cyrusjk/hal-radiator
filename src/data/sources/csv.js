// ═══════════════════════════════════════════════════════════════════════
//  CSV Data Source Plugin
//  — Loads polar chart data from a static CSV file at runtime
//  — Expects columns: angles, values, label (in any order)
//  — Comment lines (#) and blank lines are ignored
//  — A row with only a 'unit' key sets the unit for the series
// ═══════════════════════════════════════════════════════════════════════
//
//  CSV format:
//    angles,values,label
//    0,10.2,JAN
//    30,14.3,FEB
//    ...
//    unit,°C
//
//  Returns: { series: [{ label, values }], angles, unit }

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

window.HAL.data.sources.csv = {
  name: 'csv',

  fetch: function(dataSource) {
    var url = dataSource.url || 'data/polar-temperature.csv';
    var label = dataSource.label || 'value';

    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('CSV fetch failed: ' + r.status);
      return r.text();
    }).then(function(text) {
      var lines = text.split('\n');
      var headers = [];
      var angles = [];
      var values = [];
      var unit = '';
      var seriesLabel = label;
      var headerRow = true;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        // Skip blank lines and comments
        if (!line || line.charAt(0) === '#') continue;

        var parts = line.split(',');
        for (var j = 0; j < parts.length; j++) {
          parts[j] = parts[j].trim();
        }

        if (headerRow) {
          headers = parts;
          headerRow = false;
          continue;
        }

        // Build a map of column name -> value for this row
        var row = {};
        for (var j = 0; j < headers.length && j < parts.length; j++) {
          row[headers[j]] = parts[j];
        }

        // Special row: unit only
        if (row.angles === 'unit' || row.angles === undefined) {
          if (row.values || row.label) {
            unit = row.values || row.label || '';
          }
          continue;
        }

        var angle = parseFloat(row.angles);
        var value = parseFloat(row.values);
        if (isNaN(angle)) continue;
        if (isNaN(value)) continue;

        angles.push(angle);
        values.push(value);

        // Use the first row's label if none was configured
        if (row.label && seriesLabel === label) {
          seriesLabel = row.label;
        }
      }

      var result = {
        series: [{
          label: seriesLabel,
          values: values,
        }],
        angles: angles,
      };
      if (unit) result.unit = unit;
      return result;
    });
  },
};
