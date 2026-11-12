import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const databasePath = resolve(dirname(fileURLToPath(import.meta.url)), '../weather.db');
const database = new Database(databasePath);

// Insert a single weather observation with bound values.
export function insertWeatherLog(weather) {
  const result = database.prepare(`
    INSERT INTO weather_logs
      (city, country, latitude, longitude, temperature_c, humidity, wind_kmh, condition, weather_code)
    VALUES
      (@city, @country, @latitude, @longitude, @temperature_c, @humidity, @wind_kmh, @condition, @weather_code)
  `).run(weather);

  return result.lastInsertRowid;
}

// Return the most recently logged observations, capped by the caller's limit.
export function listWeatherLogs(limit) {
  return database.prepare(`
    SELECT city, country, temperature_c, humidity, wind_kmh, condition, created_at
    FROM weather_logs
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Return latest temperature, average temperature, and log count for each city.
export function listCitySummaries() {
  return database.prepare(`
    WITH city_stats AS (
      SELECT city COLLATE NOCASE AS city_key,
             AVG(temperature_c) AS average_temperature,
             COUNT(*) AS log_count
      FROM weather_logs
      GROUP BY city COLLATE NOCASE
    ),
    latest_logs AS (
      SELECT city COLLATE NOCASE AS city_key,
             city,
             country,
             temperature_c AS latest_temperature,
             ROW_NUMBER() OVER (
               PARTITION BY city COLLATE NOCASE
               ORDER BY datetime(created_at) DESC, id DESC
             ) AS row_number
      FROM weather_logs
    )
    SELECT latest_logs.city,
           latest_logs.country,
           latest_logs.latest_temperature,
           city_stats.average_temperature,
           city_stats.log_count
    FROM latest_logs
    JOIN city_stats ON city_stats.city_key = latest_logs.city_key
    WHERE latest_logs.row_number = 1
    ORDER BY latest_logs.city COLLATE NOCASE
  `).all();
}

// Aggregate temperature and count for a city, matching without case sensitivity.
export function getCityStats(city) {
  return database.prepare(`
    SELECT
      MIN(temperature_c) AS min_temperature,
      MAX(temperature_c) AS max_temperature,
      AVG(temperature_c) AS average_temperature,
      COUNT(*) AS log_count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
