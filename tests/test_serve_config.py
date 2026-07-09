# ═══════════════════════════════════════════════════════════════════════
#  Serve.py — Config Flattening & Prototype Resolution Tests
#  Tests resolve_prototype() and flatten_config() in isolation.
# ═══════════════════════════════════════════════════════════════════════

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from serve import resolve_prototype, flatten_config


class TestResolvePrototype:
    """Tests for resolve_prototype() — deep-merging card definitions."""

    def test_no_prototype_returns_unchanged(self):
        chart = {'title': 'TEST', 'chartType': 'title'}
        result = resolve_prototype(chart, {})
        assert result == chart

    def test_merges_prototype_fields(self):
        prototypes = {'base': {'chartType': 'orbital', 'color': 'rgb(94,67,110)'}}
        chart = {'prototype': 'base', 'title': 'TEST'}
        result = resolve_prototype(chart, prototypes)
        assert result['chartType'] == 'orbital'
        assert result['color'] == 'rgb(94,67,110)'
        assert result['title'] == 'TEST'

    def test_chart_overrides_prototype(self):
        prototypes = {'base': {'color': 'rgb(94,67,110)', 'label': 'DEFAULT'}}
        chart = {'prototype': 'base', 'color': 'near-black', 'title': 'TEST'}
        result = resolve_prototype(chart, prototypes)
        assert result['color'] == 'near-black'   # chart wins
        assert result['label'] == 'DEFAULT'        # inherited
        assert result['title'] == 'TEST'           # from chart

    def test_unknown_prototype_raises(self):
        import pytest
        with pytest.raises(ValueError, match='Unknown card prototype'):
            resolve_prototype({'prototype': 'does-not-exist'}, {})

    def test_deep_merges_animation_phases(self):
        prototypes = {
            'base': {
                'animation': {'phases': [{'action': 'appear', 'groups': ['header']}]}
            }
        }
        chart = {'prototype': 'base', 'animation': {'phases': [{'action': 'done'}]}}
        result = resolve_prototype(chart, prototypes)
        assert result['animation']['phases'] == [{'action': 'done'}]

    def test_deep_merges_datasource(self):
        prototypes = {
            'base': {
                'dataSource': {'type': 'inline', 'series': [{'label': 'A'}]}
            }
        }
        chart = {'prototype': 'base', 'dataSource': {'center': 'SOL'}}
        result = resolve_prototype(chart, prototypes)
        assert result['dataSource']['type'] == 'inline'   # from prototype
        assert result['dataSource']['center'] == 'SOL'     # from chart
        assert 'series' in result['dataSource']            # from prototype

    def test_preserves_prototype_excluded_on_output(self):
        prototypes = {'base': {'chartType': 'orbital'}}
        chart = {'prototype': 'base', 'title': 'TEST'}
        result = resolve_prototype(chart, prototypes)
        assert 'prototype' not in result  # stripped from output

    def test_chart_datasource_series_replaces_prototype(self):
        prototypes = {
            'base': {
                'dataSource': {'type': 'inline', 'series': [{'label': 'OLD'}]}
            }
        }
        chart = {'prototype': 'base', 'dataSource': {'series': [{'label': 'NEW'}]}}
        result = resolve_prototype(chart, prototypes)
        assert result['dataSource']['series'] == [{'label': 'NEW'}]

    def test_animation_absent_from_chart_keeps_prototype(self):
        prototypes = {
            'base': {'animation': {'phases': [{'action': 'appear'}]}}
        }
        chart = {'prototype': 'base', 'title': 'X'}
        result = resolve_prototype(chart, prototypes)
        assert result['animation']['phases'] == [{'action': 'appear'}]


class TestFlattenConfig:
    """Tests for flatten_config() — the end-to-end YAML processor."""

    YAML_TEMPLATE = {
        'colors': {},
        'timing': {'cycleMs': 8000},
        'visual': {'fontScale': 1.0},
    }

    def test_minimal_yaml_returns_expected_keys(self):
        result = flatten_config({})
        assert 'cards' in result
        assert 'timing' in result
        assert 'visual' in result
        assert result['cards'] == []

    def test_title_card_from_group(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['groups'] = [{'title': 'WELCOME'}]
        result = flatten_config(yaml)['cards']
        assert len(result) == 1
        assert result[0]['type'] == 'title'
        assert result[0]['title'] == 'WELCOME'

    def test_chart_card_from_group(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['groups'] = [{
            'title': 'GROUP',
            'charts': [{'title': 'MY CHART', 'chartType': 'curve-family'}]
        }]
        result = flatten_config(yaml)['cards']
        # 1 title card + 1 chart card
        assert len(result) == 2
        assert result[1]['title'] == 'MY CHART'
        assert result[1]['type'] == 'curve-family'

    def test_chart_with_prototype_resolved(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['cardPrototypes'] = {
            'orbital-default': {'chartType': 'orbital', 'color': 'rgb(94,67,110)'}
        }
        yaml['groups'] = [{
            'title': 'GROUP',
            'charts': [{'prototype': 'orbital-default', 'title': 'SOL'}]
        }]
        result = flatten_config(yaml)['cards']
        chart = result[1]
        assert chart['title'] == 'SOL'
        assert chart['type'] == 'orbital'
        assert chart['color'] == 'rgb(94,67,110)'

    def test_chart_color_resolved_from_name(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['colors'] = {'plum': 'rgb(94,67,110)'}
        yaml['groups'] = [{
            'title': 'GROUP',
            'charts': [{'title': 'X', 'chartType': 'orbital', 'color': 'plum'}]
        }]
        result = flatten_config(yaml)['cards']
        assert result[1]['color'] == 'rgb(94,67,110)'

    def test_group_color_falls_through_to_chart(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['colors'] = {'plum': 'rgb(94,67,110)'}
        yaml['groups'] = [{
            'title': 'GROUP',
            'color': 'plum',
            'charts': [{'title': 'X', 'chartType': 'curve-family'}]
        }]
        result = flatten_config(yaml)['cards']
        assert result[1]['color'] == 'rgb(94,67,110)'

    def test_multiple_groups_multiple_charts(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['groups'] = [
            {'title': 'A', 'charts': [
                {'title': 'A1', 'chartType': 'curve-family'},
                {'title': 'A2', 'chartType': 'orbital'},
            ]},
            {'title': 'B', 'charts': [
                {'title': 'B1', 'chartType': 'title'},
            ]},
        ]
        result = flatten_config(yaml)['cards']
        # group A: 1 title + 2 charts; group B: 1 title + 1 chart = 5
        assert len(result) == 5
        assert result[1]['title'] == 'A1'
        assert result[3]['title'] == 'B'    # B's group title card
        assert result[4]['title'] == 'B1'

    def test_prototype_error_propagates(self):
        import pytest
        yaml = {
            'cardPrototypes': {},
            'groups': [{
                'title': 'X',
                'charts': [{'prototype': 'missing', 'title': 'X'}]
            }]
        }
        with pytest.raises(ValueError, match='Unknown card prototype'):
            flatten_config(yaml)

    def test_empty_groups(self):
        yaml = dict(self.YAML_TEMPLATE)
        yaml['groups'] = []
        result = flatten_config(yaml)['cards']
        assert result == []

    def test_timing_and_visual_preserved(self):
        yaml = {
            'timing': {'cycleMs': 5000, 'groupGap': 200},
            'visual': {'fontScale': 1.2, 'frameBrightness': 0.3},
            'groups': [{'title': 'TEST', 'charts': [{'title': 'C', 'chartType': 'curve-family'}]}]
        }
        result = flatten_config(yaml)
        assert result['timing']['cycleMs'] == 5000
        assert result['timing']['groupGap'] == 200
        assert result['visual']['fontScale'] == 1.2


class TestLoadConfig:
    """Tests for load_config() — dual-file prototype merging."""

    def test_loads_both_files_and_merges_prototypes(self, tmp_path):
        """load_config() merges cardPrototypes from prototypes.yaml."""
        (tmp_path / "radiator.yaml").write_text("groups:\n  - title: A\n")
        (tmp_path / "prototypes.yaml").write_text(
            "cardPrototypes:\n  base:\n    chartType: orbital\n"
        )
        import serve
        from unittest.mock import patch
        with patch.object(serve, 'YAML_PATH', os.path.join(str(tmp_path), 'radiator.yaml')):
            with patch.object(serve, 'PROTOTYPES_PATH', os.path.join(str(tmp_path), 'prototypes.yaml')):
                cfg = serve.load_config()
        assert 'cardPrototypes' in cfg
        assert cfg['cardPrototypes']['base']['chartType'] == 'orbital'
        assert len(cfg['groups']) == 1

    def test_prototypes_yaml_missing_does_not_crash(self, tmp_path):
        """Missing prototypes.yaml returns config with no cardPrototypes."""
        (tmp_path / "radiator.yaml").write_text("groups: []\n")
        import serve
        from unittest.mock import patch
        with patch.object(serve, 'YAML_PATH', os.path.join(str(tmp_path), 'radiator.yaml')):
            with patch.object(serve, 'PROTOTYPES_PATH', os.path.join(str(tmp_path), 'nonexistent.yaml')):
                cfg = serve.load_config()
        assert 'cardPrototypes' not in cfg
        assert cfg['groups'] == []

    def test_flatten_config_still_uses_in_memory_prototypes(self):
        """flatten_config with in-memory dict still works (tests use this)."""
        yaml = {
            'cardPrototypes': {'base': {'chartType': 'orbital'}},
            'groups': [{'title': 'G', 'charts': [{'prototype': 'base', 'title': 'A'}]}]
        }
        result = flatten_config(yaml)['cards']
        assert len(result) == 2  # title + chart
        assert result[1]['type'] == 'orbital'


class TestTimescale:
    """Tests for timescale parsing and application in config pipeline."""

    def test_timescale_h_sets_range(self):
        """timescale: '1h' sets dataSource.range to 3600."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'timescale': '1h',
                'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...'}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert len(result) == 2
        ds = result[1]['dataSource']
        assert ds['range'] == 3600

    def test_timescale_m_sets_range(self):
        """timescale: '30m' sets dataSource.range to 1800."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'timescale': '30m',
                'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...'}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert result[1]['dataSource']['range'] == 1800

    def test_timescale_d_sets_range(self):
        """timescale: '7d' sets dataSource.range to 604800."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'timescale': '7d',
                'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...'}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert result[1]['dataSource']['range'] == 604800

    def test_timescale_int_passthrough(self):
        """timescale as raw int sets dataSource.range to that value."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'timescale': 7200,
                'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...'}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert result[1]['dataSource']['range'] == 7200

    def test_explicit_range_overrides_timescale(self):
        """If dataSource already has range, timescale is ignored."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'timescale': '1h',
                'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...', 'range': 600}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert result[1]['dataSource']['range'] == 600  # explicit range wins

    def test_missing_timescale_does_not_set_range(self):
        """No timescale → no range in dataSource unless prototype provides it."""
        yaml = {
            'groups': [{'title': 'G', 'charts': [{
                'chartType': 'streamgraph', 'title': 'A',
                'dataSource': {'type': 'inline'}
            }]}]
        }
        result = flatten_config(yaml)['cards']
        assert result[1]['dataSource'].get('range') is None

    def test_composite_zone_timescale(self):
        """Chart zone in a composite card also resolves timescale."""
        yaml = {
            'groups': [{
                'title': 'SYS', 'layout': {'zones': [{
                    'type': 'chart', 'chartType': 'curve-family', 'title': 'CPU',
                    'timescale': '6h',
                    'dataSource': {'type': 'victoria', 'url': 'x', 'promql': '...'}
                }]}
            }]
        }
        result = flatten_config(yaml)['cards']
        assert len(result) == 1
        assert result[0]['type'] == 'composite'
        zone = result[0]['zones'][0]
        assert zone['dataSource']['range'] == 21600
