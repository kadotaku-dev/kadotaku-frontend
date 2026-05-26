import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.kadotaku.fr";
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=licences";

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const indexPath = path.join(root, "index.html");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim()));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugLicence(licence) {
  return licence.toLowerCase().replaceAll(" ", "-");
}

function licenceUrl(licence) {
  return `${SITE_URL}/licence/${encodeURI(slugLicence(licence))}`;
}

function pageDescription(licence) {
  return `Découvrez les meilleures idées cadeaux ${licence} : figurines, goodies, mugs, peluches, posters et produits dérivés pour fans d'anime et de manga.`;
}

function pageTitle(licence) {
  return `Cadeaux ${licence} | Figurines, goodies et idées cadeaux - Kadotaku`;
}

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Tag introuvable pour ${replacement.slice(0, 40)}`);
  }
  return html.replace(pattern, replacement);
}

function buildLicenceHtml(baseHtml, licence) {
  const title = pageTitle(licence);
  const description = pageDescription(licence);
  const canonical = licenceUrl(licence);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Cadeaux ${licence}`,
    url: canonical,
    description,
    isPartOf: {
      "@type": "WebSite",
      name: "Kadotaku",
      url: `${SITE_URL}/`,
    },
  };

  let html = baseHtml;

  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>\n${escapeHtml(title)}\n</title>`,
  );

  html = replaceTag(
    html,
    /<meta\s+id="metaDescription"\s+name="description"\s+content="[^"]*"\s*>/i,
    `<meta\n    id="metaDescription"\n    name="description"\ncontent="${escapeHtml(description)}">`,
  );

  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
  );

  html = html.replace(
    /<meta property="og:site_name" content="Kadotaku">/i,
    `<meta property="og:site_name" content="Kadotaku">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${escapeHtml(canonical)}">`,
  );

  html = replaceTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
  );

  html = html.replace(
    /<div class="loading-message">\s*Chargement des produits\.\.\.\s*<\/div>/i,
    `<div class="loading-message">\n        <h1>Cadeaux ${escapeHtml(licence)}</h1>\n        <p>${escapeHtml(description)}</p>\n        Chargement des produits...\n    </div>`,
  );

  return html;
}

function buildCatalogueHtml(baseHtml) {
  const title = "Catalogue Kadotaku | Cadeaux anime, manga, figurines et goodies";
  const description =
    "Explorez le catalogue Kadotaku : figurines, goodies, mugs, peluches, posters et idées cadeaux pour fans d'anime et de manga.";
  const canonical = `${SITE_URL}/catalogue`;

  let html = baseHtml;

  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>\n${escapeHtml(title)}\n</title>`,
  );

  html = replaceTag(
    html,
    /<meta\s+id="metaDescription"\s+name="description"\s+content="[^"]*"\s*>/i,
    `<meta\n    id="metaDescription"\n    name="description"\ncontent="${escapeHtml(description)}">`,
  );

  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
  );

  html = html.replace(
    /<meta property="og:site_name" content="Kadotaku">/i,
    `<meta property="og:site_name" content="Kadotaku">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${escapeHtml(canonical)}">`,
  );

  return html;
}

const baseHtml = await fs.readFile(indexPath, "utf8");
const csv = await (await fetch(SHEET_CSV_URL)).text();
const rows = parseCsv(csv).slice(1);
const licences = rows
  .filter((row) => row[0] && row[2] === "1")
  .map((row) => row[0].trim());

for (const licence of licences) {
  const slug = slugLicence(licence);
  const dir = path.join(root, "licence", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "index.html"),
    buildLicenceHtml(baseHtml, licence),
    "utf8",
  );
}

const catalogueDir = path.join(root, "catalogue");
await fs.mkdir(catalogueDir, { recursive: true });
await fs.writeFile(
  path.join(catalogueDir, "index.html"),
  buildCatalogueHtml(baseHtml),
  "utf8",
);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "  <url>",
  `    <loc>${SITE_URL}/</loc>`,
  "  </url>",
  ...licences.flatMap((licence) => [
    "  <url>",
    `    <loc>${licenceUrl(licence)}</loc>`,
    "  </url>",
  ]),
  "</urlset>",
  "",
].join("\n");

await fs.writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");

console.log(`Pages licences générées : ${licences.length}`);
console.log("Page catalogue générée : 1");
