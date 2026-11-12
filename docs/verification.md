# Database verification

Verified against the SQLite `weather_logs` table on 2026-11-12.

## City counts and average temperatures

| City | Rows | Average temperature (°C) |
|---|---:|---:|
| London | 1 | 8.0 |
| Mumbai | 1 | 29.5 |
| Pune | 1 | — |

Pune's average is unavailable because its seeded observation has no temperature.

## CLI and dashboard records

| Expected source | Row | City | Logged at | Result |
|---|---:|---|---|---|
| CLI `add "London"` | 2 | London | 2026-11-12 14:54:24 | Present: 8.0 °C, 57% humidity, 14.8 km/h wind, clear |
| Dashboard refresh | 3 | Mumbai | 2026-11-12 15:08:08 | Present: 29.5 °C, 47% humidity, 12.1 km/h wind, clear |

The database schema does not record the insertion source; the source labels above
are based on the CLI/dashboard workflow, not stored provenance. No Tokyo row was
found.

## Anomalies

- **Nulls:** 1 of 3 rows has null weather fields: Pune has `temperature_c`,
  `humidity`, `wind_kmh`, `condition`, and `weather_code` all null. This is the
  intentionally seeded row created when the forecast endpoint could not be
  retrieved. `city`, `country`, coordinates, and `created_at` are non-null for
  all rows.
- **Duplicate timestamps per city:** None. No `(city, created_at)` group has
  more than one row.
