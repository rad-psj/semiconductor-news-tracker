import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const ROOT_DIR = process.cwd();
const OUT_FILE = path.join(ROOT_DIR, "src", "news.json");

const regions = [
  {
    id: "KR",
    label: "한국",
    tabLabel: "Korea",
    hl: "ko",
    gl: "KR",
    ceid: "KR:ko",
    keywords: [
      { id: "semiconductor", label: "반도체", query: "반도체" },
      { id: "samsung", label: "삼성전자", query: "삼성전자" },
      { id: "sk-hynix", label: "SK하이닉스", query: "SK하이닉스" },
      { id: "ai-chip", label: "AI칩", query: "AI칩" },
      { id: "hbm", label: "HBM", query: "HBM" },
      { id: "foundry", label: "파운드리", query: "파운드리" },
      { id: "ai", label: "인공지능", query: "인공지능" },
      { id: "generative-ai", label: "생성형 AI", query: "생성형 AI" }
    ]
  },
  {
    id: "US",
    label: "미국",
    tabLabel: "United States",
    hl: "en",
    gl: "US",
    ceid: "US:en",
    keywords: [
      { id: "semiconductor", label: "Semiconductor", query: "semiconductor" },
      { id: "nvidia", label: "NVIDIA", query: "NVIDIA" },
      { id: "intel", label: "Intel", query: "Intel" },
      { id: "amd", label: "AMD", query: "AMD" },
      { id: "tsmc", label: "TSMC", query: "TSMC" },
      { id: "micron", label: "Micron", query: "Micron" },
      { id: "broadcom", label: "Broadcom", query: "Broadcom" },
      { id: "qualcomm", label: "Qualcomm", query: "Qualcomm" },
      { id: "ai-chip", label: "AI Chip", query: "AI chip" },
      { id: "generative-ai", label: "Generative AI", query: "generative AI" },
      { id: "hbm", label: "HBM", query: "HBM" }
    ]
  }
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

function googleNewsRssUrl({ query, hl, gl, ceid }) {
  const encodedQuery = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

function normalizeItem(item, region, keyword) {
  const source =
    typeof item.source === "object"
      ? item.source["#text"] || item.source.name || "Unknown"
      : item.source || "Unknown";

  return {
    id: `${region.id}-${keyword.id}-${item.link}`,
    region: region.id,
    regionLabel: region.label,
    keywordId: keyword.id,
    keywordLabel: keyword.label,
    query: keyword.query,
    title: item.title || "",
    source,
    publishedAt: item.pubDate || "",
    link: item.link || ""
  };
}

function dedupeNews(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.link || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortNews(items) {
  return [...items].sort((a, b) => {
    const ad = new Date(a.publishedAt).getTime();
    const bd = new Date(b.publishedAt).getTime();

    if (Number.isNaN(ad) && Number.isNaN(bd)) return 0;
    if (Number.isNaN(ad)) return 1;
    if (Number.isNaN(bd)) return -1;

    return bd - ad;
  });
}

async function fetchFeed(region, keyword) {
  const url = googleNewsRssUrl({
    query: keyword.query,
    hl: region.hl,
    gl: region.gl,
    ceid: region.ceid
  });

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 SemiconductorNewsTracker/1.0 (+https://github.com)"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const data = parser.parse(xml);

  const rawItems = data?.rss?.channel?.item || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .filter(Boolean)
    .slice(0, 15)
    .map((item) => normalizeItem(item, region, keyword));
}

async function main() {
  const allNews = [];

  for (const region of regions) {
    for (const keyword of region.keywords) {
      try {
        const items = await fetchFeed(region, keyword);
        allNews.push(...items);
        console.log(`[OK] ${region.id} / ${keyword.label}: ${items.length}`);
      } catch (error) {
        console.error(`[FAIL] ${region.id} / ${keyword.label}`);
        console.error(error);
      }
    }
  }

  const news = sortNews(dedupeNews(allNews));

  const payload = {
    updatedAt: new Date().toISOString(),
    regions: regions.map((region) => ({
      id: region.id,
      label: region.label,
      tabLabel: region.tabLabel,
      keywords: region.keywords.map((keyword) => ({
        id: keyword.id,
        label: keyword.label,
        query: keyword.query
      }))
    })),
    items: news
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Saved ${news.length} articles to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});