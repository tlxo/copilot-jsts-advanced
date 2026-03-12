# Handoff: Implement Weather App

This document describes a weather application in detail so that an agent can implement it in a new repository. The goal is a fully working application with a clean layered architecture, a complete REST API, a static frontend dashboard, and — critically — GitHub Copilot exercise infrastructure (instructions, agents, exercises).

> **Reference implementation:** The JS/TS version of this app lives in the `copilot-jsts-advanced` repository and can be used as a reference for behavior, API contracts, and test coverage. When in doubt about a specification detail, the JS/TS implementation is the source of truth.

---

## 1. Purpose of the Project

This is **not** a production application. It is a **GitHub Copilot exercise environment** — a fully working weather service that serves as the substrate for a workshop teaching participants to build agentic workflows with GitHub Copilot: custom agents, skills, subagents, hooks, and MCP integration. The application code is complete and tested; the exercises focus on **extending** the tooling around it.

The implementation must be equally complete and tested before the workshop begins. Participants should never need to fix application bugs — they build Copilot tooling **around** a working codebase.

---

## 2. What the Application Does

- Fetches real-time weather data from the [OpenWeatherMap 2.5 API](https://openweathermap.org/current) (free plan)
- Manages a collection of saved locations (in-memory, no database)
- Serves a static HTML/JS dashboard with current weather, 5-day forecast charts (Chart.js), and custom threshold-based weather alerts
- Provides a clean REST API with full CRUD for locations and weather queries
- Provides interactive API docs (Swagger/OpenAPI) at `/docs`

---

## 3. Architecture — Layered Structure

The application uses a strict layered architecture. The implementing agent may choose any idiomatic web framework for the target language but **must** preserve these layers:

### 3.1 Layers

| Layer | Responsibility |
|-------|----------------|
| **Routers / Handlers** | HTTP request handling only. Validate input, call services, return responses. **No business logic.** |
| **Services** | Business logic. `WeatherService` orchestrates the API client and handles unit conversion. `OpenWeatherMapClient` handles all external HTTP communication. |
| **Repositories** | Data access. `LocationRepository` provides CRUD over an in-memory Map. No database. |
| **Models / Types** | Type definitions and validation schemas shared across all layers. Use the language's idiomatic validation library (Zod for TS, Pydantic for Python, struct tags + validator for Go, etc.). |
| **Utils** | Pure, stateless helper functions (temperature/wind converters). No side effects, no I/O. |
| **Dependencies / DI** | Dependency injection wiring. Factory functions or a container that creates settings, services, and repositories. Tests override these to inject mocks. |
| **Config** | Settings loaded from environment variables / `.env` file. |
| **Static Frontend** | Vanilla JS + CSS + HTML dashboard served by the backend as static files. |

### 3.2 Key Architectural Rules

- Routers/handlers **never** contain business logic.
- Services **never** return or raise HTTP errors — they throw/return domain errors.
- Routers/handlers or a global error handler catch domain errors and translate to HTTP responses.
- The repository is synchronous (in-memory Map).
- All HTTP-facing code (routers, services, API client) uses the language's async/concurrency model where appropriate.
- Custom domain errors form a hierarchy (see §5.5).
- Dependency injection allows tests to swap in mocks without touching production code.

---

## 4. API Surface

### 4.1 Weather Endpoints

| Method | Path | Query Params | Response | Description |
|--------|------|-------------|----------|-------------|
| GET | `/api/weather/current` | `lat` (float, -90..90, required), `lon` (float, -180..180, required), `units` (enum: celsius/fahrenheit/kelvin, default: celsius) | `CurrentWeather` | Current weather for coordinates |
| GET | `/api/weather/forecast` | `lat`, `lon`, `days` (int, 1..5, default: 5), `units` | `Forecast` | Multi-day daily forecast |
| GET | `/api/weather/alerts` | `lat`, `lon` | `WeatherAlert[]` | Custom threshold-based weather alerts |

### 4.2 Location Endpoints

| Method | Path | Body / Params | Response | Status |
|--------|------|--------------|----------|--------|
| GET | `/api/locations` | — | `Location[]` | 200 |
| POST | `/api/locations` | `{ name, lat, lon }` | `Location` | 201 |
| GET | `/api/locations/:id` | — | `Location` | 200 / 404 |
| PUT | `/api/locations/:id` | `{ name?, lat?, lon? }` | `Location` | 200 / 404 |
| DELETE | `/api/locations/:id` | — | — | 204 / 404 |
| GET | `/api/locations/:id/weather` | `units` | `CurrentWeather` | 200 / 404 |

### 4.3 Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves the dashboard HTML |
| GET | `/static/*` | Serves static assets (CSS, JS) |
| GET | `/docs` | Interactive Swagger/OpenAPI UI |
| GET | `/openapi.json` | OpenAPI spec as JSON |

---

## 5. Detailed Module Specifications

### 5.1 Models / Types

These are the data structures used across all layers. Field names in the API JSON responses use **camelCase** (matching the frontend expectations). Internal naming may follow language conventions.

#### Enums

```
TemperatureUnit: "celsius" | "fahrenheit" | "kelvin"
AlertSeverity: "low" | "medium" | "high" | "extreme"
```

#### Coordinates
```
{ lat: float (-90..90), lon: float (-180..180) }
```

#### Location
```
{
  id: UUID (auto-generated),
  name: string (1..200 chars),
  coordinates: Coordinates,
  createdAt: ISO 8601 datetime string (auto-generated)
}
```

#### LocationCreate (request body)
```
{ name: string (1..200 chars), lat: float (-90..90), lon: float (-180..180) }
```

#### LocationUpdate (request body, all fields optional)
```
{ name?: string (1..200 chars), lat?: float (-90..90), lon?: float (-180..180) }
```

#### CurrentWeather
```
{
  temperature: float,
  feelsLike: float,
  humidity: float (0..100),
  pressure: float,
  windSpeed: float (≥0),
  windDirection: int (0..360),
  description: string,
  icon: string,
  timestamp: int (unix epoch seconds),
  locationName: string,
  units: TemperatureUnit (default: "celsius")
}
```

#### ForecastDay
```
{
  date: string (YYYY-MM-DD),
  tempMin: float,
  tempMax: float,
  humidity: float (0..100),
  description: string,
  icon: string
}
```

#### Forecast
```
{
  locationName: string,
  units: TemperatureUnit (default: "celsius"),
  days: ForecastDay[]
}
```

#### WeatherAlert (threshold-based custom alerts)
```
{
  alertType: string,
  message: string,
  severity: AlertSeverity,
  value: float,
  threshold: float
}
```

### 5.2 Config / Settings

Load from environment variables or `.env` file:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENWEATHERMAP_API_KEY` | string | `""` | API key (empty string is valid for tests) |
| `OPENWEATHERMAP_BASE_URL` | string | `https://api.openweathermap.org/data/2.5` | OWM 2.5 API base URL (free plan) |
| `APP_NAME` | string | `"Weather App"` | Application name (used in Swagger docs) |
| `APP_PORT` | int | `3000` | HTTP server port |
| `DEBUG` | boolean | `false` | Debug mode |
| `ALERT_WIND_SPEED_THRESHOLD` | float | `20.0` | m/s — wind speed alert threshold |
| `ALERT_TEMP_HIGH_THRESHOLD` | float | `40.0` | °C — extreme heat threshold |
| `ALERT_TEMP_LOW_THRESHOLD` | float | `-20.0` | °C — extreme cold threshold |
| `ALERT_HUMIDITY_THRESHOLD` | float | `90.0` | % — high humidity threshold |

> **Note:** The `ALERT_*` thresholds are used by the weather service to generate custom alerts. When current weather values exceed these thresholds, the service returns `WeatherAlert` objects with appropriate severity levels.

### 5.3 OpenWeatherMap Client

An HTTP client wrapping the **OWM 2.5 API** (free plan). Uses two endpoints: `/data/2.5/weather` for current weather and `/data/2.5/forecast` for the 5-day/3-hour forecast.

#### Key behaviors

- All requests use `units=metric` (Celsius, m/s) — temperature conversion happens in the service layer.
- All requests include `appid` (API key) as a query parameter.
- Uses a **10-second timeout**.
- Validates API responses using the language's validation library (Zod schemas in TS, struct parsing in Go, etc.).

#### Methods

| Method | OWM endpoint | Returns |
|--------|-------------|---------|
| `getCurrentWeather(lat, lon)` | `/weather` | `OwmCurrentWeatherResponse` (includes `name`, `main`, `wind`, `weather[]`, `dt`) |
| `getForecast(lat, lon)` | `/forecast` | `OwmForecastResponse` (includes `list[]` of 3-hour intervals and `city.name`) |

Both methods:
1. Build the URL: `{baseUrl}/{endpoint}?lat={lat}&lon={lon}&units=metric&appid={key}`
2. Make the HTTP request with a 10-second timeout
3. On **network/timeout error** → throw `WeatherAPIConnectionError`
4. On **404** → throw `WeatherAPINotFoundError`
5. On **other non-200** → throw `WeatherAPIError(statusCode, responseBody)`
6. On success → validate/parse the JSON response and return it

#### City Name Handling

The 2.5 API returns a city `name` field directly in the response (unlike the 3.0 API which only returns a timezone). The service uses this name as the default `locationName`. When fetching weather for a saved location, the service passes the location's stored `name` instead.

### 5.4 Weather Service

Business logic layer. Depends on `OpenWeatherMapClient` and `Settings`.

#### Methods

- **`getCurrentWeather(lat, lon, units, locationName?)`** — Fetches current weather via client. Converts temperatures if `units ≠ celsius`. Uses the optional `locationName` if provided (for saved locations), otherwise uses the city name from the API response.

- **`getForecast(lat, lon, days, units, locationName?)`** — Fetches the 3-hour forecast via client, aggregates into daily summaries (group by date, min/max temp, average humidity, most common description/icon), slices to the requested number of `days`, converts temperatures. Same `locationName` logic.

- **`getAlerts(lat, lon)`** — Fetches current weather via client. Evaluates configured thresholds against the current conditions and returns `WeatherAlert[]`:
  - **high_wind**: wind speed ≥ threshold → `medium`; ≥ 1.5× threshold → `high`
  - **extreme_heat**: temp ≥ high threshold → `high`; ≥ high threshold + 5 → `extreme`
  - **extreme_cold**: temp ≤ low threshold → `high`; ≤ low threshold − 10 → `extreme`
  - **high_humidity**: humidity ≥ threshold → `low`

#### Temperature Conversion

The service has a helper function that converts from Celsius to the requested unit:
- `celsius` → no conversion (pass through)
- `fahrenheit` → `celsiusToFahrenheit()`
- `kelvin` → `celsiusToKelvin()`

This applies to all temperature fields: `temperature`, `feelsLike`, `tempMin`, `tempMax`.

### 5.5 Error Hierarchy

```
WeatherAppError (base)
├── WeatherAPIError (statusCode, message)
│   └── WeatherAPINotFoundError (message, statusCode=404)
├── WeatherAPIConnectionError (message)
└── LocationNotFoundError (locationId)
```

> In Go, these would be sentinel errors or typed error structs implementing the `error` interface. In languages with exceptions, use a class hierarchy.

Global error handlers map these to HTTP responses:

| Error Type | HTTP Status | Response |
|-----------|-------------|----------|
| Validation error (Zod, struct tags, etc.) | 422 | `{ error: "Validation error", details: [...] }` |
| `LocationNotFoundError` | 404 | `{ error: "Location not found: {id}" }` |
| `WeatherAPINotFoundError` | 404 | `{ error: "Weather data not found for the given location" }` |
| `WeatherAPIConnectionError` | 503 | `{ error: "{message}" }` |
| `WeatherAPIError` | 502 | `{ error: "{message}" }` |
| `WeatherAppError` | 500 | `{ error: "{message}" }` |
| Unexpected/unhandled | 500 | `{ error: "Internal server error" }` |

### 5.6 Converter Utilities

Pure functions, all in one file. No side effects, no I/O.

| Function | Formula | Rounding |
|----------|---------|----------|
| `celsiusToFahrenheit(c)` | `c * 9/5 + 32` | 2 decimals |
| `celsiusToKelvin(c)` | `c + 273.15` | 2 decimals |
| `fahrenheitToCelsius(f)` | `(f - 32) * 5/9` | 2 decimals |
| `mpsToKmh(mps)` | `mps * 3.6` | 2 decimals |
| `mpsToMph(mps)` | `mps * 2.23694` | 2 decimals |
| `degreesToCompass(deg)` | 16-point compass rose, sectors of 22.5° each, N centered at 0° | — |

Compass points (16, in order): N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW.

The compass function normalizes negative degrees, uses `round(degrees / 22.5) % 16` as the index.

**Rounding note:** Use `round(value * 100) / 100` or equivalent. Be careful with operator precedence — this was a bug source in the JS/TS implementation.

### 5.7 Location Repository

In-memory CRUD using a Map/dictionary keyed by UUID string.

| Method | Behavior |
|--------|----------|
| `add(data)` | Creates `Location` with auto-generated UUID and ISO 8601 timestamp, stores it. Returns the created location. |
| `get(id)` | Returns location or throws/returns `LocationNotFoundError`. |
| `listAll()` | Returns all locations sorted by `createdAt` ascending. |
| `delete(id)` | Removes location or throws/returns `LocationNotFoundError`. |
| `update(id, data)` | Partial update — only provided (non-null/non-zero) fields are changed. Throws if not found. Returns updated location. |

---

## 6. Frontend (Static Dashboard)

The frontend is **vanilla JS + CSS + HTML** — no frameworks, no build step, no bundler. It is served as static files by the backend.

> **The frontend files from the JS/TS version can be copied verbatim** since they only communicate with `/api/...` endpoints. Just serve the same static files from the new backend.

### Files

| File | Description |
|------|-------------|
| `index.html` | Semantic HTML with `<header>`, `<main>`, `<section>`, `<footer>`. All interactive elements have IDs used by JS. Loads Chart.js 4.x via CDN. |
| `style.css` | CSS custom properties on `:root`, mobile-first responsive design, system font stack, BEM-like semantic class names. |
| `app.js` | Organized in sections: State → DOM refs → API helpers (`apiGet`, `apiPost`, `apiDelete`) → Rendering functions → Event handlers → Initialization. Uses `fetch`, `async/await`. |

### Dashboard Features

- Coordinate search form (latitude, longitude, unit selector dropdown)
- Current weather card (temperature, feels-like, humidity, pressure, wind, description, icon)
- 5-day forecast line chart (Chart.js — high/low temperature lines)
- Custom threshold-based weather alerts section (color-coded by severity)
- Saved locations sidebar with add (name + coordinates) and delete buttons
- Click a saved location to load its weather

---

## 7. Testing Strategy

### 7.1 General Principles

- **No real API calls — ever.** Unit tests mock at the service boundary; integration tests mock the OWM client.
- Tests are complete and passing before the workshop.
- Test data comes from centralized factory functions, not inline raw objects.
- Each test verifies exactly one behavior (AAA pattern: Arrange → Act → Assert).

### 7.2 Test Structure

```
tests/
├── setup / helpers        — Shared test utilities: test settings, test app factory
├── factories              — Test data factory functions for all models + OWM responses
├── unit/
│   ├── converters         — Pure function tests (parametrized/table-driven)
│   ├── models             — Validation/parsing tests
│   ├── location_repo      — Repository CRUD tests
│   └── weather_service    — Service logic with mocked API client
├── integration/
│   ├── weather_api        — Full /api/weather/* endpoint tests via HTTP
│   └── locations_api      — Full /api/locations/* CRUD tests via HTTP
└── e2e/
    └── dashboard          — Playwright browser tests for the frontend
```

### 7.3 Test Framework

Use the language's standard/popular test framework:
- **Go:** `testing` + `testify` + `httptest`
- **JS/TS:** Vitest + supertest
- **Python:** pytest + httpx

The test runner must support: async tests, table-driven/parametrized tests, filtering (unit vs integration), and HTTP testing against the app.

### 7.4 Frontend Testing with Playwright

Include **Playwright** end-to-end tests for the frontend dashboard. Playwright tests should cover:
- Loading the dashboard
- Searching for coordinates and seeing weather results
- Saving/deleting locations
- Forecast chart rendering
- Alert display

Playwright config should use a `webServer` directive to start the app before tests run.

### 7.5 Factory Functions

All factory functions accept partial overrides (options/kwargs) to customize any field. Defaults produce **valid, realistic data**.

| Factory | Purpose | Defaults |
|---------|---------|----------|
| `makeCoordinates()` | Default coordinates | London (51.51, -0.13) |
| `makeLocation()` | Full location with UUID and timestamp | London, generated UUID, current time |
| `makeLocationCreate()` | Request body for POST | London |
| `makeLocationUpdate()` | Request body for PUT (all optional) | Name override only |
| `makeCurrentWeather()` | Domain-level current weather | 15°C, 72% humidity, London |
| `makeForecastDay()` | Single forecast day | Tomorrow, 10-18°C, scattered clouds |
| `makeForecast()` | Multi-day forecast | 3 days, London, celsius |
| `makeWeatherAlert()` | Single threshold-based alert | High wind, medium severity |
| `makeOwmCurrentWeatherResponse()` | Raw OWM 2.5 `/weather` response | Matches 2.5 current weather schema |
| `makeOwmForecastItem()` | Raw OWM 2.5 `/forecast` list entry | Single 3-hour forecast interval |
| `makeOwmForecastResponse()` | Full OWM 2.5 `/forecast` response | 3 days of 3-hour intervals |

### 7.6 Unit Tests — What to Test

| Module | Tests |
|--------|-------|
| Converters | All conversion functions with known input/output pairs, edge cases (0, negative, -40 crossover), rounding to 2 decimals. Parametrized/table-driven. Compass: all 16 directions, boundary values (0°, 11.25°, 348.75°, 360°), negative degrees. |
| Models/Validation | Valid/invalid inputs, boundary values (-90/90 for lat, -180/180 for lon), enum validation, default values, partial updates (LocationUpdate with all combinations). |
| Location Repo | CRUD operations: add returns UUID + timestamp, get existing, get non-existent throws, listAll sorted by createdAt, delete existing, delete non-existent throws, update partial fields, update non-existent throws, multiple entries with unique IDs. |
| Weather Service | Unit conversion for all 3 units (celsius passthrough, fahrenheit, kelvin). Non-temperature fields unchanged after conversion. Forecast daily aggregation from 3-hour intervals. Forecast day slicing (request 3 of 5 days). Location name from API response. Location name override parameter. Threshold-based alerts: no alerts when under thresholds, high_wind at medium/high severity, extreme_heat at high/extreme severity, extreme_cold at high/extreme severity, high_humidity at low severity, multiple alerts when multiple thresholds exceeded. |

### 7.7 Integration Tests — What to Test

| Endpoint | Tests |
|----------|-------|
| GET /api/weather/current | 200 with valid coords (celsius default), 200 with fahrenheit conversion, 422 for missing params, 422 for invalid lat (out of range), 404 when OWM returns 404, 502 on OWM server error |
| GET /api/weather/forecast | 200 with forecast data, `days` param limits results, 422 for days out of range (0 or 6), kelvin temperature conversion |
| GET /api/weather/alerts | 200 with empty alerts (no thresholds exceeded), 200 with multiple threshold-based alerts |
| POST /api/locations | 201 valid creation, 422 invalid lat, 422 empty name, multiple creates produce unique IDs |
| GET /api/locations | 200 empty list, 200 after creating locations |
| GET /api/locations/:id | 200 existing, 404 non-existent UUID |
| PUT /api/locations/:id | 200 update name only, 200 update coordinates, 404 non-existent |
| DELETE /api/locations/:id | 204 existing, 404 non-existent, verify GET returns 404 after delete |
| GET /api/locations/:id/weather | 200 with mocked OWM (uses location name not timezone), 404 non-existent location |

---

## 8. Copilot Infrastructure (CRITICAL)

This is the most important part. The project is a vehicle for teaching Copilot agentic workflows. The following infrastructure **must** be present and adapted for the target language.

### 8.1 Directory Structure for Copilot Customization

```
.github/
├── copilot-instructions.md          — Always-on project-level context
├── instructions/
│   ├── {language}.instructions.md   — Coding conventions for source code (applyTo: src/**)
│   ├── testing.instructions.md      — Testing conventions (applyTo: tests/**)
│   └── frontend.instructions.md     — Frontend conventions (applyTo: public/**)
└── agents/
    └── teacher.agent.md             — Exercise Tutor agent
```

### 8.2 `copilot-instructions.md` (Always-on)

Must cover:
- Project overview (Copilot exercise environment, not a production app)
- Architecture description (layers, responsibilities)
- Key conventions (language-specific syntax, lint/format tool, naming)
- Concurrency/async patterns
- Custom domain errors
- Testing overview (framework, no real API calls)
- Dependency table (framework, HTTP client, validation lib, test stack)
- Run commands (install, test, lint, format, dev server)

### 8.3 Language-specific instructions (`{language}.instructions.md`)

Must cover:
- Language version and module system
- Type safety rules (strict typing, no `any`/`interface{}` abuse)
- Formatting/linting tools
- Naming conventions (adapted to language: camelCase, snake_case, PascalCase as appropriate)
- Layer responsibilities (same rules, language-adapted syntax examples)
- Concurrency patterns
- Error handling (domain errors → HTTP error mapping)
- Dependency injection pattern
- Validation approach

### 8.4 `testing.instructions.md`

Must cover:
- Test framework and configuration
- Test organization (unit/ vs integration/ vs e2e/)
- How to run specific test subsets
- Test naming conventions
- AAA pattern
- Factory usage (always use factories, never inline raw objects)
- Mocking strategy: unit tests mock at service boundary, integration tests mock the OWM client
- Dependency overrides for testing
- Running commands

### 8.5 `frontend.instructions.md`

Describes the vanilla JS/CSS/HTML conventions of the static frontend. This is largely language-agnostic since the frontend is the same across all implementations. Note:
- No build step, no framework, vanilla JS
- CSS custom properties for theming
- Chart.js via CDN
- Playwright for e2e testing

### 8.6 `teacher.agent.md`

The Exercise Tutor agent must:
- Reference `EXERCISES.md`
- **Never** write code for participants — guide only
- Know about Copilot concepts: skills, hooks, agents, instructions, MCP
- Reference the correct run commands for the target language
- Point participants to existing files as examples

---

## 9. Project Configuration

### 9.1 Build & Run

The project must have standard lifecycle commands. Map these to the target language's package manager / build tool:

| Command | Purpose |
|---------|---------|
| Install dependencies | Download/install all packages |
| Dev server | Start with hot reload / file watching |
| Build | Compile / type-check |
| Start | Run compiled output |
| Test (all) | Run unit + integration tests |
| Test (unit) | Run only unit tests |
| Test (integration) | Run only integration tests |
| Test (e2e) | Run Playwright tests |
| Lint | Run linter |
| Format | Run formatter |

### 9.2 `.env.example`

```env
# OpenWeatherMap API key — get one at https://openweathermap.org/appid
OPENWEATHERMAP_API_KEY=
OPENWEATHERMAP_BASE_URL=https://api.openweathermap.org/data/2.5
APP_NAME=Weather App
APP_PORT=3000
DEBUG=false

# Alert thresholds (used for custom threshold-based alerting)
ALERT_WIND_SPEED_THRESHOLD=20.0
ALERT_TEMP_HIGH_THRESHOLD=40.0
ALERT_TEMP_LOW_THRESHOLD=-20.0
ALERT_HUMIDITY_THRESHOLD=90.0
```

---

## 10. README.md

The README must include:
- Purpose section (Copilot exercise environment)
- Exercises reference (link to EXERCISES.md)
- What It Does
- Tech Stack table
- Quick Start (get API key, install, configure `.env`, run)
- Run Tests
- Lint & Format
- Project Structure (directory tree)
- API Endpoints tables (weather + locations)
- Copilot Custom Instructions section explaining the layered instruction system
- Backlog section

---

## 11. What NOT to Do

- **Do NOT write or customize EXERCISES.md.** Include a placeholder with a "needs customization" banner. The user will handle exercises later.
- **Do NOT add a database.** The in-memory repository is intentional.
- **Do NOT add authentication.** The app is for workshop use only.
- **Do NOT add a build step for the frontend.** It must remain vanilla JS served as static files.
- **Do implement custom threshold-based alerts.** The OWM 2.5 free plan does not include government alerts. Use the `ALERT_*` threshold settings to generate custom alerts from current weather data.

---

## 12. Checklist for the Implementing Agent

### Application
- [ ] Initialize project with build tool, dependency management, linter, formatter
- [ ] Implement config/settings loading from env vars / `.env` file
- [ ] Implement model/type definitions with runtime validation
- [ ] Implement domain error hierarchy
- [ ] Implement converter utility functions (pure, stateless)
- [ ] Implement `LocationRepository` (in-memory CRUD with Map)
- [ ] Implement `OpenWeatherMapClient` (2.5 API: `/weather` + `/forecast` endpoints)
- [ ] Implement `WeatherService` (unit conversion, forecast aggregation, threshold-based alerts)
- [ ] Implement weather router/handler (3 GET endpoints)
- [ ] Implement locations router/handler (6 endpoints including `/:id/weather`)
- [ ] Implement dependency injection / container wiring
- [ ] Implement global error handler (domain errors → HTTP status mapping)
- [ ] Implement app factory with static file serving and root route
- [ ] Set up Swagger/OpenAPI docs endpoint at `/docs`

### Frontend
- [ ] Copy frontend files (index.html, style.css, app.js) from the JS/TS reference version
- [ ] Verify static file serving works (dashboard loads, assets served)

### Tests
- [ ] Set up test framework with unit/integration/e2e separation
- [ ] Implement all factory functions (domain models + OWM response shapes)
- [ ] Implement unit tests: converters, models/validation, location repo, weather service
- [ ] Implement integration tests: all weather and location endpoints
- [ ] Set up Playwright for frontend e2e tests
- [ ] Implement Playwright e2e tests

### Quality
- [ ] Set up linter and formatter
- [ ] Verify lint passes with zero errors
- [ ] Verify all unit + integration tests pass
- [ ] Verify the app starts and serves the dashboard at `/`
- [ ] Verify API docs load at `/docs`

### Copilot Infrastructure
- [ ] Write `.github/copilot-instructions.md`
- [ ] Write `.github/instructions/{language}.instructions.md`
- [ ] Write `.github/instructions/testing.instructions.md`
- [ ] Write `.github/instructions/frontend.instructions.md`
- [ ] Write `.github/agents/teacher.agent.md`
- [ ] Write README.md
- [ ] Create EXERCISES.md placeholder (with "needs customization" banner)
- [ ] Create `.env.example`

---

## Appendix A: Suggested File Structure

The exact structure depends on language conventions. Here is a suggested layout:

| Module | Suggested Path | Purpose |
|--------|---------------|---------|
| Entry point | `main.*` or `cmd/server/main.*` | Starts the HTTP server |
| App factory | `app.*` or `internal/app.*` | Wires together middleware, routes, error handler |
| Config | `config.*` or `internal/config.*` | Loads settings from env / `.env` |
| Models/Types | `models.*` or `internal/models.*` | Type definitions + validation schemas |
| DI Container | `dependencies.*` or `internal/container.*` | Factory for settings → services → app |
| Weather router | `routers/weather.*` or `internal/handlers/weather.*` | 3 GET endpoints |
| Locations router | `routers/locations.*` or `internal/handlers/locations.*` | 6 CRUD + weather endpoints |
| OWM Client | `services/openweathermap.*` | HTTP client for OWM 2.5 API |
| Weather Service | `services/weather_service.*` | Business logic |
| Exceptions/Errors | `services/exceptions.*` or `internal/errors.*` | Domain error types |
| Location Repo | `repositories/location_repo.*` | In-memory Map CRUD |
| Converters | `utils/converters.*` | Pure conversion functions |
| Frontend | `public/` or `static/` | index.html, style.css, app.js |
| Test setup | `tests/setup.*` or `*_test.go` | Test helpers, mock factories |
| Test factories | `tests/factories.*` | All factory functions |
| Unit tests | `tests/unit/` | Converter, model, repo, service tests |
| Integration tests | `tests/integration/` | HTTP endpoint tests |
| E2E tests | `tests/e2e/` | Playwright browser tests |

---

## Appendix B: OpenWeatherMap One Call API 3.0 Response Shapes

The client calls `GET /data/3.0/onecall` with an `exclude` parameter to request only the needed sections. The response shape (with all sections included):

```json
{
  "lat": 51.51,
  "lon": -0.13,
  "timezone": "Europe/London",
  "timezone_offset": 3600,
  "current": {
    "dt": 1718452800,
    "temp": 15.0,
    "feels_like": 13.5,
    "pressure": 1013,
    "humidity": 72,
    "wind_speed": 5.5,
    "wind_deg": 220,
    "weather": [
      { "id": 802, "main": "Clouds", "description": "scattered clouds", "icon": "03d" }
    ]
  },
  "daily": [
    {
      "dt": 1718452800,
      "temp": { "min": 10.0, "max": 18.0, "day": 15.0, "night": 11.0, "eve": 14.0, "morn": 12.0 },
      "humidity": 65,
      "weather": [
        { "id": 500, "main": "Rain", "description": "light rain", "icon": "10d" }
      ]
    }
  ],
  "alerts": [
    {
      "sender_name": "Met Office",
      "event": "Yellow Wind Warning",
      "start": 1718452800,
      "end": 1718496000,
      "description": "Strong winds expected across southern England...",
      "tags": ["Wind"]
    }
  ]
}
```

### Key points for parsing and test factories:

- **`current`**: Single object. Temperature fields are floats in Celsius (metric). `weather` is an array but always has at least one entry — use the first.
- **`daily`**: Array of daily forecasts. `temp` is a nested object with `min`/`max`/`day`/`night`/`eve`/`morn`. Pre-aggregated (no 3-hour interval aggregation needed, unlike API 2.5).
- **`alerts`**: Array of government weather alerts. May be absent or empty. Fields use snake_case — the service maps to camelCase.
- **`timezone`**: String like `"Europe/London"`. Used to derive `locationName` when not provided.
- Sections excluded via the `exclude` parameter will be absent from the response.
