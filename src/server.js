import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  insertWeatherLog,
  listCitySummaries,
  listWeatherLogs,
} from './db.js';
import { getCurrentWeather, UnknownCityError } from './weather.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
const INDEX_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../public/index.html');

// Send a JSON response with consistent headers.
function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

// Serve the dashboard HTML document.
async function serveDashboard(response) {
  try {
    const fileInfo = await stat(INDEX_PATH);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': fileInfo.size,
    });
    createReadStream(INDEX_PATH).pipe(response);
  } catch (error) {
    console.error('Could not read dashboard HTML:', error);
    sendJson(response, 500, { error: 'Dashboard is temporarily unavailable.' });
  }
}

// Route dashboard API and document requests.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && requestUrl.pathname === '/') {
    await serveDashboard(response);
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/logs') {
    sendJson(response, 200, listWeatherLogs(50));
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/summary') {
    sendJson(response, 200, listCitySummaries());
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/refresh') {
    const city = requestUrl.searchParams.get('city')?.trim();
    if (!city) {
      sendJson(response, 400, { error: 'Provide a city query parameter.' });
      return;
    }

    try {
      const weather = await getCurrentWeather(city);
      const id = insertWeatherLog(weather);
      sendJson(response, 201, { id, ...weather });
    } catch (error) {
      if (error instanceof UnknownCityError) {
        sendJson(response, 404, { error: error.message });
      } else {
        console.error('Could not refresh weather:', error);
        sendJson(response, 502, { error: error.message });
      }
    }
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error('Request failed:', error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'The request could not be completed.' });
    } else {
      response.destroy(error);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Weather dashboard listening at http://localhost:${PORT}`);
});
