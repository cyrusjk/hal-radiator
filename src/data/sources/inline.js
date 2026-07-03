// ═══════════════════════════════════════════════════════════════════════
//  Inline Data Source Plugin
//  — Returns hardcoded demo data (default/fallback)
//  — Used when a card's dataSource.type is 'inline'
// ═══════════════════════════════════════════════════════════════════════

const HAL = window.HAL || {};
HAL.data = HAL.data || {};
HAL.data.sources = HAL.data.sources || {};

HAL.data.sources.inline = {

  name: 'inline',

  // Returns the groups+series payload for the given card config.
  // The card's dataSource field can embed group data directly:
  //
  //   { type: 'inline', groups: [ ... ] }
  //
  // If dataSource.groups doesn't exist, returns the demo defaults keyed
  // by the card's title.
  fetch: function(dataSource) {
    if (dataSource && dataSource.groups) {
      return { groups: dataSource.groups };
    }
    return null;
  },

  // Demo data sets keyed by card title (shown when no groups are configured)
  demo: {
    'LAT: PROD-01': {
      groups: [
        { name: 'API-GATEWAY', series: [
          { label: 'p99', values: [60,70,85,110,130,125,100,80,65,55] },
          { label: 'p95', values: [30,35,42,55,60,58,50,40,32,28] },
          { label: 'p50', values: [10,12,14,18,20,18,15,12,10, 8] },
        ]},
        { name: 'AUTH-SVC', series: [
          { label: 'p99', values: [35,42,58,78,90,85,70,50,38,32] },
          { label: 'p95', values: [15,18,25,35,40,38,30,22,16,14] },
          { label: 'p50', values: [ 5, 6, 8,10,12,11, 9, 7, 5, 4] },
        ]},
        { name: 'WORKER', series: [
          { label: 'p99', values: [80,95,120,160,190,180,150,110,90,75] },
          { label: 'p95', values: [50,60,75,95,110,105,85,65,55,48] },
          { label: 'p50', values: [20,25,30,40,45,42,35,28,22,18] },
        ]},
      ],
    },
    'THR: NODE-02': {
      groups: [
        { name: 'API-GATEWAY', series: [
          { label: 'max', values: [1200,1150,1050,950,880,900,1000,1100,1180,1220] },
          { label: 'avg', values: [950,900,820,750,700,720,780,860,920,980] },
          { label: 'min', values: [600,550,480,420,380,400,450,520,580,620] },
        ]},
        { name: 'AUTH-SVC', series: [
          { label: 'max', values: [1050,980,880,800,750,780,860,950,1020,1080] },
          { label: 'avg', values: [800,750,680,620,580,600,650,720,780,820] },
          { label: 'min', values: [450,400,350,300,280,300,340,400,440,470] },
        ]},
      ],
    },
  },

};
