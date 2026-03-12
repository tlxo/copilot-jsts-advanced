// ── State ──────────────────────────────────────────────────────────────────────

let forecastChart = null;

// ── DOM References ────────────────────────────────────────────────────────────

const searchForm = document.getElementById('search-form');
const searchLat = document.getElementById('search-lat');
const searchLon = document.getElementById('search-lon');
const searchUnits = document.getElementById('search-units');
const searchButton = document.getElementById('search-button');

const currentWeatherSection = document.getElementById('current-weather');
const currentLocation = document.getElementById('current-location');
const currentIcon = document.getElementById('current-icon');
const currentTemp = document.getElementById('current-temp');
const currentFeelsLike = document.getElementById('current-feels-like');
const currentHumidity = document.getElementById('current-humidity');
const currentPressure = document.getElementById('current-pressure');
const currentWind = document.getElementById('current-wind');
const currentDescription = document.getElementById('current-description');

const forecastSection = document.getElementById('forecast-section');
const forecastCanvas = document.getElementById('forecast-chart');

const alertsSection = document.getElementById('alerts-section');
const alertsList = document.getElementById('alerts-list');

const locationForm = document.getElementById('location-form');
const locationName = document.getElementById('location-name');
const locationLat = document.getElementById('location-lat');
const locationLon = document.getElementById('location-lon');
const locationsList = document.getElementById('locations-list');

// ── API Helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
}

// ── Unit Helpers ──────────────────────────────────────────────────────────────

function unitSymbol(units) {
  switch (units) {
    case 'fahrenheit': return '°F';
    case 'kelvin': return 'K';
    default: return '°C';
  }
}

function weatherIconUrl(icon) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderCurrentWeather(data) {
  currentWeatherSection.hidden = false;
  currentLocation.textContent = data.locationName;
  currentIcon.src = weatherIconUrl(data.icon);
  currentIcon.alt = data.description;
  currentTemp.textContent = `${Math.round(data.temperature)}${unitSymbol(data.units)}`;
  currentFeelsLike.textContent = `${Math.round(data.feelsLike)}${unitSymbol(data.units)}`;
  currentHumidity.textContent = data.humidity;
  currentPressure.textContent = data.pressure;
  currentWind.textContent = `${data.windSpeed} m/s (${data.windDirection}°)`;
  currentDescription.textContent = data.description;
}

function renderForecast(data) {
  forecastSection.hidden = false;
  const symbol = unitSymbol(data.units);
  const labels = data.days.map(d => d.date);
  const highs = data.days.map(d => d.tempMax);
  const lows = data.days.map(d => d.tempMin);

  if (forecastChart) {
    forecastChart.destroy();
  }

  forecastChart = new Chart(forecastCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `High (${symbol})`,
          data: highs,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: false,
          tension: 0.3,
        },
        {
          label: `Low (${symbol})`,
          data: lows,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
      },
      scales: {
        y: {
          title: { display: true, text: `Temperature (${symbol})` },
        },
      },
    },
  });
}

function renderAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    alertsSection.hidden = true;
    return;
  }

  alertsSection.hidden = false;
  alertsList.innerHTML = '';

  for (const alert of alerts) {
    const cssClass = severityCssClass(alert.severity);
    const el = document.createElement('div');
    el.className = `alert alert--${cssClass}`;
    el.innerHTML = `
      <div class="alert__title">${escapeHtml(alert.alertType.replace(/_/g, ' '))}</div>
      <div class="alert__sender">${escapeHtml(alert.severity)}</div>
      <div class="alert__description">${escapeHtml(alert.message)}</div>
    `;
    alertsList.appendChild(el);
  }
}

function severityCssClass(severity) {
  switch (severity) {
    case 'extreme':
    case 'high': return 'danger';
    case 'medium': return 'warning';
    default: return 'info';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderLocations(locations) {
  locationsList.innerHTML = '';
  for (const loc of locations) {
    const li = document.createElement('li');
    li.className = 'location-item';
    li.innerHTML = `
      <div class="location-item__info" data-lat="${loc.coordinates.lat}" data-lon="${loc.coordinates.lon}">
        <div class="location-item__name">${escapeHtml(loc.name)}</div>
        <div class="location-item__coords">${loc.coordinates.lat.toFixed(2)}, ${loc.coordinates.lon.toFixed(2)}</div>
      </div>
      <button class="location-item__delete" data-id="${loc.id}" title="Delete">&times;</button>
    `;
    locationsList.appendChild(li);
  }
}

// ── Event Handlers ────────────────────────────────────────────────────────────

async function handleSearch(e) {
  e.preventDefault();
  const lat = parseFloat(searchLat.value);
  const lon = parseFloat(searchLon.value);
  const units = searchUnits.value;

  searchButton.disabled = true;
  searchButton.textContent = 'Loading…';

  try {
    const [weather, forecast, alerts] = await Promise.all([
      apiGet(`/api/weather/current?lat=${lat}&lon=${lon}&units=${units}`),
      apiGet(`/api/weather/forecast?lat=${lat}&lon=${lon}&units=${units}`),
      apiGet(`/api/weather/alerts?lat=${lat}&lon=${lon}`),
    ]);
    renderCurrentWeather(weather);
    renderForecast(forecast);
    renderAlerts(alerts);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = 'Search';
  }
}

async function handleAddLocation(e) {
  e.preventDefault();
  try {
    await apiPost('/api/locations', {
      name: locationName.value,
      lat: parseFloat(locationLat.value),
      lon: parseFloat(locationLon.value),
    });
    locationForm.reset();
    await loadLocations();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function handleLocationClick(e) {
  const info = e.target.closest('.location-item__info');
  if (info) {
    searchLat.value = info.dataset.lat;
    searchLon.value = info.dataset.lon;
    searchForm.dispatchEvent(new Event('submit'));
    return;
  }

  const deleteBtn = e.target.closest('.location-item__delete');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    try {
      await apiDelete(`/api/locations/${id}`);
      await loadLocations();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }
}

// ── Initialization ────────────────────────────────────────────────────────────

async function loadLocations() {
  try {
    const locations = await apiGet('/api/locations');
    renderLocations(locations);
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

searchForm.addEventListener('submit', handleSearch);
locationForm.addEventListener('submit', handleAddLocation);
locationsList.addEventListener('click', handleLocationClick);

loadLocations();
