import { getCityStats, insertWeatherLog, listWeatherLogs } from './db.js';
import { getCurrentWeather } from './weather.js';

const DEFAULT_LIMIT = 10;

// Format nullable numeric values for CLI output.
function formatNumber(value, digits = 1) {
  return value == null ? '-' : Number(value).toFixed(digits);
}

// Print observations as a readable, fixed-width table.
function printTable(rows) {
  const columns = [
    ['City', (row) => row.city],
    ['Country', (row) => row.country ?? '-'],
    ['Temp C', (row) => formatNumber(row.temperature_c)],
    ['Humidity %', (row) => formatNumber(row.humidity, 0)],
    ['Wind km/h', (row) => formatNumber(row.wind_kmh)],
    ['Condition', (row) => row.condition ?? '-'],
    ['Logged at', (row) => row.created_at],
  ];
  const values = rows.map((row) => columns.map(([, getValue]) => String(getValue(row))));
  const widths = columns.map(([heading], columnIndex) =>
    Math.max(heading.length, ...values.map((row) => row[columnIndex].length)),
  );
  const formatRow = (cells) => cells.map((cell, index) => cell.padEnd(widths[index])).join(' | ');
  const divider = widths.map((width) => '-'.repeat(width)).join('-+-');

  console.log([formatRow(columns.map(([heading]) => heading)), divider, ...values.map(formatRow)].join('\n'));
}

// Parse the supported optional list limit.
function parseLimit(args) {
  if (args.length === 0) return DEFAULT_LIMIT;
  if (args.length !== 2 || args[0] !== '--limit') {
    throw new Error('Usage: node src/cli.js list [--limit N]');
  }

  const limit = Number(args[1]);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive whole number.');
  }
  return limit;
}

// Add one live weather observation to the database.
async function addCity(city) {
  if (!city.trim()) throw new Error('Please provide a city name.');
  const weather = await getCurrentWeather(city.trim());
  const id = insertWeatherLog(weather);
  console.log(
    `Logged ${weather.city}, ${weather.country}: ${weather.temperature_c.toFixed(1)} C, ` +
      `${weather.condition} (row ${id}).`,
  );
}

// List recent weather observations.
function listCities(limit) {
  const rows = listWeatherLogs(limit);
  if (rows.length === 0) {
    console.log('No weather logs found.');
    return;
  }
  printTable(rows);
}

// Display temperature aggregates and log count for one city.
function showCityStats(city) {
  if (!city.trim()) throw new Error('Please provide a city name.');
  const stats = getCityStats(city.trim());
  if (stats.log_count === 0) {
    console.log(`No weather logs found for "${city}".`);
    return;
  }

  console.log(`Weather stats for ${city}:`);
  console.log(`  Logs: ${stats.log_count}`);
  console.log(`  Min temperature: ${formatNumber(stats.min_temperature)} C`);
  console.log(`  Max temperature: ${formatNumber(stats.max_temperature)} C`);
  console.log(`  Average temperature: ${formatNumber(stats.average_temperature)} C`);
}

// Dispatch a CLI command and print user-friendly errors without a stack trace.
async function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'add' && args.length === 1) {
      await addCity(args[0]);
    } else if (command === 'list') {
      listCities(parseLimit(args));
    } else if (command === 'stats' && args.length === 1) {
      showCityStats(args[0]);
    } else {
      throw new Error(
        'Usage:\n  node src/cli.js add "<city>"\n  node src/cli.js list [--limit N]\n  node src/cli.js stats "<city>"',
      );
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
