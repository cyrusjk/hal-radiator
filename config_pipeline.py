# ═══════════════════════════════════════════════════════════════════════
#  Config pipeline — shared YAML → flat card array logic.
#  Used by BOTH serve.py (runtime /api/config) and build.py (dist/),
#  so the deployed site and the dev server can never drift apart.
#
#  Original implementation was duplicated in serve.py and build.py and
#  had already diverged (build.py omitted layout.zones composites and
#  dataFault). Single source of truth here.
# ═══════════════════════════════════════════════════════════════════════

import yaml


def load_config_from_paths(yaml_path, prototypes_path):
    """Load radiator.yaml and merge prototypes.yaml into it."""
    with open(yaml_path, 'r') as f:
        cfg = yaml.safe_load(f) or {}
    try:
        with open(prototypes_path, 'r') as f:
            protos = yaml.safe_load(f) or {}
    except FileNotFoundError:
        protos = {}
    if 'cardPrototypes' not in cfg and 'cardPrototypes' in protos:
        cfg['cardPrototypes'] = protos['cardPrototypes']
    return cfg


def resolve_prototype(chart, prototypes):
    """Resolve a chart entry against card prototypes.

    If chart has 'prototype' key, merge prototype fields first,
    then overlay the chart's specific fields (title, label, color,
    dataSource). If no 'prototype' key, return chart unchanged
    for backward compatibility.
    """
    proto_name = chart.get('prototype')
    if not proto_name:
        return chart

    base = prototypes.get(proto_name)
    if base is None:
        raise ValueError(f"Unknown card prototype: {proto_name}")

    resolved = dict(base)            # start with prototype fields
    for k, v in chart.items():
        if k == 'prototype':
            continue
        if k == 'animation' and isinstance(v, dict):
            # Deep merge animation.phases
            resolved['animation'] = dict(resolved.get('animation', {}))
            resolved['animation']['phases'] = v.get('phases', resolved['animation'].get('phases', []))
        elif k == 'dataSource' and isinstance(v, dict):
            merged = dict(resolved.get('dataSource', {}))
            merged.update(v)
            resolved['dataSource'] = merged
        else:
            resolved[k] = v
    return resolved


def resolve_color(name, colors):
    return colors.get(name, name) if isinstance(name, str) else name


def flatten_config(cfg):
    """Convert the YAML groups structure into a flat card array,
    resolving card prototypes along the way."""
    colors = cfg.get("colors", {})
    timing = cfg.get("timing", {})
    visual = cfg.get("visual", {})
    groups = cfg.get("groups", [])
    prototypes = cfg.get("cardPrototypes", {})

    cards = []
    for group in groups:
        # Check if this is a layout/composite card (has layout.zones)
        layout = group.get("layout")
        if layout and layout.get("zones"):
            # Emit as a composite card
            zones = []
            for zone in layout.get("zones", []):
                z = dict(zone)
                zt = zone.get("type", "")
                if zt == "chart":
                    # Resolve prototype for chart zones
                    chart = resolve_prototype(zone, prototypes)
                    z["chartType"] = chart.get("chartType", "curve-family")
                    z["dataSource"] = chart.get("dataSource", zone.get("dataSource", {}))
                    z.pop("prototype", None)
                # Resolve named color references in zone
                if "color" in z:
                    z["color"] = resolve_color(z["color"], colors)
                if "bg" in z:
                    z["bg"] = resolve_color(z["bg"], colors)
                zones.append(z)
            cards.append({
                "type": "composite",
                "title": group.get("title", ""),
                "label": group.get("subheading", ""),
                "color": resolve_color(group.get("color", "rgb(0,0,0)"), colors),
                "zones": zones,
            })
            continue

        # Title card
        cards.append({
            "type": "title",
            "title": group["title"],
            "label": group.get("subheading", ""),
            "color": resolve_color(group.get("color", "rgb(0,0,0)"), colors),
        })
        # Chart cards
        for chart in group.get("charts", []):
            chart = resolve_prototype(chart, prototypes)
            c = dict(chart)
            c["type"] = chart.get("chartType", "curve-family")
            c["label"] = chart.get("label", "")
            c["color"] = resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)")), colors)
            c.pop("chartType", None)
            cards.append(c)

    return {
        "timing": timing,
        "visual": visual,
        "dataFault": cfg.get("dataFault", {"mode": "skip"}),
        "cards": cards,
    }
