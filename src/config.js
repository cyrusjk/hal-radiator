// ═══════════════════════════════════════════════════════════════════════
//  HAL Metrics Radiator — Configuration
//  ═══════════════════════════════════════════════════════════════════════
//  Edit this file to customize the radiator: timing, colours, card order,
//  font paths, and data source connections.
// ═══════════════════════════════════════════════════════════════════════

const HAL_CONFIG = {

  // ── Timing ──────────────────────────────────────────────────────────
  timing: {
    titleCardDisplay: 5000,   // ms — how long a title card stays visible
    initialPause: 5000,       // ms — delay before first group flickers in
    flickerDuration: 1000,    // ms — duration of one blink-in/out animation
    groupGap: 500,            // ms — gap between groups flickering in/out
    valueHold: 5000,          // ms — how long min+max values stay visible
  },

  // ── Visual ──────────────────────────────────────────────────────────
  visual: {
    fonts: {
      title: 'EurostileLocal, sans-serif',
      label: 'RajdhaniLightLocal, Rajdhani, monospace',
    },
    chart: {
      x0: 80, y0: 70, w: 700, h: 520,    // chart area within 1000×750 SVG
      dataPts: 9,                          // values per series
      strokes: [1.5, 1.0, 0.7],           // line widths (highest→lowest series)
      dashes: [null, '4,3', '1,3'],       // dash patterns
    },
  },

  // ── Cards (the radiator cycle) ──────────────────────────────────────
  // Each entry is a card shown in sequence. `type` is 'title' or 'chart'.
  // Chart cards need a `dataSource` object; see data/sources/ for plugins.
  cards: [
    { type: 'title', title: 'VEH', label: 'LIN: 86-QW',   color: 'rgb(45,78,161)' },
    { type: 'title', title: 'COM', label: 'PMT: 26-07',   color: 'rgb(168,95,155)' },
    { type: 'title', title: 'HAL', label: '9000 COMPUTER', color: 'rgb(200,120,50)' },
    {
      type: 'chart', title: 'LAT: PROD-01', label: 'LATENCY PERCENTILES',
      color: 'rgb(28,52,100)',
      dataSource: { type: 'inline' }
    },
    {
      type: 'chart', title: 'THR: NODE-02', label: 'THROUGHPUT',
      color: 'rgb(22,58,85)',
      dataSource: { type: 'inline' }
    },
  ],

};
