# Data Contract

Canonical reference for the data shape returned by `fetchCardData()` and how source plugins work.

## DataPacket

Every source plugin returns a `DataPacket` (or a Promise of one):

```ts
interface DataPacket {
  groups: Group[];         // at least 1 group, or empty array for no-data state
  error?: ErrorInfo;       // null/absent on success
  stale?: boolean;         // true if showing cached data (prev failed fetch)
  faultCard?: 'non-function';  // non-null when fault routing is active
}

interface Group {
  name: string;            // group label (e.g. "pappy", "API-GATEWAY")
  series: Series[];        // 1+ series within this group
}

interface Series {
  label: string;           // series label (e.g. "user", "system", "p99")
  values: number[];        // time-ordered data points
}

interface ErrorInfo {
  message: string;
  source: string;          // source plugin type that produced the error
}
```

## Source Plugin Interface

Every source registers on `window.HAL.data.sources[name]` with a single `fetch` method:

```ts
window.HAL.data.sources[name] = {
  fetch: function(dsConfig: object, cardConfig: object): DataPacket | Promise<DataPacket>
}
```

| Parameter | Source |
|-----------|--------|
| `dsConfig` | The `dataSource` block from radiator.yaml (contains `type`, `url`, `query`, etc.) |
| `cardConfig` | The full card config object from the flattened cards array |

**Return** a `DataPacket` or a Promise that resolves to one. Throw or return a rejected promise to trigger fault handling. Return `{ groups: [] }` for a clean no-data state.

## Source Types

| type | Category | Behaviour |
|------|----------|-----------|
| `inline` | Canned | Returns data embedded directly in radiator.yaml. Only returns what the user wrote. Empty `{ groups: [] }` when nothing is configured. |
| `victoria` | Live | Queries VictoriaMetrics PromQL API. Errors propagate to the card. |
| `prometheus` | Live | (Not yet implemented — stubs available) Queries Prometheus-compatible API. |

Any `.js` file dropped into `src/data/sources/` is auto-injected into the page. No registration beyond setting `window.HAL.data.sources[name]` is needed.

## Fault Handling

Configured via the `dataFault` key — globally in radiator.yaml root, or per card.

```yaml
# Global default
dataFault:
  mode: skip              # skip | hide | non-function

# Per-card override
cards:
  - type: curve-family
    dataSource:
      type: prometheus
      url: http://pappy:9090
    dataFault:
      mode: non-function   # shows flickering "NON FUNCTION" card on error
```

### Modes

| mode | Behaviour |
|------|-----------|
| `skip` | Advance to next card immediately on data fetch error |
| `hide` | Show empty card (background only) for `defaultDuration` ms, then advance |
| `non-function` | Render the `non-function` card type — flickering yellow text + red error detail with a tooltip showing the source and message |

When `mode` is `non-function`, the card config is preserved and the `non-function` card renders over it, adding:
- The original card's color as background
- "NON FUNCTION" text (flickering via CSS keyframe animation)
- Error message in smaller red text below
- Tooltip on hover showing source + error message

## Card Contract

Cards receive data via their `render(data, onDone)` signature:

```ts
render(data: CardData, onDone: Function): void
```

`CardData` contains every field from the YAML config plus any fields merged from the `DataPacket`. Cards read `data.groups` for chart data and `data.error` / `data.stale` for display-state awareness.

Cards never call source plugins directly. The app.js orchestrator handles dispatch via `fetchCardData()` and routes faults to the appropriate card type.
