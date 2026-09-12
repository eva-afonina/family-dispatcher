import { readFile, writeFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const edgePath = new URL("supabase/functions/family-dispatcher/index.ts", projectRoot);
const source = await readFile(edgePath, "utf8");
const marker = "const SUPABASE_URL";
const tailIndex = source.indexOf(marker);

if (tailIndex < 0) {
  throw new Error("Edge Function marker not found");
}

const assets = await Promise.all([
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icon.svg",
].map((name) => readFile(new URL(name, projectRoot), "utf8")));

const [indexHtml, stylesCss, appJs, manifest, iconSvg] = assets;
const header = [
  'import { createClient } from "npm:@supabase/supabase-js@2.116.0";',
  "",
  `const INDEX_HTML = ${JSON.stringify(indexHtml)};`,
  `const STYLES_CSS = ${JSON.stringify(stylesCss)};`,
  `const APP_JS = ${JSON.stringify(appJs)};`,
  `const MANIFEST = ${JSON.stringify(manifest)};`,
  `const ICON_SVG = ${JSON.stringify(iconSvg)};`,
  "",
].join("\n");

await writeFile(edgePath, header + source.slice(tailIndex), "utf8");
