// ═══════════════════════════════════════════════════
//  Auto-generated from radiator.yaml
//  Do not edit directly — edit radiator.yaml and
//  run 'python build.py' to regenerate.
// ═══════════════════════════════════════════════════

window.HAL_CONFIG = window.HAL_CONFIG || {
  timing: {
  "flickerDuration": 200,
  "groupGap": 167,
  "initialPause": 10000,
  "titleCardDisplay": 8,
  "valueHold": 5000
},
  visual: {
  "chart": {
    "dashes": [
      null,
      "4,3",
      "1,3"
    ],
    "dataPts": 20,
    "h": 650,
    "strokes": [
      1.5,
      1.0,
      0.7
    ],
    "w": 700,
    "x0": 80,
    "y0": 70
  },
  "dataBrightness": 0.8,
  "fontScale": 1.5,
  "fonts": {
    "data": "ManifoldLocal, monospace",
    "label": "RajdhaniLightLocal, Rajdhani, monospace",
    "title": "EurostileLocal, sans-serif"
  },
  "frameBrightness": 0.6
},
  cards: [
  {
    "type": "title",
    "title": "VEH",
    "label": "LIN: 86-QW",
    "color": "rgb(51,82,164)"
  },
  {
    "type": "curve-family",
    "title": "AVG",
    "label": "CPU",
    "color": "rgb(43,69,141)",
    "animation": {
      "phases": [
        {
          "action": "blank"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "draw",
          "duration": 2,
          "gap": 5,
          "groups": [
            "verticalLines"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels",
            "verticalLines"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerIn",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "appear",
          "groups": [
            "minValues"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "maxValues"
          ]
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "minValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 500
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "maxValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerOut",
          "groups": [
            "maxValues"
          ]
        },
        {
          "action": "flickerOut",
          "groups": [
            "minValues"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerOut",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels",
            "verticalLines"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "map": {
        "group": "job",
        "series": "mode"
      },
      "promql": "avg by (mode, job) (rate(node_cpu_seconds_total{mode=~\"user|system|iowait\"}[2m]))",
      "range": 3600,
      "step": 60,
      "type": "victoria",
      "url": "http://192.168.50.9:8428"
    }
  },
  {
    "type": "curve-family",
    "title": "THR",
    "label": "ETH",
    "color": "rgb(45,75,99)",
    "animation": {
      "phases": [
        {
          "action": "blank"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "draw",
          "duration": 5,
          "gap": 20,
          "groups": [
            "verticalLines"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerIn",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "appear",
          "groups": [
            "minValues"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "maxValues"
          ]
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "minValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "maxValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerOut",
          "gap": 167,
          "groups": [
            "minValues",
            "maxValues",
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels",
            "verticalLines"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "map": {
        "group": "device",
        "series": "direction"
      },
      "promql": "label_replace(rate(node_network_receive_bytes_total{device=\"eth0\"}[2m]), \"direction\", \"RX\", \"__name__\", \".*\") or label_replace(rate(node_network_transmit_bytes_total{device=\"eth0\"}[2m]), \"direction\", \"TX\", \"__name__\", \".*\")",
      "range": 3600,
      "step": 180,
      "type": "victoria",
      "url": "http://192.168.50.9:8428"
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
    "animation": {
      "phases": [
        {
          "action": "blank"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "draw",
          "duration": 5,
          "gap": 20,
          "groups": [
            "verticalLines"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerIn",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "appear",
          "groups": [
            "minValues"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "maxValues"
          ]
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "minValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "throb",
          "count": 3,
          "duration": 330,
          "groups": [
            "maxValues"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "flickerOut",
          "gap": 167,
          "groups": [
            "minValues",
            "maxValues",
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "grid",
            "groupLabels",
            "verticalLines"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "map": {
        "group": "job",
        "series": "__name__"
      },
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "range": 3600,
      "step": 180,
      "type": "victoria",
      "url": "http://192.168.50.9:8428"
    }
  },
  {
    "type": "curve-family-stacked",
    "title": "CPU",
    "label": "LOAD 1/5/15",
    "color": "rgb(16,45,70)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "map": {
        "group": "job",
        "series": "__name__"
      },
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "range": 43200,
      "step": 180,
      "type": "victoria",
      "url": "http://192.168.50.9:8428"
    }
  },
  {
    "type": "curve-family-3d",
    "title": "1 / 5 / 15",
    "label": "LOAD",
    "color": "rgb(16,45,70)",
    "animation": {
      "phases": [
        {
          "action": "blank"
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "draw",
          "duration": 500,
          "groups": [
            "radialLines"
          ]
        },
        {
          "action": "draw",
          "duration": 10,
          "gap": 20,
          "groups": [
            "gridLines"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 167,
          "groups": [
            "bands"
          ],
          "order": "sequential"
        },
        {
          "action": "disappear",
          "groups": [
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "radialLines",
            "gridLines",
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "alias": {
        "strip": "node_load"
      },
      "map": {
        "group": "job",
        "series": "__name__"
      },
      "promql": "{__name__=~\"node_load[0-9]+\", job=\"node\"}",
      "range": 43200,
      "step": 720,
      "type": "victoria",
      "url": "http://192.168.50.9:8428"
    }
  },
  {
    "type": "title",
    "title": "HAL",
    "label": "9000 COMPUTER",
    "color": "rgb(73,42,63)"
  },
  {
    "type": "sunburst",
    "title": "HAL",
    "label": "SUNBURST",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 500
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "rings"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "rings"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "hierarchy": [
        {
          "children": [
            {
              "name": "USER",
              "value": 45
            },
            {
              "name": "SYSTEM",
              "value": 30
            },
            {
              "name": "IOWAIT",
              "value": 15
            },
            {
              "name": "IDLE",
              "value": 10
            }
          ],
          "name": "CPU"
        },
        {
          "children": [
            {
              "name": "USED",
              "value": 60
            },
            {
              "name": "CACHE",
              "value": 25
            },
            {
              "name": "FREE",
              "value": 15
            }
          ],
          "name": "MEM"
        },
        {
          "children": [
            {
              "name": "TXRX",
              "value": 70
            },
            {
              "name": "DROPS",
              "value": 5
            },
            {
              "name": "ERRORS",
              "value": 3
            },
            {
              "name": "IDLE",
              "value": 22
            }
          ],
          "name": "NET"
        }
      ],
      "type": "inline"
    }
  },
  {
    "type": "streamgraph",
    "title": "HAL",
    "label": "STREAM",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 800
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "ribbons"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "ribbons"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "series": [
        {
          "label": "USER",
          "values": [
            12,
            18,
            15,
            22,
            20,
            28,
            25,
            30,
            27,
            35,
            32,
            38,
            33,
            40,
            36,
            42,
            38,
            45,
            40,
            48
          ]
        },
        {
          "label": "SYS",
          "values": [
            5,
            7,
            6,
            8,
            10,
            9,
            12,
            11,
            14,
            13,
            16,
            15,
            18,
            17,
            20,
            18,
            22,
            20,
            24,
            22
          ]
        },
        {
          "label": "IOW",
          "values": [
            2,
            3,
            1,
            4,
            2,
            5,
            3,
            6,
            4,
            7,
            5,
            8,
            6,
            9,
            7,
            10,
            8,
            11,
            9,
            12
          ]
        }
      ],
      "type": "inline"
    }
  },
  {
    "type": "edge-bundling",
    "title": "HAL",
    "label": "TOPOLOGY",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 500
        },
        {
          "action": "appear",
          "groups": [
            "nodes"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 100,
          "groups": [
            "connections"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "connections"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "nodes"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "connections": [
        {
          "source": "SRV-A",
          "target": "SRV-B"
        },
        {
          "source": "SRV-A",
          "target": "SRV-C"
        },
        {
          "source": "SRV-B",
          "target": "SRV-C"
        },
        {
          "source": "SRV-A",
          "target": "NAS-1"
        },
        {
          "source": "SRV-C",
          "target": "NAS-2"
        },
        {
          "source": "NAS-1",
          "target": "NAS-2"
        },
        {
          "source": "SRV-A",
          "target": "SW-1"
        },
        {
          "source": "SRV-B",
          "target": "SW-2"
        },
        {
          "source": "SRV-C",
          "target": "GW-1"
        },
        {
          "source": "SW-1",
          "target": "SW-2"
        },
        {
          "source": "SW-1",
          "target": "GW-1"
        },
        {
          "source": "NAS-1",
          "target": "SW-1"
        },
        {
          "source": "SRV-B",
          "target": "NAS-2"
        }
      ],
      "tree": {
        "children": [
          {
            "children": [
              {
                "name": "SRV-A"
              },
              {
                "name": "SRV-B"
              },
              {
                "name": "SRV-C"
              }
            ],
            "name": "COMPUTE"
          },
          {
            "children": [
              {
                "name": "NAS-1"
              },
              {
                "name": "NAS-2"
              }
            ],
            "name": "STORAGE"
          },
          {
            "children": [
              {
                "name": "SW-1"
              },
              {
                "name": "SW-2"
              },
              {
                "name": "GW-1"
              }
            ],
            "name": "NETWORK"
          }
        ],
        "name": "CLUSTER"
      },
      "type": "inline"
    }
  },
  {
    "type": "orbital",
    "title": "JOV",
    "label": "ORBIT MAP",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "line_0",
            "line_1",
            "line_2",
            "line_3",
            "line_4",
            "line_5",
            "line_6",
            "line_7"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "appear",
          "groups": [
            "bold_0",
            "bold_1",
            "bold_2",
            "bold_3",
            "bold_4",
            "bold_5",
            "bold_6",
            "bold_7",
            "moon_0",
            "moon_1",
            "moon_2",
            "moon_3",
            "moon_4",
            "moon_5",
            "moon_6",
            "moon_7",
            "markers",
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "glow_0"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_1"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_2"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_3"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_4"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_5"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_6"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_7"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 3000
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "glow_7",
            "glow_6",
            "glow_5",
            "glow_4",
            "glow_3",
            "glow_2",
            "glow_1",
            "glow_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "labels"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "markers"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "moon_7",
            "moon_6",
            "moon_5",
            "moon_4",
            "moon_3",
            "moon_2",
            "moon_1",
            "moon_0"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "bold_7",
            "bold_6",
            "bold_5",
            "bold_4",
            "bold_3",
            "bold_2",
            "bold_1",
            "bold_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "line_7",
            "line_6",
            "line_5",
            "line_4",
            "line_3",
            "line_2",
            "line_1",
            "line_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "center": "JUPITER",
      "bodies": [
        {
          "name": "io",
          "boldArc": 70,
          "markers": [
            {
              "angle": 45,
              "label": "IO",
              "style": "solid",
              "glow": true
            },
            {
              "angle": 120,
              "label": "VEC\u00b0",
              "style": "dashed"
            },
            {
              "angle": 300,
              "style": "solid"
            }
          ]
        },
        {
          "name": "europa",
          "boldArc": 60,
          "markers": [
            {
              "angle": 130,
              "label": "EUR",
              "style": "solid"
            },
            {
              "angle": 50,
              "label": "COMP.DIST",
              "style": "dashed"
            },
            {
              "angle": 220,
              "label": "POS.1",
              "style": "solid"
            }
          ]
        },
        {
          "name": "ganymede",
          "boldArc": 50,
          "markers": [
            {
              "angle": 220,
              "label": "GNY",
              "style": "solid"
            },
            {
              "angle": 300,
              "label": "ORB.RAD",
              "style": "dashed"
            },
            {
              "angle": 140,
              "label": "1,070,522",
              "style": "solid"
            }
          ]
        },
        {
          "name": "callisto",
          "boldArc": 40,
          "markers": [
            {
              "angle": 310,
              "label": "CALLISTO",
              "style": "solid"
            },
            {
              "angle": 50,
              "label": "PARAM",
              "style": "dashed"
            },
            {
              "angle": 200,
              "style": "solid"
            }
          ]
        }
      ],
      "type": "orbital"
    }
  },
  {
    "type": "orbital",
    "title": "LUN",
    "label": "EARTH-MOON",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "line_0",
            "line_1",
            "line_2",
            "line_3",
            "line_4",
            "line_5",
            "line_6",
            "line_7"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "appear",
          "groups": [
            "bold_0",
            "bold_1",
            "bold_2",
            "bold_3",
            "bold_4",
            "bold_5",
            "bold_6",
            "bold_7",
            "moon_0",
            "moon_1",
            "moon_2",
            "moon_3",
            "moon_4",
            "moon_5",
            "moon_6",
            "moon_7",
            "markers",
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "glow_0"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_1"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_2"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_3"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_4"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_5"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_6"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_7"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 3000
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "glow_7",
            "glow_6",
            "glow_5",
            "glow_4",
            "glow_3",
            "glow_2",
            "glow_1",
            "glow_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "labels"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "markers"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "moon_7",
            "moon_6",
            "moon_5",
            "moon_4",
            "moon_3",
            "moon_2",
            "moon_1",
            "moon_0"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "bold_7",
            "bold_6",
            "bold_5",
            "bold_4",
            "bold_3",
            "bold_2",
            "bold_1",
            "bold_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "line_7",
            "line_6",
            "line_5",
            "line_4",
            "line_3",
            "line_2",
            "line_1",
            "line_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "center": "EARTH",
      "bodies": [
        {
          "name": "luna",
          "boldArc": 60,
          "lagrange": true,
          "markers": [
            {
              "angle": 305,
              "label": "LUNA",
              "style": "solid"
            },
            {
              "angle": 125,
              "label": "APOGEE",
              "style": "dashed"
            }
          ]
        }
      ],
      "type": "orbital"
    }
  },
  {
    "type": "orbital",
    "title": "SOL",
    "label": "SOLAR SYSTEM",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "line_0",
            "line_1",
            "line_2",
            "line_3",
            "line_4",
            "line_5",
            "line_6",
            "line_7"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "appear",
          "groups": [
            "bold_0",
            "bold_1",
            "bold_2",
            "bold_3",
            "bold_4",
            "bold_5",
            "bold_6",
            "bold_7",
            "moon_0",
            "moon_1",
            "moon_2",
            "moon_3",
            "moon_4",
            "moon_5",
            "moon_6",
            "moon_7",
            "markers",
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "glow_0"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_1"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_2"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_3"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_4"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_5"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_6"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_7"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 3000
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "glow_7",
            "glow_6",
            "glow_5",
            "glow_4",
            "glow_3",
            "glow_2",
            "glow_1",
            "glow_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "labels"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "markers"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "moon_7",
            "moon_6",
            "moon_5",
            "moon_4",
            "moon_3",
            "moon_2",
            "moon_1",
            "moon_0"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "bold_7",
            "bold_6",
            "bold_5",
            "bold_4",
            "bold_3",
            "bold_2",
            "bold_1",
            "bold_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "line_7",
            "line_6",
            "line_5",
            "line_4",
            "line_3",
            "line_2",
            "line_1",
            "line_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "center": "SOL",
      "bodies": [
        {
          "name": "mercury",
          "boldArc": 50
        },
        {
          "name": "venus",
          "boldArc": 55
        },
        {
          "name": "earth",
          "boldArc": 60
        },
        {
          "name": "mars",
          "boldArc": 50
        },
        {
          "name": "jupiter",
          "boldArc": 70
        },
        {
          "name": "saturn",
          "boldArc": 65
        },
        {
          "name": "uranus",
          "boldArc": 60
        },
        {
          "name": "neptune",
          "boldArc": 55
        }
      ],
      "type": "orbital"
    },
    "centerR": 10
  },
  {
    "type": "orbital",
    "title": "JOV2",
    "label": "JOVIAN SYSTEM",
    "color": "rgb(73,42,63)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "appear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "line_0",
            "line_1",
            "line_2",
            "line_3",
            "line_4",
            "line_5",
            "line_6",
            "line_7"
          ]
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "appear",
          "groups": [
            "bold_0",
            "bold_1",
            "bold_2",
            "bold_3",
            "bold_4",
            "bold_5",
            "bold_6",
            "bold_7",
            "moon_0",
            "moon_1",
            "moon_2",
            "moon_3",
            "moon_4",
            "moon_5",
            "moon_6",
            "moon_7",
            "markers",
            "labels"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "groups": [
            "glow_0"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_1"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_2"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_3"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_4"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_5"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_6"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "glow_7"
          ],
          "duration": 600,
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 3000
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "glow_7",
            "glow_6",
            "glow_5",
            "glow_4",
            "glow_3",
            "glow_2",
            "glow_1",
            "glow_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "labels"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "markers"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "moon_7",
            "moon_6",
            "moon_5",
            "moon_4",
            "moon_3",
            "moon_2",
            "moon_1",
            "moon_0"
          ],
          "order": "reverse"
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "bold_7",
            "bold_6",
            "bold_5",
            "bold_4",
            "bold_3",
            "bold_2",
            "bold_1",
            "bold_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "gap": 60,
          "groups": [
            "line_7",
            "line_6",
            "line_5",
            "line_4",
            "line_3",
            "line_2",
            "line_1",
            "line_0"
          ],
          "order": "reverse"
        },
        {
          "action": "disappear",
          "groups": [
            "axis"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerLabel"
          ]
        },
        {
          "action": "disappear",
          "groups": [
            "centerBody"
          ]
        },
        {
          "action": "wait",
          "duration": 150
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "center": "JUPITER",
      "bodies": [
        {
          "name": "amalthea",
          "boldArc": 40
        },
        {
          "name": "io",
          "boldArc": 70,
          "markers": [
            {
              "angle": 45,
              "label": "IO",
              "style": "solid",
              "glow": true
            },
            {
              "angle": 120,
              "label": "VEC\u00b0",
              "style": "dashed"
            },
            {
              "angle": 300,
              "style": "solid"
            }
          ]
        },
        {
          "name": "europa",
          "boldArc": 60
        },
        {
          "name": "ganymede",
          "boldArc": 50
        },
        {
          "name": "callisto",
          "boldArc": 40
        },
        {
          "name": "himalia",
          "boldArc": 30
        },
        {
          "name": "elara",
          "boldArc": 25
        },
        {
          "name": "pasiphae",
          "boldArc": 20
        }
      ],
      "type": "orbital"
    }
  },
  {
    "type": "title",
    "title": "COM",
    "label": "PMT: 26-07",
    "color": "rgb(73,42,63)"
  },
  {
    "type": "title",
    "title": "GDE",
    "label": "NAV: 94-KL",
    "color": "rgb(51,82,164)"
  },
  {
    "type": "title",
    "title": "VEC",
    "label": "COORDINATES",
    "color": "rgb(14,21,48)"
  },
  {
    "type": "tabular",
    "title": "VEC",
    "label": "COORDINATES",
    "color": "rgb(14,21,48)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "separators"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "rows"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "rows"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "separators"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
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
      ],
      "type": "inline"
    }
  },
  {
    "type": "title",
    "title": "TLM",
    "label": "SENSOR GRID",
    "color": "rgb(14,21,48)"
  },
  {
    "type": "telemetry-grid",
    "title": "TLM",
    "label": "SENSOR GRID",
    "color": "rgb(14,21,48)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "columnHeaders",
            "separators"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "rows"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "rows"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "columnHeaders",
            "separators"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
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
      ],
      "type": "inline"
    }
  },
  {
    "type": "title",
    "title": "NAV",
    "label": "SPATIAL MAP",
    "color": "rgb(14,21,48)"
  },
  {
    "type": "wireframe",
    "title": "NAV",
    "label": "SPATIAL MAP",
    "color": "rgb(14,21,48)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer",
            "grid"
          ]
        },
        {
          "action": "wait",
          "duration": 1000
        },
        {
          "action": "appear",
          "groups": [
            "connections"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 600
        },
        {
          "action": "appear",
          "gap": 167,
          "groups": [
            "dataPoints"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 5000
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "dataPoints"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "disappear",
          "groups": [
            "connections"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 300
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer",
            "grid"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
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
      ],
      "objects": [
        {
          "label": "SAT-A",
          "x": -2,
          "y": 1.5,
          "z": 1
        },
        {
          "label": "SAT-B",
          "x": 3,
          "y": -1,
          "z": 2
        },
        {
          "label": "PROBE-1",
          "x": -1,
          "y": -2.5,
          "z": -0.5
        },
        {
          "label": "PROBE-2",
          "x": 2.5,
          "y": 2,
          "z": -1.5
        },
        {
          "label": "ORIGIN",
          "x": 0,
          "y": 0,
          "z": 0
        }
      ],
      "type": "inline"
    }
  },
  {
    "type": "title",
    "title": "RAD",
    "label": "RADAR SWEEP",
    "color": "rgb(14,21,48)"
  },
  {
    "type": "polar",
    "title": "RAD",
    "label": "RADAR SWEEP",
    "color": "rgb(14,21,48)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 80,
          "groups": [
            "rings"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "spokes"
          ],
          "order": "simultaneous"
        },
        {
          "action": "appear",
          "groups": [
            "scaleLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "appear",
          "groups": [
            "monthLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 150,
          "groups": [
            "dataPolygons"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 40,
          "groups": [
            "legend"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "arcs"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 6000
        },
        {
          "action": "disappear",
          "gap": 40,
          "groups": [
            "legend"
          ],
          "order": "sequential"
        },
        {
          "action": "disappear",
          "groups": [
            "arcs"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "dataPolygons"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "disappear",
          "groups": [
            "monthLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "groups": [
            "scaleLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "groups": [
            "spokes"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "gap": 80,
          "groups": [
            "rings"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
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
      ],
      "type": "inline"
    }
  },
  {
    "type": "title",
    "title": "TEMP",
    "label": "SURFACE TEMPERATURE",
    "color": "rgb(14,21,48)"
  },
  {
    "type": "polar",
    "title": "GLOBAL TEMPERATURE",
    "label": "",
    "color": "rgb(14,21,48)",
    "animation": {
      "phases": [
        {
          "action": "appear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 80,
          "groups": [
            "rings"
          ],
          "order": "sequential"
        },
        {
          "action": "appear",
          "groups": [
            "spokes"
          ],
          "order": "simultaneous"
        },
        {
          "action": "appear",
          "groups": [
            "scaleLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "appear",
          "groups": [
            "monthLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 150,
          "groups": [
            "dataPolygons"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 400
        },
        {
          "action": "appear",
          "gap": 40,
          "groups": [
            "legend"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "appear",
          "groups": [
            "arcs"
          ],
          "order": "simultaneous"
        },
        {
          "action": "wait",
          "duration": 6000
        },
        {
          "action": "disappear",
          "gap": 40,
          "groups": [
            "legend"
          ],
          "order": "sequential"
        },
        {
          "action": "disappear",
          "groups": [
            "arcs"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "gap": 100,
          "groups": [
            "dataPolygons"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "disappear",
          "groups": [
            "monthLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "groups": [
            "scaleLabels"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "groups": [
            "spokes"
          ],
          "order": "simultaneous"
        },
        {
          "action": "disappear",
          "gap": 80,
          "groups": [
            "rings"
          ],
          "order": "sequential"
        },
        {
          "action": "wait",
          "duration": 200
        },
        {
          "action": "disappear",
          "groups": [
            "header",
            "footer"
          ]
        },
        {
          "action": "done"
        }
      ]
    },
    "dataSource": {
      "type": "era5",
      "startYear": 2015,
      "endYear": 2026
    },
    "labels": [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC"
    ],
    "w": 800,
    "h": 720,
    "cx": 500,
    "cy": 380,
    "maxR": 340,
    "minR": 40,
    "rings": 6,
    "ringColor": "rgba(255,255,255,0.15)",
    "ringWidth": 0.5,
    "ringWidth0": 0.3,
    "spokeColor": "rgba(255,255,255,0.12)",
    "spokeWidth": 0.3,
    "labelOffset": 32,
    "labelFontSize": 9,
    "labelColor": "rgba(255,255,255,0.7)",
    "scaleFontSize": 8,
    "scalePrecision": 1,
    "lineWidth": 1.0,
    "lineAlpha": 1.0,
    "baseAlpha": 0.3,
    "alphaMax": 0.85,
    "titleSize": 14,
    "titleX": 15,
    "titleY": 15,
    "subSize": 9,
    "subtitle": "PARIS ERA5-LAND \u00b7 DAILY \u00b7 2015-2026",
    "coolColor": {
      "r": 100,
      "g": 180,
      "b": 255
    },
    "warmColor": {
      "r": 255,
      "g": 180,
      "b": 80
    },
    "arcs": [
      {
        "stat": "min",
        "rOff": -14,
        "width": 3,
        "color": "#ffffff",
        "alpha": 1.0,
        "label": "MIN",
        "tickLen": 5,
        "tickColor": "#ffffff",
        "tickWidth": 1.5,
        "tickAlpha": 0.6,
        "lineColor": "#ffffff",
        "lineAlpha": 0.2,
        "connectors": true
      },
      {
        "stat": "avg",
        "rOff": 0,
        "width": 3,
        "color": "#ffffff",
        "alpha": 1.0,
        "label": "AVG",
        "tickLen": 5,
        "tickColor": "#ffffff",
        "tickWidth": 1.5,
        "tickAlpha": 0.6,
        "lineColor": "#ffffff",
        "lineAlpha": 0.2,
        "connectors": true
      },
      {
        "stat": "mean",
        "rOff": 0,
        "width": 3,
        "color": "rgba(255,255,255,0.50)",
        "alpha": 0.75,
        "label": "MEAN",
        "tickLen": 5,
        "tickColor": "rgba(255,255,255,0.50)",
        "tickWidth": 1.5,
        "tickAlpha": 0.5,
        "lineColor": "rgba(255,255,255,0.50)",
        "lineAlpha": 0.2,
        "connectors": true
      },
      {
        "stat": "max",
        "rOff": 14,
        "width": 3,
        "color": "#ffffff",
        "alpha": 1.0,
        "label": "MAX",
        "tickLen": 5,
        "tickColor": "#ffffff",
        "tickWidth": 1.5,
        "tickAlpha": 0.6,
        "lineColor": "#ffffff",
        "lineAlpha": 0.2,
        "connectors": true
      }
    ],
    "legend": true,
    "legendX": 20,
    "legendY": 690,
    "legendCols": 2,
    "legendSpacing": 11,
    "legendFontSize": 8,
    "markers": {
      "min": false,
      "max": false,
      "avg": false,
      "mean": false
    },
    "smooth": 0.02
  },
  {
    "type": "title",
    "title": "CHP",
    "label": "CHIP DEMO",
    "color": "rgb(45,75,99)"
  },
  {
    "type": "title",
    "title": "CHP",
    "label": "CHIP DEMO",
    "color": "rgb(45,75,99)"
  },
  {
    "type": "title",
    "title": "RB-3D",
    "label": "",
    "color": "rgb(0,0,0)"
  },
  {
    "type": "title",
    "title": "DOCK",
    "label": "",
    "color": "rgb(10,10,10)"
  },
  {
    "type": "dock-stack",
    "title": "DOCK",
    "label": "APPROACH",
    "color": "rgb(17,18,20)",
    "animation": null,
    "dataSource": {
      "type": "inline"
    },
    "cfg": {
      "endDelay": 5000
    }
  }
],
};
