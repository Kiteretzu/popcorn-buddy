import { client } from "@repo/db/client";
import asyncHandler from "../utils/controller-utils/asynchandler";
import ApiResponse from "../utils/controller-utils/ApiResponse";
import ApiError from "../utils/controller-utils/ApiError";
import { scrapeYTS } from "../helpers/crawler/crawl_yts";

export const searchGlobalLibrary = asyncHandler(async (req: any, res: any) => {
  const { q = "", page = "1", limit = "20" } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where = q
    ? { title: { contains: q as string, mode: "insensitive" as const } }
    : {};

  const [movies, total] = await Promise.all([
    client.globalMovie.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    }),
    client.globalMovie.count({ where }),
  ]);

  return new ApiResponse(200, {
    movies,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  }, "Global library").send(res);
});

export const getGlobalMovieById = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;

  const movie = await client.globalMovie.findUnique({ where: { id } });
  if (!movie) {
    return new ApiError(404, "Movie not found in global library").send(res);
  }

  // Fetch and cache magnet link on demand if not already stored
  if (!movie.magnetLink && movie.url) {
    try {
      const scraped = await scrapeYTS(movie.url);
      const magnet = (scraped[0] as any)?.links?.[0]?.magnet;
      if (magnet) {
        await client.globalMovie.update({
          where: { id },
          data: { magnetLink: magnet },
        });
        return new ApiResponse(200, { ...movie, magnetLink: magnet }, "Movie detail").send(res);
      }
    } catch {
      // return what we have even if scraping fails
    }
  }

  return new ApiResponse(200, movie, "Movie detail").send(res);
});

export const ingestMovies = asyncHandler(async (req: any, res: any) => {
  const { movies } = req.body;

  if (!Array.isArray(movies) || movies.length === 0) {
    return new ApiError(400, "movies array is required").send(res);
  }

  let upserted = 0;
  for (const m of movies) {
    if (!m.url || !m.title) continue;
    await client.globalMovie.upsert({
      where: { url: m.url },
      update: {
        title: m.title,
        year: m.year ?? null,
        rating: m.rating ?? null,
        genres: m.genres ?? [],
        poster: m.poster ?? null,
      },
      create: {
        title: m.title,
        year: m.year ?? null,
        rating: m.rating ?? null,
        genres: m.genres ?? [],
        poster: m.poster ?? null,
        url: m.url,
      },
    });
    upserted++;
  }

  return new ApiResponse(200, { upserted }, `Upserted ${upserted} movies`).send(res);
});
