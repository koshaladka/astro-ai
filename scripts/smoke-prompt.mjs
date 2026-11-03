import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith(".js")) out.push(path);
  }
  return out;
}

const serverDir = ".next/server";
if (!existsSync(serverDir)) {
  console.error("FAIL: .next/server missing — сначала npm run build");
  process.exit(1);
}

let foundPrompt = false;
let foundMdPath = false;
for (const file of walk(serverDir)) {
  const text = readFileSync(file, "utf8");
  if (text.includes("профессиональный астрологический консультант")) {
    foundPrompt = true;
  }
  if (text.includes("chart-interpretation.md")) {
    foundMdPath = true;
  }
}

if (!foundPrompt) {
  console.error("FAIL: промпт не вшит в .next");
  process.exit(1);
}
if (foundMdPath) {
  console.error("FAIL: в бандле всё ещё есть chart-interpretation.md");
  process.exit(1);
}

console.log("SMOKE_OK: промпт в бандле, md на диске не нужен");
