import type { NewsFromDB } from "@/lib/api";

const NEWS_KEY = "kff:cache:news:v1";

/** 24 hours in milliseconds for stale-while-revalidate offline resilience */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface NewsCacheEnvelope {
  savedAt: number;
  data: NewsFromDB[];
}

let inMemoryNews: NewsFromDB[] | null = null;

function read(): NewsCacheEnvelope | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(NEWS_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as NewsCacheEnvelope;
    if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(NEWS_KEY);
      return null;
    }
    return envelope;
  } catch {
    return null;
  }
}

function write(articles: NewsFromDB[]) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(NEWS_KEY, JSON.stringify({ savedAt: Date.now(), data: articles }));
  } catch {
    /* quota or private mode */
  }
}

export const newsCache = {
  loadNews(): { articles: NewsFromDB[]; savedAt: number } | null {
    if (inMemoryNews && inMemoryNews.length > 0) {
      return { articles: inMemoryNews, savedAt: Date.now() };
    }
    const cached = read();
    if (cached?.data && cached.data.length > 0) {
      inMemoryNews = cached.data;
      return { articles: cached.data, savedAt: cached.savedAt };
    }
    return null;
  },

  saveNews(articles: NewsFromDB[]) {
    if (!Array.isArray(articles) || articles.length === 0) return;
    inMemoryNews = articles;
    write(articles);
  },

  clear() {
    inMemoryNews = null;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(NEWS_KEY);
      }
    } catch {
      /* ignore */
    }
  },
};
