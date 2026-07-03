// ═══════════════════════════════════════════════════
//  Auto-generated from radiator.yaml
//  Do not edit directly — edit radiator.yaml and
//  run 'python build.py' to regenerate.
// ═══════════════════════════════════════════════════

window.HAL_CONFIG = window.HAL_CONFIG || {
  timing: {
  "titleCardDisplay": 8
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
    "h": 520,
    "dataPts": 9,
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
  }
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
    "title": "LAT: PROD-01",
    "label": "LATENCY PERCENTILES",
    "color": "rgb(28,52,100)",
    "dataSource": {
      "type": "inline",
      "groups": [
        {
          "name": "API-GATEWAY",
          "series": [
            {
              "label": "p99",
              "values": [
                60,
                70,
                85,
                110,
                130,
                125,
                100,
                80,
                65,
                55
              ]
            },
            {
              "label": "p95",
              "values": [
                30,
                35,
                42,
                55,
                60,
                58,
                50,
                40,
                32,
                28
              ]
            },
            {
              "label": "p50",
              "values": [
                10,
                12,
                14,
                18,
                20,
                18,
                15,
                12,
                10,
                8
              ]
            }
          ]
        },
        {
          "name": "AUTH-SVC",
          "series": [
            {
              "label": "p99",
              "values": [
                35,
                42,
                58,
                78,
                90,
                85,
                70,
                50,
                38,
                32
              ]
            },
            {
              "label": "p95",
              "values": [
                15,
                18,
                25,
                35,
                40,
                38,
                30,
                22,
                16,
                14
              ]
            },
            {
              "label": "p50",
              "values": [
                5,
                6,
                8,
                10,
                12,
                11,
                9,
                7,
                5,
                4
              ]
            }
          ]
        },
        {
          "name": "WORKER",
          "series": [
            {
              "label": "p99",
              "values": [
                80,
                95,
                120,
                160,
                190,
                180,
                150,
                110,
                90,
                75
              ]
            },
            {
              "label": "p95",
              "values": [
                50,
                60,
                75,
                95,
                110,
                105,
                85,
                65,
                55,
                48
              ]
            },
            {
              "label": "p50",
              "values": [
                20,
                25,
                30,
                40,
                45,
                42,
                35,
                28,
                22,
                18
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "type": "curve-family",
    "title": "THR: NODE-02",
    "label": "THROUGHPUT",
    "color": "rgb(39,72,100)",
    "dataSource": {
      "type": "inline",
      "groups": [
        {
          "name": "API-GATEWAY",
          "series": [
            {
              "label": "max",
              "values": [
                1200,
                1150,
                1050,
                950,
                880,
                900,
                1000,
                1100,
                1180,
                1220
              ]
            },
            {
              "label": "avg",
              "values": [
                950,
                900,
                820,
                750,
                700,
                720,
                780,
                860,
                920,
                980
              ]
            },
            {
              "label": "min",
              "values": [
                600,
                550,
                480,
                420,
                380,
                400,
                450,
                520,
                580,
                620
              ]
            }
          ]
        },
        {
          "name": "AUTH-SVC",
          "series": [
            {
              "label": "max",
              "values": [
                1050,
                980,
                880,
                800,
                750,
                780,
                860,
                950,
                1020,
                1080
              ]
            },
            {
              "label": "avg",
              "values": [
                800,
                750,
                680,
                620,
                580,
                600,
                650,
                720,
                780,
                820
              ]
            },
            {
              "label": "min",
              "values": [
                450,
                400,
                350,
                300,
                280,
                300,
                340,
                400,
                440,
                470
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "type": "title",
    "title": "SYS",
    "label": "PAPPY HOMELAB",
    "color": "rgb(16,45,70)"
  },
  {
    "type": "curve-family",
    "title": "CPU: LOAD AVG",
    "label": "CPU LOAD AVERAGES",
    "color": "rgb(16,45,70)",
    "dataSource": {
      "type": "victoria",
      "url": "http://192.168.50.9:8428",
      "promql": "{__name__=~\"node_load[0-9]+\"}",
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
  }
],
};
