// ═══════════════════════════════════════════════════════════════════════
//  Inline Data Source Plugin
//  — Returns data embedded directly in radiator.yaml
//  — Only returns what the user explicitly wrote. No random/demo values.
// ═══════════════════════════════════════════════════════════════════════
//
//  Usage:
//    dataSource:
//      type: inline
//      groups:
//        - name: API-GATEWAY
//          series:
//            - label: p99
//              values: [60, 70, 85, 110]
//
//  Returns:
//    { groups: [...] } or null (triggering empty-groups no-data state)

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

window.HAL.data.sources.inline = {
  name: 'inline',

  fetch: function(dataSource) {
    // Primary: canonical groups + series shape
    if (dataSource && dataSource.groups) {
      return { groups: dataSource.groups };
    }
    // Legacy shapes — kept for backward compat with existing cards
    if (dataSource && dataSource.columns) {
      return { columns: dataSource.columns, rows: dataSource.rows || [] };
    }
    if (dataSource && dataSource.objects) {
      return { objects: dataSource.objects, connections: dataSource.connections || [] };
    }
    if (dataSource && dataSource.series) {
      return { series: dataSource.series };
    }
    if (dataSource && dataSource.hierarchy) {
      return { hierarchy: dataSource.hierarchy };
    }
    if (dataSource && dataSource.tree) {
      return { tree: dataSource.tree, connections: dataSource.connections || [] };
    }
    if (dataSource && dataSource.rows) {
      return { rows: dataSource.rows };
    }
    // No data configured — returns empty groups
    return { groups: [] };
  },
};
