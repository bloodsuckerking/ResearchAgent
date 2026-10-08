import "server-only";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import ipaddr from "ipaddr.js";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { Source } from "./types";

export async function readPublic(
  url: string,
  signal: AbortSignal,
  redirects = 0,
  limits: { maxBytes?: number } = {},
): Promise<string> {
  const parsed = new URL(url);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (parsed.port && !["80", "443"].includes(parsed.port))
  ) {
    throw new Error("UNSAFE_URL");
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((address) => ipaddr.process(address.address).range() !== "unicast")
  ) {
    throw new Error("UNSAFE_URL");
  }

  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = (parsed.protocol === "https:" ? https : http).get(
      parsed,
      {
        signal,
        headers: {
          "User-Agent": "ResearchReader/1.0",
          Accept: "text/html,application/xml,text/xml",
        },
        lookup: ((_host: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) =>
          options.all
            ? callback(null, [address])
            : callback(null, address.address, address.family)) as https.RequestOptions["lookup"],
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          if (redirects >= 3) return reject(new Error("REDIRECT_LIMIT"));
          readPublic(
            new URL(response.headers.location, parsed).href,
            signal,
            redirects + 1,
            limits,
          ).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error("READ_FAILED"));
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > (limits.maxBytes ?? 1_500_000)) {
            request.destroy(new Error("PAGE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        response.on("error", reject);
      },
    );
    request.setTimeout(12_000, () => request.destroy(new Error("READ_TIMEOUT")));
    request.on("error", reject);
  });
}

type SearchResult = { title: string; url: string; excerpt: string };

export type SearchProgress =
  | { type: "search_started"; query: string; index: number; total: number }
  | { type: "search_complete"; count: number; total: number }
  | { type: "source_found"; source: Source }
  | { type: "source_read"; source: Source; index: number; total: number };

async function searchWithBing(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const xml = await readPublic(
    "https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query),
    signal,
  );
  const parsed = new XMLParser().parse(xml);
  const items = parsed.rss?.channel?.item;
  return (Array.isArray(items) ? items : items ? [items] : [])
    .slice(0, 4)
    .map((item: Record<string, string>) => ({
      title: String(item.title || ""),
      url: String(item.link || ""),
      excerpt: load(String(item.description || "")).text(),
    }));
}

async function searchWithSearxng(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const baseUrl = process.env.SEARXNG_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("SEARXNG_NOT_CONFIGURED");

  const response = await fetch(
    `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`,
    {
      headers: { Accept: "application/json", "User-Agent": "ResearchAgent/1.0" },
      signal,
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");

  const body = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  return (body.results ?? []).slice(0, 4).map((item) => ({
    title: item.title?.trim() || item.url || "",
    url: item.url?.trim() || "",
    excerpt: item.content?.trim() || "",
  }));
}

async function search(query: string, signal: AbortSignal) {
  const provider = (process.env.SEARCH_PROVIDER || "bing").trim().toLowerCase();
  if (provider === "searxng") return searchWithSearxng(query, signal);
  return searchWithBing(query, signal);
}

export async function searchAndRead(
  queries: string[],
  signal: AbortSignal,
  onProgress?: (progress: SearchProgress) => void,
  options: {
    maxQueries?: number;
    maxSources?: number;
    maxSourceChars?: number;
    maxHtmlBytes?: number;
  } = {},
): Promise<Source[]> {
  const limitedQueries = queries.slice(0, options.maxQueries ?? 3);
  const results = await Promise.allSettled(
    limitedQueries.map(async (query, index) => {
      onProgress?.({
        type: "search_started",
        query,
        index: index + 1,
        total: limitedQueries.length,
      });
      return search(query, signal);
    }),
  );

  const found = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((source) => /^https?:\/\//.test(source.url));
  const unique = [...new Map(found.map((source) => [source.url, source])).values()].slice(0, options.maxSources ?? 8);

  if (!unique.length) throw new Error("SEARCH_UNAVAILABLE");

  onProgress?.({
    type: "search_complete",
    count: unique.length,
    total: limitedQueries.length,
  });

  unique.forEach((source, index) => {
    onProgress?.({
      type: "source_found",
      source: {
        ...source,
        id: index + 1,
        content: source.excerpt,
        read: false,
      },
    });
  });

  return Promise.all(
    unique.map(async (source, index) => {
      const fallback: Source = {
        ...source,
        id: index + 1,
        content: source.excerpt,
        read: false,
      };

      try {
        const html = await readPublic(source.url, signal, 0, {
          maxBytes: options.maxHtmlBytes,
        });
        const $ = load(html);
        $("script,style,nav,footer,header,iframe,noscript").remove();
        const content = (
          $("main").text() ||
          $("article").text() ||
          $("body").text()
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, options.maxSourceChars ?? 9_000);
        const result: Source = {
          ...source,
          id: index + 1,
          content: content || source.excerpt,
          read: content.length > 200,
        };
        onProgress?.({ type: "source_read", source: result, index: index + 1, total: unique.length });
        return result;
      } catch {
        onProgress?.({ type: "source_read", source: fallback, index: index + 1, total: unique.length });
        return fallback;
      }
    }),
  );
}
