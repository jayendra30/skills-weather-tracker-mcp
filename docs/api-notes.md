# Open-Meteo API notes

## Geocoding

Request:

```text
GET https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1
```

The live response returned one match. These are the fields used for the log:

| JSON path | Value | `weather_logs` field |
|---|---:|---|
| `results[0].name` | `Pune` | `city` |
| `results[0].country` | `India` | `country` |
| `results[0].latitude` | `18.51957` | `latitude` |
| `results[0].longitude` | `73.85535` | `longitude` |

Trimmed live response:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

Request:

```text
GET https://api.open-meteo.com/v1/forecast?latitude=18.51957&longitude=73.85535&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
```

The requested `current` fields map as follows:

| JSON path | `weather_logs` field |
|---|---|
| `current.temperature_2m` | `temperature_c` |
| `current.relative_humidity_2m` | `humidity` |
| `current.wind_speed_10m` | `wind_kmh` |
| `current.weather_code` | `weather_code` |

The response has no textual condition field; `condition` requires mapping the
WMO weather code to a description. The forecast request could not be retrieved:
the Fetch MCP denied the URL under its robots policy, and a direct curl request
timed out. The following is the requested response shape, not a captured live
response; no weather values are inferred from it:

```json
{
  "current": {
    "temperature_2m": "<not retrieved>",
    "relative_humidity_2m": "<not retrieved>",
    "wind_speed_10m": "<not retrieved>",
    "weather_code": "<not retrieved>"
  }
}
```

Accordingly, the seeded Pune row contains the live geocoding values and `NULL`
for `temperature_c`, `humidity`, `wind_kmh`, `condition`, and `weather_code`.
