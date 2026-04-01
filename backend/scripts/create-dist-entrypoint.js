"use strict";

const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const sourceEntry = path.join(distDir, "src", "main.js");
const compatibilityEntry = path.join(distDir, "main.js");

if (!fs.existsSync(sourceEntry)) {
  console.warn(
    `[postbuild] Skipping dist/main.js compatibility entrypoint because ${sourceEntry} was not found.`,
  );
  process.exit(0);
}

fs.writeFileSync(
  compatibilityEntry,
  "\"use strict\";\nrequire(\"./src/main.js\");\n",
  "utf8",
);

console.log(`[postbuild] Wrote compatibility entrypoint to ${compatibilityEntry}`);
