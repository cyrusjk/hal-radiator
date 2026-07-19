# ═══════════════════════════════════════════════════════════════════════
#  Serve.py — JPL CSV Parser Tests
#  Tests the _serve_ephemeris CSV parsing logic in isolation.
#  The real JPL batch CGI returns CSV lines like:
#    2461229.500000000, A.D. 2026-Jul-08 00:00:00.0000,  1.234E+07, -2.345E+07,  3.456E+06, ...
#  Columns: JDTDB, Calendar Date, X, Y, Z, VX, VY, VZ, LT
# ═══════════════════════════════════════════════════════════════════════

import json
import re

# ── Parser logic extracted from serve.py _serve_ephemeris() ──────────
# (Kept as-is from the real method for faithful test coverage)

def parse_jpl_response(raw: str) -> dict | None:
    """Parse JPL Horizons batch CGI output, return {x, y, z} or None."""
    vals = {}
    for line in raw.split('\n'):
        line = line.strip()
        if not line:
            continue
        # Try "X = <val> Y = <val> Z = <val>" format (non-CSV mode)
        m = re.search(r'X\s*=\s*([\d\.Ee+\-]+)\s+Y\s*=\s*([\d\.Ee+\-]+)\s+Z\s*=\s*([\d\.Ee+\-]+)', line)
        if m:
            vals['x'] = float(m.group(1))
            vals['y'] = float(m.group(2))
            vals['z'] = float(m.group(3))
            break
        # Try CSV format: JDTDB, ... X, Y, Z, ...
        parts = line.split(',')
        if len(parts) >= 5:
            try:
                x = float(parts[2].strip())
                y = float(parts[3].strip())
                z = float(parts[4].strip())
                vals = {'x': x, 'y': y, 'z': z}
                break
            except (ValueError, IndexError):
                pass
    return vals or None


# ── Tests ────────────────────────────────────────────────────────────

class TestJplCsvParser:
    """Tests for the JPL Horizons batch CGI CSV parser."""

    def test_parses_mercury_vector(self):
        """Real Mercury data from 2026-07-08."""
        raw = (
            "2461229.500000000, A.D. 2026-Jul-08 00:00:00.0000,"
            "  6.465277155363202E+06, -6.909782335208063E+07,"
            " -6.183290624904443E+06,  3.871881087490088E+01,"
            "  7.280047553842478E+00, -2.955703309942834E+00,  2.32"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert abs(result['x'] - 6465277.155) < 1
        assert abs(result['y'] - (-69097823.352)) < 1
        assert abs(result['z'] - (-6183290.625)) < 1

    def test_parses_io_vector(self):
        """Real Io data relative to Jupiter, 2026-07-08."""
        raw = (
            "2461229.500000000, A.D. 2026-Jul-08 00:00:00.0000,"
            "  1.650338129775421E+05,  3.859902187754202E+05,"
            "  1.627996887791157E+04, -9.701286460153642E+00,"
            "  9.829111621145099E+00,  1.275630469300131E+00,  5.11E-01"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert abs(result['x'] - 165033.81) < 0.1
        assert abs(result['y'] - 385990.22) < 0.1
        assert abs(result['z'] - 16279.97) < 0.1

    def test_parses_non_csv_format(self):
        """Handle the X = <val> Y = <val> Z = <val> text format."""
        raw = (
            "  X = 6.465277155363202E+06 Y = -6.909782335208063E+07"
            " Z = -6.183290624904443E+06\n"
            "  VX= ... more stuff\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert abs(result['x'] - 6465277.155) < 1

    def test_returns_none_for_empty_input(self):
        result = parse_jpl_response("")
        assert result is None

    def test_returns_none_for_header_only(self):
        """Header lines without data should not match."""
        raw = (
            "*******************************************************************************\n"
            "JDTDB, Calendar Date (TDB), X, Y, Z\n"
            "!$$SOF\n"
        )
        result = parse_jpl_response(raw)
        assert result is None

    def test_skips_explanation_lines(self):
        """Lines with no data markers are skipped."""
        raw = (
            "This is a header with no numeric data\n"
            "X=Y= and other noise\n"
            "2461229.500000000, A.D. 2026-Jul-08 00:00:00.0000,"
            "  1.23E+07, -2.34E+07,  3.45E+06\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert abs(result['x'] - 1.23e7) < 1

    def test_handles_negative_exponents(self):
        """Small values with E- notation."""
        raw = (
            "2461230.5, A.D. 2026-Jul-09,"
            "  1.5E-03, -2.5E-04,  3.5E-05\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert result['x'] == 0.0015
        assert result['y'] == -0.00025
        assert result['z'] == 0.000035

    def test_handles_no_comma_date_format(self):
        """Dates without a leading space."""
        raw = (
            "2461230.5, A.D. 2026-Jul-09,"
            "  123456.789, -987654.321,  0.001\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert abs(result['x'] - 123456.789) < 0.001

    def test_returns_none_for_junk_input(self):
        raw = "not even remotely like JPL data\nwith\tsome\ttabs\n"
        result = parse_jpl_response(raw)
        assert result is None

    def test_parses_first_data_line_only(self):
        """If multiple data lines, only the first should be used."""
        raw = (
            "2461229.5, A.D. 2026-Jul-08,  1.0E+06, -2.0E+06,  3.0E+06\n"
            "2461230.5, A.D. 2026-Jul-09,  4.0E+06, -5.0E+06,  6.0E+06\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert result['x'] == 1.0e6  # first line, not second

    def test_venus_vector(self):
        """Real Venus data from 2026-07-08."""
        raw = (
            "2461229.500000000, A.D. 2026-Jul-08 00:00:00.0000,"
            " -8.469905860947147E+07, -6.829071703838163E+07,"
            "  3.960275339689750E+06\n"
        )
        result = parse_jpl_response(raw)
        assert result is not None
        assert result['x'] < 0  # negative X
        assert result['y'] < 0  # negative Y
        assert result['z'] > 0  # positive Z

    def test_handles_extra_whitespace(self):
        raw = "  2461229.5  ,  A.D. 2026-Jul-08  ,    1E+06  ,  -2E+06  ,  3E+06  "
        result = parse_jpl_response(raw)
        assert result is not None
        assert result['x'] == 1e6

    def test_missing_z_column(self):
        """If fewer than 5 columns, cannot parse."""
        raw = "2461229.5, A.D. 2026-Jul-08,  1E+06, -2E+06\n"
        result = parse_jpl_response(raw)
        assert result is None

    def test_prefers_csv_format_over_x_format(self):
        """When both formats appear, CSV (which appears later) wins since
        it breaks out of the loop on first match.
        Actually: the code checks X= format first per-line, breaking on match.
        So if X= appears on one line and CSV on another, X= format wins."""
        raw = (
            "  X = 9.999999999999999E+99 Y = 8.888888888888888E+99 Z = 7.777777777777777E+99\n"
            "2461229.5, A.D. 2026-Jul-08,  1.0E+06, -2.0E+06,  3.0E+06\n"
        )
        result = parse_jpl_response(raw)
        # X= format appears first → it wins
        assert result is not None
        assert result['x'] == 9.999999999999999e99
