// ═══════════════════════════════════════════════════════════════════════
//  Data Fetcher — Source dispatch + error handling
//  - Routes fetch to the appropriate source plugin
//  - Returns { groups, error, stale, faultCard }
//  - Fault behaviour is configurable per-card + global default
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};

var DF = window.HAL.data;

/**
 * Fetch data for a card.
 *
 * @param {Object} card — Card config from the flattened radiator.yaml
 * @returns {Promise<{
 *   groups: Array<{name: string, series: Array<{label: string, values: number[]}>}>,
 *   error: ?{message: string, source: string},
 *   stale: boolean,
 *   faultCard: ?string   // 'non-function' | null
 * }>}
 */
DF.fetchCardData = function(card) {
  var df = card.dataFault || DF.defaultDataFault || { mode: 'skip' };
  var ds = card.dataSource || { type: 'inline' };
  var plugin = DF.sources[ds.type];

  if (!plugin) {
    return buildFaultResult(df, 'Unknown data source type: "' + ds.type + '"', ds.type);
  }

  try {
    var result = plugin.fetch(ds, card);

    // Handle synchronous result
    if (result && typeof result.then !== 'function') {
      return Promise.resolve(normalize(result, df));
    }

    // Handle async result
    return result.then(function(data) {
      return normalize(data, df);
    }).catch(function(err) {
      return buildFaultResult(df, err.message || String(err), ds.type);
    });
  } catch (err) {
    return buildFaultResult(df, err.message || String(err), ds.type);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Normalize a successful data packet.
 * Ensures it has the canonical shape even if the source returns a bare object.
 */
function normalize(data, df) {
  if (!data || typeof data !== 'object') {
    return buildFaultResult(df, 'Source returned invalid data', '?');
  }
  // Start from source data, then overlay canonical fields
  var out = {};
  for (var k in data) if (data[k] != null) out[k] = data[k];
  out.error = null;
  out.stale = data.stale || false;
  out.faultCard = null;
  if (!out.groups) out.groups = [];
  return out;
}

/**
 * Build a fault result based on the fault config.
 *   df = { mode: 'skip' | 'hide' | 'non-function', defaultDuration, card }
 */
function buildFaultResult(df, message, sourceType) {
  var mode = (df && df.mode) || 'skip';
  var out = {
    groups: [],
    error: { message: message, source: sourceType },
    stale: false,
    faultCard: null,
    _faultConfig: df || {},
  };

  if (mode === 'non-function') {
    out.faultCard = 'non-function';
    // Pass fault details through _faultConfig so the non-function card can
    // render the message + tooltip. The original card's config is preserved.
  }

  return out;
}

// Default global fault config — overridden by radiator.yaml dataFault at boot
DF.defaultDataFault = { mode: 'skip' };
