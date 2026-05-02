/**
 * Fetches a magnet link for a YTS movie page URL via the go-crawler API.
 * Uses GO_CRAWLER_API_URL (default http://localhost:4010).
 */
const GO_CRAWLER_BASE =
  process.env.GO_CRAWLER_API_URL ?? "http://localhost:4111";

export async function fetchMagnetFromGoCrawler(movieUrl: string): Promise<string | null> {
  const url = `${GO_CRAWLER_BASE}/magnet`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: movieUrl }),
  });
  

  if (!res.ok) {
    const body = await res.text();
    console.warn(`go-crawler /magnet failed (${res.status}): ${body}`);
    return null;
  }

  const data = (await res.json()) as { magnetLink?: string };
  return data.magnetLink ?? null;
}
