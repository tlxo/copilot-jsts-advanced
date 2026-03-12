// Suppress DEP0169 warning from swagger-jsdoc's transitive dependency
// (@apidevtools/json-schema-ref-parser) which uses the deprecated url.resolve().
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  if (typeof warning === 'string' && warning.includes('url.parse()')) return;
  return (originalEmitWarning as (...a: unknown[]) => void).call(process, warning, ...args);
}) as typeof process.emitWarning;

import { loadSettings } from './config.js';
import { createContainer } from './dependencies.js';
import { createApp } from './app.js';

const settings = loadSettings();
const container = createContainer(settings);
const app = createApp(container);

app.listen(settings.appPort, () => {
  console.log(`${settings.appName} running at http://localhost:${settings.appPort}`);
  console.log(`API docs at http://localhost:${settings.appPort}/docs`);
});
