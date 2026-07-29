import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.kadotaku.fr";
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1BWocFxHiryFhBqCUSQGm3JYqD9LbjZfL8K4nKqUUqrM/gviz/tq?tqx=out:csv&sheet=licences";
const PRODUCTS_API_URL =
  "https://kadotaku-backend-production.up.railway.app/api/all";
const LICENCE_GROUPS = {
  "Dragon Ball Universe": [
    "Dragon Ball",
    "Dragon Ball Daima",
    "Dragon Ball GT",
    "Dragon Ball Z",
    "Dragon Ball Super",
    "Dragon Ball Games",
  ],
};
const LICENCE_GROUP_PREFIXES = {
  "Tales of Verse": "Tales of",
};
const LEGACY_LICENCE_REDIRECTS = {
  "konosuba-god's-blessing-on-this-wonderful-world": "konosuba",
  "cautious-hero--the-hero-is-overpowered-but-overly-cautious":
    "cautious-hero-the-hero-is-overpowered-but-overly-cautious",
  "yaiba--samurai-legend": "yaiba-samurai-legend",
  "youjo-senki--saga-of-tanya-the-evil":
    "youjo-senki-saga-of-tanya-the-evil",
};
let licenceGroupsFromSheet = new Map();
let licenceGroupNamesFromSheet = new Set();

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
  return String(licence || "")
    .trim()
    .toLowerCase()
    .replace(/[.\s]+/g, "-")
    .replace(/-+/g, "-");
}

function licenceUrl(licence) {
  return `${SITE_URL}/licence/${encodeURI(slugLicence(licence))}`;
}

function buildRedirectHtml(targetSlug) {
  const targetUrl = `${SITE_URL}/licence/${encodeURI(targetSlug)}`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
  <link rel="canonical" href="${escapeHtml(targetUrl)}">
  <meta name="robots" content="noindex,follow">
  <title>Redirection - Kadotaku</title>
</head>
<body>
  <p><a href="${escapeHtml(targetUrl)}">Accéder à la nouvelle page</a></p>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>
`;
}

function splitMultiValues(value) {
  return String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "fr", {
    sensitivity: "base",
  });
}

function normaliseKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function getLicenceGroup(licence) {
  const licenceKey = normaliseKey(licence);
  const sheetGroup = licenceGroupsFromSheet.get(licenceKey);
  const groupEntry = Object.entries(LICENCE_GROUPS).find(
    ([groupName]) => normaliseKey(groupName) === licenceKey,
  );

  if (sheetGroup || groupEntry) {
    return [
      ...new Set([
        ...(sheetGroup || []),
        ...(groupEntry ? groupEntry[1] : []),
      ]),
    ];
  }

  return [];
}

function licenceBelongsToGroup(productLicence, groupName) {
  const staticGroup = getLicenceGroup(groupName);

  if (
    staticGroup.some(
      (child) => normaliseKey(child) === normaliseKey(productLicence),
    )
  ) {
    return true;
  }

  const prefixEntry = Object.entries(LICENCE_GROUP_PREFIXES).find(
    ([name]) => normaliseKey(name) === normaliseKey(groupName),
  );

  if (!prefixEntry) {
    return false;
  }

  const productKey = normaliseKey(productLicence);
  const groupKey = normaliseKey(groupName);
  const prefixKey = normaliseKey(prefixEntry[1]);

  return (
    productKey &&
    productKey !== groupKey &&
    productKey.startsWith(prefixKey)
  );
}

function productMatchesLicence(product, licence) {
  if (normaliseKey(product.licence) === normaliseKey(licence)) {
    return true;
  }

  return licenceBelongsToGroup(product.licence, licence);
}

function joinFrenchList(items) {
  if (items.length <= 1) {
    return items[0] || "";
  }

  return `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;
}

function joinProductList(items) {
  return items.join(", ");
}

function buildSeoData(products) {
  const byLicence = new Map();

  for (const product of products) {
    if (product.actif !== "1" || !product.licence) {
      continue;
    }

    const productLicence = product.licence.trim();
    const licence =
      [...byLicence.keys()].find(
        (key) => normaliseKey(key) === normaliseKey(productLicence),
      ) || productLicence;

    if (!byLicence.has(licence)) {
      byLicence.set(licence, {
        types: new Map(),
        persos: new Map(),
      });
    }

    const seoData = byLicence.get(licence);

    if (product.type) {
      const type = product.type.trim();
      seoData.types.set(type, (seoData.types.get(type) || 0) + 1);
    }

    for (const perso of splitMultiValues(product.perso)) {
      if (normaliseKey(perso) === "divers") {
        continue;
      }

      seoData.persos.set(perso, (seoData.persos.get(perso) || 0) + 1);
    }
  }

  const groupNames = [
    ...licenceGroupNamesFromSheet,
    ...Object.keys(LICENCE_GROUPS),
    ...Object.keys(LICENCE_GROUP_PREFIXES),
  ];

  for (const groupName of groupNames) {
    const groupData = {
      types: new Map(),
      persos: new Map(),
    };
    const directData = findSeoData(groupName, byLicence);

    if (directData) {
      for (const [type, count] of directData.types.entries()) {
        groupData.types.set(type, (groupData.types.get(type) || 0) + count);
      }

      for (const [perso, count] of directData.persos.entries()) {
        groupData.persos.set(perso, (groupData.persos.get(perso) || 0) + count);
      }
    }

    for (const [licence, seoData] of byLicence.entries()) {
      if (normaliseKey(licence) === normaliseKey(groupName)) {
        continue;
      }

      if (!licenceBelongsToGroup(licence, groupName)) {
        continue;
      }

      for (const [type, count] of seoData.types.entries()) {
        groupData.types.set(type, (groupData.types.get(type) || 0) + count);
      }

      for (const [perso, count] of seoData.persos.entries()) {
        groupData.persos.set(perso, (groupData.persos.get(perso) || 0) + count);
      }
    }

    if (groupData.types.size || groupData.persos.size) {
      byLicence.set(groupName, groupData);
    }
  }

  return byLicence;
}

function findSeoData(licence, seoDataByLicence) {
  return (
    seoDataByLicence.get(licence) ||
    seoDataByLicence.get(
      [...seoDataByLicence.keys()].find(
        (key) => normaliseKey(key) === normaliseKey(licence),
      ),
    )
  );
}

function topEntries(counter, limit) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

function productTypeLabel(type) {
  const lower = String(type || "").toLowerCase();

  if (lower.includes("figurine pop")) return "figurines Pop";
  if (lower.includes("figurine")) return "figurines";
  if (lower.includes("repas") || lower.includes("mug") || lower.includes("gourde")) return "mugs et gourdes";
  if (lower.includes("poster") || lower.includes("toile")) return "posters et toiles";
  if (lower.includes("parure") || lower.includes("couverture")) return "couvertures";
  if (lower.includes("vêtement") || lower.includes("chaussure")) return "vêtements";
  if (lower.includes("cosplay") || lower.includes("wig")) return "cosplays et perruques";
  if (lower.includes("peluche")) return "peluches";
  if (lower.includes("manga")) return "mangas";
  if (lower.includes("lego")) return "sets LEGO";
  if (lower.includes("jeux")) return "jeux";
  if (lower.includes("puzzle")) return "puzzles";
  if (lower.includes("lampe")) return "lampes";
  if (lower.includes("tirelire")) return "tirelires";
  if (lower.includes("maquette")) return "maquettes";
  if (lower.includes("tapis de souris")) return "tapis de souris";
  if (lower.includes("papercraft")) return "papercrafts";
  if (lower.includes("boîte à musique")) return "boîtes à musique";
  if (lower.includes("goodies")) return "goodies";
  if (lower.includes("porte-cl")) return "porte-clés";
  if (lower.includes("sticker") || lower.includes("décalcomanie")) return "stickers";
  if (lower.includes("bijou") || lower.includes("collier")) return "bijoux";
  if (lower.includes("blu-ray") || lower.includes("dvd") || lower.includes("cd")) return "Blu-ray, DVD et CD";

  return type;
}

function uniqueLabels(labels) {
  const seen = new Set();

  return labels.filter((label) => {
    const key = normaliseKey(label);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function pageDescription(licence, seoDataByLicence) {
  const seoData = findSeoData(licence, seoDataByLicence);
  const types = seoData
    ? uniqueLabels(topEntries(seoData.types, 6).map(productTypeLabel)).slice(0, 3)
    : [];
  const persos = seoData ? topEntries(seoData.persos, 5) : [];
  const productLabels =
    types.length > 0
      ? [...types]
      : ["figurines", "mugs", "peluches", "posters"];

  if (!productLabels.some((type) => normaliseKey(type) === "goodies")) {
    productLabels.push("goodies");
  }

  const productWords = joinProductList(productLabels);

  if (persos.length > 0) {
    return `Découvrez les meilleures idées cadeaux ${licence} autour de ${joinFrenchList(persos)} : ${productWords} et produits dérivés pour fans d'anime et de manga.`;
  }

  return `Découvrez les meilleures idées cadeaux ${licence} : ${productWords} et produits dérivés pour fans d'anime et de manga.`;
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

function buildLicenceHtml(baseHtml, licence, seoDataByLicence) {
  const title = pageTitle(licence);
  const description = pageDescription(licence, seoDataByLicence);
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
licenceGroupsFromSheet = new Map();
licenceGroupNamesFromSheet = new Set();

for (const row of rows) {
  if (!row[0] || !row[3]) {
    continue;
  }

  const groupKey = normaliseKey(row[3]);
  const groupName = row[3].trim();

  if (!groupKey) {
    continue;
  }

  licenceGroupNamesFromSheet.add(groupName);

  if (!licenceGroupsFromSheet.has(groupKey)) {
    licenceGroupsFromSheet.set(groupKey, []);
  }

  licenceGroupsFromSheet.get(groupKey).push(row[0].trim());
}

const products = await (await fetch(PRODUCTS_API_URL)).json();
const seoDataByLicence = buildSeoData(products);
const licences = rows
  .filter((row) => row[0] && row[2] === "1")
  .map((row) => row[0].trim());
const onlyIndex = process.argv.indexOf("--only");
const onlyLicence = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : "";
const licencesToGenerate = onlyLicence
  ? licences.filter(
      (licence) => normaliseKey(licence) === normaliseKey(onlyLicence),
    )
  : licences;

if (onlyLicence && licencesToGenerate.length === 0) {
  throw new Error(`Licence active introuvable : ${onlyLicence}`);
}

for (const licence of licencesToGenerate) {
  const slug = slugLicence(licence);
  const dir = path.join(root, "licence", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "index.html"),
    buildLicenceHtml(baseHtml, licence, seoDataByLicence),
    "utf8",
  );
}

if (!onlyLicence) {
  const catalogueDir = path.join(root, "catalogue");
  await fs.mkdir(catalogueDir, { recursive: true });
  await fs.writeFile(
    path.join(catalogueDir, "index.html"),
    buildCatalogueHtml(baseHtml),
    "utf8",
  );

  const licenceRoot = path.join(root, "licence");
  const expectedSlugs = new Set([
    ...licences.map(slugLicence),
    ...Object.keys(LEGACY_LICENCE_REDIRECTS),
  ]);
  const existingEntries = await fs.readdir(licenceRoot, {
    withFileTypes: true,
  });

  for (const entry of existingEntries) {
    if (!entry.isDirectory() || expectedSlugs.has(entry.name)) {
      continue;
    }

    const obsoleteDir = path.resolve(licenceRoot, entry.name);
    const relativePath = path.relative(path.resolve(licenceRoot), obsoleteDir);

    if (
      !relativePath ||
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(`Suppression de route refusée : ${obsoleteDir}`);
    }

    await fs.rm(obsoleteDir, {
      recursive: true,
      force: true,
    });
  }

  for (const [legacySlug, targetSlug] of Object.entries(
    LEGACY_LICENCE_REDIRECTS,
  )) {
    const redirectDir = path.join(licenceRoot, legacySlug);
    await fs.mkdir(redirectDir, { recursive: true });
    await fs.writeFile(
      path.join(redirectDir, "index.html"),
      buildRedirectHtml(targetSlug),
      "utf8",
    );
  }
}

const sitemapLicences = [];

for (const licence of licences) {
  const licenceIndex = path.join(
    root,
    "licence",
    slugLicence(licence),
    "index.html",
  );

  try {
    await fs.access(licenceIndex);
    sitemapLicences.push(licence);
  } catch {
    // A licence is added to the sitemap only after its HTML route exists.
  }
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "  <url>",
  `    <loc>${SITE_URL}/</loc>`,
  "  </url>",
  "  <url>",
  `    <loc>${SITE_URL}/catalogue</loc>`,
  "  </url>",
  ...sitemapLicences.flatMap((licence) => [
    "  <url>",
    `    <loc>${licenceUrl(licence)}</loc>`,
    "  </url>",
  ]),
  "</urlset>",
  "",
].join("\n");

await fs.writeFile(path.join(root, "sitemap.xml"), sitemap, "utf8");

console.log(`Pages licences générées : ${licencesToGenerate.length}`);
console.log(`Page catalogue générée : ${onlyLicence ? 0 : 1}`);
