// Writes src/buildInfo.json with the current git commit + date at build time.
// Runs automatically via the "prebuild" npm lifecycle before `npm run build`.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  // git not available (e.g. some CI checkouts) — fall back to 'dev'
}

const info = { commit, date: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'buildInfo.json'),
  JSON.stringify(info, null, 2) + '\n'
);
console.log('buildInfo:', info);
