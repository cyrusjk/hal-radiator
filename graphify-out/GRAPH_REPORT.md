# Graph Report - .  (2026-07-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 208 nodes · 241 edges · 36 communities (31 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e19f1349`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- parse_jpl_response
- flatten_config
- animation-engine.js
- Handler
- generate_card
- package.json
- resolve_prototype
- TestLoadConfig
- orbital.js
- ephemeris-init.js
- refresh.py
- orbital.test.js
- sunburst.js
- deploy.sh
- title.js

## God Nodes (most connected - your core abstractions)
1. `flatten_config()` - 18 edges
2. `parse_jpl_response()` - 16 edges
3. `TestJplCsvParser` - 16 edges
4. `resolve_prototype()` - 12 edges
5. `TestFlattenConfig` - 12 edges
6. `Handler` - 11 edges
7. `TestResolvePrototype` - 10 edges
8. `generate_card()` - 6 edges
9. `scripts` - 5 edges
10. `render_kerned_text()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `flatten_config()` --calls--> `resolve_prototype()`  [EXTRACTED]
  serve.py → serve.py  _Bridges community 6 → community 1_

## Import Cycles
- None detected.

## Communities (36 total, 5 thin omitted)

### Community 0 - "parse_jpl_response"
Cohesion: 0.10
Nodes (15): parse_jpl_response(), Lines with no data markers are skipped., Small values with E- notation., Dates without a leading space., If multiple data lines, only the first should be used., Real Venus data from 2026-07-08., Parse JPL Horizons batch CGI output, return {x, y, z} or None., If fewer than 5 columns, cannot parse. (+7 more)

### Community 1 - "flatten_config"
Cohesion: 0.16
Nodes (8): HTTPServer, flatten_config(), Convert the YAML groups structure into a flat card array,     resolving card pr, resolve_color(), ThreadedHTTPServer, Tests for flatten_config()., TestFlattenConfig, ThreadingMixIn

### Community 2 - "animation-engine.js"
Cohesion: 0.14
Nodes (7): applyOrder(), drawOne(), drawSimultaneous(), executePhases(), fadeOne(), fadeSimultaneous(), resolveGroup()

### Community 3 - "Handler"
Cohesion: 0.21
Nodes (6): BaseHTTPRequestHandler, Handler, load_config(), Parse JPL Horizons batch output, return {x, y, z} or None., Load radiator.yaml and merge prototypes.yaml into it., Replace <!-- CARDS --> placeholder with card script tags

### Community 4 - "generate_card"
Cohesion: 0.19
Nodes (11): FreeTypeFont, Image, ImageDraw, Path, demo(), generate_card(), load_font(), Draw text with per-character kerning.     This gives us the wide-spaced look of (+3 more)

### Community 5 - "package.json"
Cohesion: 0.17
Nodes (11): devDependencies, vitest, name, private, scripts, test, test:js, test:py (+3 more)

### Community 6 - "resolve_prototype"
Cohesion: 0.27
Nodes (4): Resolve a chart entry against card prototypes.      If chart has 'prototype' k, resolve_prototype(), Tests for resolve_prototype()., TestResolvePrototype

### Community 8 - "TestLoadConfig"
Cohesion: 0.25
Nodes (5): Tests for load_config() — dual-file prototype merging., load_config() merges cardPrototypes from prototypes.yaml., Missing prototypes.yaml returns config with no cardPrototypes., flatten_config with in-memory dict still works (tests use this)., TestLoadConfig

### Community 10 - "ephemeris-init.js"
Cohesion: 0.52
Nodes (6): fetchBody(), loadCards(), matchBody(), resolveCenter(), settlePromises(), vectorToAngle()

### Community 11 - "refresh.py"
Cohesion: 0.60
Nodes (4): main(), VM range response → list of { name, series: [ { label, values } ] }, transform(), vm_query()

## Knowledge Gaps
- **9 isolated node(s):** `deploy.sh script`, `name`, `type`, `private`, `test` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `flatten_config()` connect `flatten_config` to `TestLoadConfig`, `Handler`, `resolve_prototype`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `resolve_prototype()` connect `resolve_prototype` to `flatten_config`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Handler` connect `Handler` to `flatten_config`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `deploy.sh script`, `name`, `type` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `parse_jpl_response` be split into smaller, more focused modules?**
  _Cohesion score 0.09885057471264368 - nodes in this community are weakly interconnected._
- **Should `animation-engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._