// ═══════════════════════════════════════════════════
//  Auto-generated from radiator.yaml
//  Do not edit directly — edit radiator.yaml and
//  run 'python build.py' to regenerate.
// ═══════════════════════════════════════════════════

window.HAL_CONFIG = window.HAL_CONFIG || {
  timing: {
  "titleCardDisplay": 8,
  "initialPause": 5000,
  "groupGap": 500,
  "valueHold": 5000,
  "flickerDuration": 1000
},
  visual: {
  "fonts": {
    "title": "EurostileLocal, sans-serif",
    "label": "RajdhaniLightLocal, Rajdhani, monospace"
  },
  "chart": {
    "x0": 80,
    "y0": 70,
    "w": 700,
    "h": 650,
    "dataPts": 20,
    "strokes": [
      1.5,
      1.0,
      0.7
    ],
    "dashes": [
      null,
      "4,3",
      "1,3"
    ]
  },
  "frameBrightness": 0.4,
  "dataBrightness": 0.8,
  "fontScale": 1.5
},
  cards: [
  {
    "type": "title",
    "title": "VEH",
    "label": "LIN: 86-QW",
    "color": "rgb(54,85,165)"
  },
  {
    "type": "curve-family",
    "title": "LAT",
    "label": "PROD-01",
    "color": "rgb(28,52,100)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "range": 3600,
      "points": 20,
      "promql": "avg by (mode, job) (rate(node_cpu_seconds_total{mode=~\"user|system|iowait\"}[2m]))",
      "map": {
        "group": "job",
        "series": "mode"
      }
    }
  },
  {
    "type": "curve-family",
    "title": "THR",
    "label": "NODE-02",
    "color": "rgb(39,72,100)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "range": 3600,
      "points": 20,
      "promql": "label_replace(rate(node_network_receive_bytes_total{device=\"eth0\"}[2m]), \"direction\", \"RX\", \"__name__\", \".*\") or label_replace(rate(node_network_transmit_bytes_total{device=\"eth0\"}[2m]), \"direction\", \"TX\", \"__name__\", \".*\")",
      "map": {
        "group": "device",
        "series": "direction"
      }
    }
  },
  {
    "type": "title",
    "title": "SYS",
    "label": "PAPPY: 192.168.50.9",
    "color": "rgb(16,45,70)"
  },
  {
    "type": "curve-family",
    "title": "CPU",
    "label": "LOAD AVG",
    "color": "rgb(16,45,70)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "range": 3600,
      "points": 20,
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "map": {
        "group": "job",
        "series": "__name__"
      }
    }
  },
  {
    "type": "curve-family-stacked",
    "title": "CPU",
    "label": "LOAD 1/5/15",
    "color": "rgb(16,45,70)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "range": 3600,
      "points": 20,
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "map": {
        "group": "job",
        "series": "__name__"
      }
    }
  },
  {
    "type": "curve-family-3d",
    "title": "CPU",
    "label": "3D LOAD",
    "color": "rgb(16,45,70)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "range": 3600,
      "points": 20,
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "map": {
        "group": "job",
        "series": "__name__"
      }
    }
  },
  {
    "type": "title",
    "title": "HAL",
    "label": "9000 COMPUTER",
    "color": "rgb(228,153,38)"
  },
  {
    "type": "title",
    "title": "COM",
    "label": "PMT: 26-07",
    "color": "rgb(130,73,107)"
  },
  {
    "type": "title",
    "title": "GDE",
    "label": "NAV: 94-KL",
    "color": "rgb(54,85,165)"
  },
  {
    "type": "title",
    "title": "VEC",
    "label": "COORDINATES",
    "color": "rgb(16,24,57)"
  },
  {
    "type": "tabular",
    "title": "VEC",
    "label": "COORDINATES",
    "color": "rgb(16,24,57)",
    "dataSource": {
      "type": "inline",
      "rows": [
        {
          "label": "X-AXIS",
          "value": "047.23"
        },
        {
          "label": "Y-AXIS",
          "value": "182.76"
        },
        {
          "label": "Z-AXIS",
          "value": "093.41"
        }
      ]
    }
  },
  {
    "type": "title",
    "title": "TLM",
    "label": "SENSOR GRID",
    "color": "rgb(23,31,57)"
  },
  {
    "type": "telemetry-grid",
    "title": "TLM",
    "label": "SENSOR GRID",
    "color": "rgb(23,31,57)",
    "dataSource": {
      "type": "inline",
      "columns": [
        {
          "label": "TEMP"
        },
        {
          "label": "PRES"
        },
        {
          "label": "HUM"
        },
        {
          "label": "VOLT"
        }
      ],
      "rows": [
        {
          "label": "REACTOR-1",
          "values": [
            "87.2",
            "101.3",
            "44",
            "5.01"
          ]
        },
        {
          "label": "REACTOR-2",
          "values": [
            "91.5",
            "98.7",
            "51",
            "4.97"
          ]
        },
        {
          "label": "COOLANT-A",
          "values": [
            "72.8",
            "105.2",
            "62",
            "5.03"
          ]
        },
        {
          "label": "COOLANT-B",
          "values": [
            "68.4",
            "102.8",
            "58",
            "4.99"
          ]
        }
      ]
    }
  },
  {
    "type": "title",
    "title": "NAV",
    "label": "SPATIAL MAP",
    "color": "rgb(16,24,57)"
  },
  {
    "type": "wireframe",
    "title": "NAV",
    "label": "SPATIAL MAP",
    "color": "rgb(16,24,57)",
    "dataSource": {
      "type": "inline",
      "objects": [
        {
          "x": -2,
          "y": 1.5,
          "z": 1,
          "label": "SAT-A"
        },
        {
          "x": 3,
          "y": -1,
          "z": 2,
          "label": "SAT-B"
        },
        {
          "x": -1,
          "y": -2.5,
          "z": -0.5,
          "label": "PROBE-1"
        },
        {
          "x": 2.5,
          "y": 2,
          "z": -1.5,
          "label": "PROBE-2"
        },
        {
          "x": 0,
          "y": 0,
          "z": 0,
          "label": "ORIGIN"
        }
      ],
      "connections": [
        {
          "from": 0,
          "to": 4
        },
        {
          "from": 1,
          "to": 4
        },
        {
          "from": 2,
          "to": 4
        },
        {
          "from": 3,
          "to": 4
        },
        {
          "from": 0,
          "to": 1
        },
        {
          "from": 2,
          "to": 3
        }
      ]
    }
  },
  {
    "type": "title",
    "title": "RAD",
    "label": "RADAR SWEEP",
    "color": "rgb(23,31,57)"
  },
  {
    "type": "polar",
    "title": "RAD",
    "label": "RADAR SWEEP",
    "color": "rgb(23,31,57)",
    "dataSource": {
      "type": "inline",
      "series": [
        {
          "label": "SECTOR-A",
          "values": [
            60,
            45,
            80,
            70,
            55,
            90,
            75,
            50
          ]
        }
      ]
    }
  }
],
};
