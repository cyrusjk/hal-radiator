// ═══════════════════════════════════════════════════════════════════════
//  Data Fetcher — Common API
//  — Routes fetch requests to the appropriate source plugin
//  — Fallback: returns inline demo data if no source resolves
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};

// Fetch data for a card. Returns a Promise resolving to:
//   { groups: [ { name, series: [ { label, values } ] } ] }
window.HAL.data.fetchCardData = function(card) {
  var ds = card.dataSource || { type: 'inline' };
  var plugin = window.HAL.data.sources[ds.type];

  if (!plugin) {
    console.warn('Unknown data source type:', ds.type, '— falling back to inline');
    plugin = window.HAL.data.sources.inline;
  }

  var result = plugin.fetch(ds);

  if (result === null) {
    // No groups returned; try demo data
    var inline = window.HAL.data.sources.inline;
    var demo = inline.demo[card.title];
    if (demo) return Promise.resolve(demo);

    return Promise.resolve({ groups: [] });
  }

  // If the plugin returned a Promise (async fetch), wait for it
  if (result && typeof result.then === 'function') {
    return result;
  }

  // Synchronous result (inline static data)
  return Promise.resolve(result);
};
