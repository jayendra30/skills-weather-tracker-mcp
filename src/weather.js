const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code';
const REQUEST_TIMEOUT_MS = 15_000;

// Identify a city lookup that returned no geocoding results.
export class UnknownCityError extends Error {}

// Fetch JSON from Open-Meteo and convert network or response errors to readable messages.
async function fetchJson(url, label) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error(`Could not reach Open-Meteo for ${label}. Check your network connection and try again.`);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo ${label} request failed (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Open-Meteo returned invalid JSON for ${label}.`);
  }
}

// Map Open-Meteo WMO weather codes to concise condition labels.
export function conditionFromWeatherCode(code) {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code === 95 || code === 96 || code === 99) return 'thunderstorm';
  return 'unknown';
}

// Geocode a city and retrieve its current weather from Open-Meteo.
export async function getCurrentWeather(city) {
  const geocodingUrl = new URL(GEOCODING_URL);
  geocodingUrl.searchParams.set('name', city);
  geocodingUrl.searchParams.set('count', '1');
  const geocodingData = await fetchJson(geocodingUrl, 'geocoding');

  if (!Array.isArray(geocodingData.results) || geocodingData.results.length === 0) {
    throw new UnknownCityError(`Unknown city: "${city}". Check the spelling and try again.`);
  }

  const location = geocodingData.results[0];
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error('Open-Meteo returned incomplete location coordinates.');
  }

  const forecastUrl = new URL(FORECAST_URL);
  forecastUrl.searchParams.set('latitude', String(location.latitude));
  forecastUrl.searchParams.set('longitude', String(location.longitude));
  forecastUrl.searchParams.set('current', CURRENT_FIELDS);
  const forecastData = await fetchJson(forecastUrl, 'current weather');
  const current = forecastData.current;

  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.wind_speed_10m) ||
    !Number.isInteger(current.weather_code)
  ) {
    throw new Error('Open-Meteo returned incomplete current weather data.');
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: conditionFromWeatherCode(current.weather_code),
    weather_code: current.weather_code,
  };
}
