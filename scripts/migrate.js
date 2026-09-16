// Migração única de conteúdo do WordPress (codificadas.ime.usp.br) via API REST
// para arquivos Markdown do Eleventy. Rodar com: npm run migrate
// Não faz parte do build normal do site.

const fs = require("fs");
const path = require("path");
const TurndownService = require("turndown");

const BASE = "https://codificadas.ime.usp.br/wp-json/wp/v2";
const ROOT = path.join(__dirname, "..");
const OUT_POSTS = path.join(ROOT, "content", "posts");
const OUT_PAGES = path.join(ROOT, "content", "paginas");
const OUT_ARCHIVE = path.join(ROOT, "content", "arquivadas");
const OUT_IMG = path.join(ROOT, "assets", "img", "blog");

for (const dir of [OUT_POSTS, OUT_PAGES, OUT_ARCHIVE, OUT_IMG]) {
  fs.mkdirSync(dir, { recursive: true });
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Páginas que correspondem à navegação confirmada do site atual.
// Qualquer outro slug de página migrado vai para content/arquivadas/.
const NAV_PAGE_MAP = {
  "aprenda-a-programar": { file: "aprenda-a-programar.md", layout: "layouts/hub.njk", ordem: 1 },
  "por-que-eu-aprenderia-a-programar": { file: "por-que.md", layout: "layouts/pagina.njk", ordem: 1, pai: "aprenda-a-programar" },
  "como": { file: "como.md", layout: "layouts/pagina.njk", ordem: 2, pai: "aprenda-a-programar" },
  "onde-e-quando": { file: "onde-e-quando.md", layout: "layouts/pagina.njk", ordem: 3, pai: "aprenda-a-programar" },
  "plataforma-acesso-rapido": { file: "plataforma.md", layout: "layouts/pagina.njk", ordem: 4, pai: "aprenda-a-programar" },
  "o-projeto": { file: "o-projeto.md", layout: "layouts/hub.njk", ordem: 2 },
  "sobre-o-projeto": { file: "sobre.md", layout: "layouts/pagina.njk", ordem: 1, pai: "o-projeto" },
  "equipe": { file: "equipe.md", layout: "layouts/equipe.njk", ordem: 2, pai: "o-projeto" },
  "parcerias-e-projetos-correlatos": { file: "parcerias.md", layout: "layouts/pagina.njk", ordem: 3, pai: "o-projeto" },
  "contato": { file: "contato.md", layout: "layouts/contato.njk", ordem: 4, pai: "o-projeto" },
};

const PERMALINKS = {
  "aprenda-a-programar": "/aprenda-a-programar/",
  "por-que-eu-aprenderia-a-programar": "/aprenda-a-programar/por-que/",
  "como": "/aprenda-a-programar/como/",
  "onde-e-quando": "/aprenda-a-programar/onde-e-quando/",
  "plataforma-acesso-rapido": "/aprenda-a-programar/plataforma/",
  "o-projeto": "/o-projeto/",
  "sobre-o-projeto": "/o-projeto/sobre/",
  "equipe": "/o-projeto/equipe/",
  "parcerias-e-projetos-correlatos": "/o-projeto/parcerias/",
  "contato": "/o-projeto/contato/",
};

const ENTITY_MAP = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", apos: "'",
  "#8211": "–", "#8212": "—", "#8216": "‘", "#8217": "’",
  "#8220": "“", "#8221": "”", "#8230": "…", nbsp: " ",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", hellip: "…",
};

function decodeEntities(str = "") {
  return str.replace(/&(#?\w+);/g, (match, code) => {
    if (ENTITY_MAP[code] !== undefined) return ENTITY_MAP[code];
    if (/^#\d+$/.test(code)) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return match;
  });
}

function stripTags(html = "") {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function yamlString(value) {
  return JSON.stringify(value == null ? "" : String(value));
}

async function fetchAll(endpoint, params = "") {
  const perPage = 100;
  let page = 1;
  let results = [];
  while (true) {
    const res = await fetch(`${BASE}/${endpoint}?per_page=${perPage}&page=${page}${params}`);
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    results = results.concat(data);
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }
  return results;
}

async function downloadImage(url, destBaseName) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(new URL(url).pathname) || ".jpg";
    const fileName = `${destBaseName}${ext}`.toLowerCase();
    fs.writeFileSync(path.join(OUT_IMG, fileName), buf);
    return `/assets/img/blog/${fileName}`;
  } catch (err) {
    console.warn(`  ! falha ao baixar imagem ${url}: ${err.message}`);
    return null;
  }
}

function buildUrlMap(posts, pages) {
  const map = { "": "/" };
  for (const [slug, url] of Object.entries(PERMALINKS)) {
    map[slug] = url;
  }
  for (const post of posts) {
    if (!map[post.slug]) map[post.slug] = `/blog/${post.slug}/`;
  }
  for (const p of pages) {
    if (!map[p.slug]) map[p.slug] = `/arquivo/${p.slug}/`;
  }
  return map;
}

function rewriteInternalLinks(html, urlMap) {
  return html.replace(
    /https?:\/\/codificadas\.ime\.usp\.br\/([a-zA-Z0-9\-_/]*)\/?/g,
    (match, slugPath) => {
      const slug = slugPath.replace(/\/$/, "");
      return urlMap[slug] || match;
    }
  );
}

async function rewriteInlineImages(html, slug) {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match;
  let counter = 0;
  const replacements = [];
  while ((match = imgRegex.exec(html))) {
    replacements.push(match[1]);
  }
  let result = html;
  for (const src of replacements) {
    counter++;
    const localPath = await downloadImage(src, `${slug}-inline-${counter}`);
    if (localPath) {
      result = result.split(src).join(localPath);
    }
  }
  return result;
}

function frontmatterBlock(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${yamlString(item)}`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlString(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function resolveFeaturedMedia(items) {
  const ids = [...new Set(items.map((i) => i.featured_media).filter((id) => id))];
  if (!ids.length) return;
  const media = await fetchAll("media", `&include=${ids.join(",")}`);
  const urlById = {};
  for (const m of media) urlById[m.id] = m.source_url;
  for (const item of items) {
    if (item.featured_media && urlById[item.featured_media]) {
      item._featured_media_url = urlById[item.featured_media];
    }
  }
}

async function main() {
  console.log("Buscando categorias...");
  const categories = await fetchAll("categories");
  const categoriesById = {};
  for (const c of categories) categoriesById[c.id] = decodeEntities(c.name);
  console.log(`  categorias: ${categories.map((c) => `${c.name} (${c.count})`).join(", ")}`);

  const posts = await fetchAll("posts");
  const pages = await fetchAll("pages");
  await resolveFeaturedMedia(posts);
  await resolveFeaturedMedia(pages);

  const urlMap = buildUrlMap(posts, pages);

  const reportPosts = await migratePosts(posts, categoriesById, urlMap);
  const reportPages = await migratePages(pages, categoriesById, urlMap);

  const reportPath = path.join(__dirname, "migration-report.md");
  const report = [
    "# Relatório de migração de conteúdo",
    "",
    `Gerado em ${new Date().toISOString()}`,
    "",
    "## Posts",
    ...(reportPosts.length ? reportPosts : ["Nenhum problema encontrado."]),
    "",
    "## Páginas",
    ...(reportPages.length ? reportPages : ["Nenhum problema encontrado."]),
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, report);
  console.log(`\nRelatório salvo em ${reportPath}`);
}

// as funções abaixo reaproveitam os posts/páginas já buscados (evita buscar 2x)
async function migratePosts(posts, categoriesById, urlMap) {
  const report = [];
  for (const post of posts) {
    const slug = post.slug;
    const title = decodeEntities(post.title.rendered);
    const excerpt = stripTags(post.excerpt.rendered).slice(0, 220);
    const categorias = (post.categories || [])
      .map((id) => categoriesById[id])
      .filter(Boolean)
      .filter((name) => name !== "Sem categoria");

    let featuredImage = null;
    if (post._featured_media_url) {
      featuredImage = await downloadImage(post._featured_media_url, `${slug}-capa`);
    }

    const htmlWithFixedLinks = rewriteInternalLinks(post.content.rendered, urlMap);
    const htmlWithLocalImages = await rewriteInlineImages(htmlWithFixedLinks, slug);
    let markdown = turndown.turndown(htmlWithLocalImages);
    markdown = decodeEntities(markdown);

    const fm = frontmatterBlock({
      title,
      date: post.date ? post.date.slice(0, 10) : undefined,
      slug,
      categorias,
      imagem: featuredImage,
      resumo: excerpt,
    });

    fs.writeFileSync(path.join(OUT_POSTS, `${slug}.md`), fm + markdown + "\n");
    console.log(`  ✓ post: ${slug}`);

    if (!categorias.length) report.push(`- [SEM CATEGORIA] ${slug} — revisar se é lixo/teste (ex.: em-construcao).`);
    if (!featuredImage) report.push(`- [SEM IMAGEM] ${slug} — não tem imagem de destaque.`);
  }
  return report;
}

async function migratePages(pages, categoriesById, urlMap) {
  const report = [];
  for (const p of pages) {
    const slug = p.slug;
    const title = decodeEntities(p.title.rendered);
    const mapEntry = NAV_PAGE_MAP[slug];
    const targetDir = mapEntry ? OUT_PAGES : OUT_ARCHIVE;
    const fileName = mapEntry ? mapEntry.file : `${slug}.md`;

    let featuredImage = null;
    if (p._featured_media_url) {
      featuredImage = await downloadImage(p._featured_media_url, `${slug}-capa`);
    }

    const htmlWithFixedLinks = rewriteInternalLinks(p.content.rendered, urlMap);
    const htmlWithLocalImages = await rewriteInlineImages(htmlWithFixedLinks, slug);
    let markdown = turndown.turndown(htmlWithLocalImages);
    markdown = decodeEntities(markdown);

    const fm = frontmatterBlock({
      title,
      slug,
      layout: mapEntry ? mapEntry.layout : "layouts/pagina.njk",
      permalink: PERMALINKS[slug],
      pai: mapEntry ? mapEntry.pai : undefined,
      ordem: mapEntry ? mapEntry.ordem : undefined,
      imagem: featuredImage,
      arquivada: mapEntry ? undefined : true,
    });

    fs.writeFileSync(path.join(targetDir, fileName), fm + markdown + "\n");
    console.log(`  ✓ página: ${slug} → ${mapEntry ? "paginas/" : "arquivadas/"}${fileName}`);

    if (!mapEntry) {
      report.push(`- [ARQUIVADA] ${slug} ("${title}") — não está no menu confirmado. Decidir: manter arquivada, linkar de um post, ou incluir no menu.`);
    }
  }
  return report;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
