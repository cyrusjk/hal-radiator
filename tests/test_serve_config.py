# ═══════════════════════════════════════════════════════════════════════
#  Serve.py — Config Flattening & Prototype Resolution Tests
#  Tests resolve_prototype() and flatten_config() in isolation.
# ═══════════════════════════════════════════════════════════════════════

import sys, os, yaml
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from serve import resolve_prototype, flatten_config


SAMPLE_PROTOTYPES = {
    "curve-family-default": {
        "chartType": "curve-family",
        "animation": {
            "phases": [
                {"action": "appear", "groups": ["header", "footer"]},
                {"action": "wait", "duration": 400},
                {"action": "appear", "groups": ["axis", "bands"]},
                {"action": "wait", "duration": 200},
                {"action": "draw", "order": "sequential", "duration": 200, "gap": 60, "groups": ["line_0", "line_1"]},
                {"action": "appear", "order": "sequential", "duration": 10, "gap": 40, "groups": ["eyeballs"]},
                {"action": "wait", "duration": 3000},
                {"action": "disappear", "order": "reverse", "gap": 60, "groups": ["eyeballs"]},
                {"action": "disappear", "order": "reverse", "gap": 60, "groups": ["line_0", "line_1"]},
                {"action": "disappear", "groups": ["axis", "bands"]},
                {"action": "wait", "duration": 150},
                {"action": "disappear", "groups": ["header", "footer"]},
                {"action": "done"},
            ]
        },
    }
}


class TestResolvePrototype:
    """Tests for resolve_prototype()."""

    def test_no_prototype_returns_chart_unchanged(self):
        chart = {"title": "A"}
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert result is chart

    def test_known_prototype_returns_merged(self):
        chart = {"title": "A", "prototype": "curve-family-default"}
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert result["chartType"] == "curve-family"
        assert result["title"] == "A"
        assert "animation" in result
        assert "prototype" not in result

    def test_unknown_prototype_raises(self):
        chart = {"prototype": "nonexistent"}
        import pytest
        with pytest.raises(ValueError, match="Unknown card prototype"):
            resolve_prototype(chart, SAMPLE_PROTOTYPES)

    def test_chart_overrides_prototype_animation_phases(self):
        chart = {
            "prototype": "curve-family-default",
            "animation": {"phases": [{"action": "appear", "groups": ["header"]}]},
        }
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert len(result["animation"]["phases"]) == 1
        assert result["animation"]["phases"][0]["action"] == "appear"

    def test_chart_dataSource_replaces_prototype_dataSource(self):
        chart = {
            "prototype": "curve-family-default",
            "dataSource": {"type": "victoria", "url": "http://x"},
        }
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert result["dataSource"]["type"] == "victoria"
        assert result["dataSource"]["url"] == "http://x"

    def test_chart_datasource_series_replaces_prototype(self):
        chart = {"prototype": "curve-family-default", "dataSource": {"series": [1, 2]}}
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert result["dataSource"]["series"] == [1, 2]

    def test_preserves_prototype_excluded_on_output(self):
        chart = {"prototype": "curve-family-default", "title": "X"}
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert "prototype" not in result

    def test_animation_absent_from_chart_keeps_prototype(self):
        chart = {"prototype": "curve-family-default", "title": "X"}
        result = resolve_prototype(chart, SAMPLE_PROTOTYPES)
        assert "animation" in result
        assert len(result["animation"]["phases"]) == 13


class TestFlattenConfig:
    """Tests for flatten_config()."""

    def test_minimal_yaml_returns_expected_keys(self):
        yaml = {"groups": []}
        result = flatten_config(yaml)
        assert "timing" in result
        assert "visual" in result
        assert "cards" in result

    def test_title_card_from_group(self):
        yaml = {"groups": [{"title": "SYS"}]}
        result = flatten_config(yaml)
        assert len(result["cards"]) == 1
        assert result["cards"][0]["type"] == "title"
        assert result["cards"][0]["title"] == "SYS"

    def test_chart_card_from_group(self):
        yaml = {
            "cardPrototypes": {"base": {"chartType": "curve-family"}},
            "groups": [{"title": "SYS", "charts": [{"prototype": "base", "title": "CPU"}]}],
        }
        result = flatten_config(yaml)
        assert len(result["cards"]) == 2  # title + chart
        assert result["cards"][1]["type"] == "curve-family"
        assert result["cards"][1]["title"] == "CPU"

    def test_chart_with_prototype_resolved(self):
        yaml = {
            "cardPrototypes": {"base": {"chartType": "streamgraph"}},
            "groups": [{"title": "G", "charts": [{"prototype": "base", "label": "NET"}]}],
        }
        result = flatten_config(yaml)
        assert result["cards"][1]["type"] == "streamgraph"
        assert result["cards"][1]["label"] == "NET"

    def test_chart_color_resolved_from_name(self):
        yaml = {"groups": [{"title": "G", "charts": [{"chartType": "streamgraph", "color": "blue"}]}],
                 "colors": {"blue": "rgb(0,0,255)"}}
        result = flatten_config(yaml)
        assert result["cards"][1]["color"] == "rgb(0,0,255)"

    def test_group_color_falls_through_to_chart(self):
        yaml = {"groups": [{"title": "G", "color": "red", "charts": [{"chartType": "streamgraph", "title": "A"}]}],
                 "colors": {"red": "rgb(255,0,0)"}}
        result = flatten_config(yaml)
        assert result["cards"][1]["color"] == "rgb(255,0,0)"

    def test_multiple_groups_multiple_charts(self):
        yaml = {
            "groups": [
                {"title": "A", "charts": [{"chartType": "streamgraph", "title": "A1"}, {"chartType": "orbital", "title": "A2"}]},
                {"title": "B", "charts": [{"chartType": "title", "title": "B1"}]},
            ]
        }
        result = flatten_config(yaml)
        assert len(result["cards"]) == 5
        assert result["cards"][1]["title"] == "A1"
        assert result["cards"][3]["title"] == "B"

    def test_prototype_error_propagates(self):
        yaml = {"groups": [{"title": "G", "charts": [{"prototype": "nope", "title": "X"}]}]}
        import pytest
        with pytest.raises(ValueError):
            flatten_config(yaml)

    def test_empty_groups(self):
        result = flatten_config({"groups": []})
        assert result["cards"] == []

    def test_timing_and_visual_preserved(self):
        yaml = {"groups": [], "timing": {"flickerDuration": 500}, "visual": {"fontScale": 1.2}}
        result = flatten_config(yaml)
        assert result["timing"]["flickerDuration"] == 500
        assert result["visual"]["fontScale"] == 1.2


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
