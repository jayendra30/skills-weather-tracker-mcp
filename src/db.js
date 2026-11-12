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
