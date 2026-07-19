=== Server State ===
Port: 8009
Launcher: python serve.py (from repo root)
Python: python (3.11) — NOT python3 (3.14)
Provides: /api/config, /api/ephemeris, static files (/) via root index.html

=== Restart cmd ===
taskkill /F /PID $(netstat -ano | findstr ':8009 ' | findstr LISTENING | awk '{print $5}' | sort -u) 2>/dev/null
cd D:/git/hal-title-card-generator && python serve.py
