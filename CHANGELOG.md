# Changelog

## 2026-07-27

- Removed HAL stream card from radiator.yaml and radiator-demo.yaml (static data rendering issues).
- Fixed polar card: removed duplicate legend disappear animation phase (regression from refactor).
- Fixed PERIGEE/APOGEE auto-generation from Keplerian elements: replaced placeholder w=0 values with real argument of periapsis for Galilean moons.
- Removed local-only files from tracking (output_svg, reference, SERVER_STATE, utilities).
- Switched license to CC BY-NC 4.0.
