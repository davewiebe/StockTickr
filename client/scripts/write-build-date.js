// Writes the current build date into src/buildInfo.js so the client can show
// when it was last deployed. Runs automatically before `npm run build`.
const fs = require('fs');
const path = require('path');

const date = new Date().toISOString();
const out = path.join(__dirname, '..', 'src', 'buildInfo.js');
fs.writeFileSync(out, `// Auto-generated at build time. Do not edit.\nexport const BUILD_DATE = '${date}';\n`);
console.log(`[build] BUILD_DATE = ${date}`);
