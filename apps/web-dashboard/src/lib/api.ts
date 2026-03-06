import request from "./request";
import { Movie, Response, AuthResponse, GlobalMovie, UserLibraryItem } from "./types";

const YTS_AJAX_SEARCH = "https://www2.yts-official.to/ajax/search";

const YTS_SEARCH_HEADERS: Record<string, string> = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.5",
  priority: "u=1, i",
  referer: "https://www2.yts-official.to/",
  "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "sec-gpc": "1",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
};

interface YTSAjaxItem {
  img?: string;
  title?: string;
  url?: string;
  year?: string;
}

interface YTSAjaxResponse {
  status?: string;
  data?: YTSAjaxItem[];
}

/**
 *
 * @param data - The movie metadata to upload.
 */

export const uploadMovieMetadata = (data: FormData) =>
  request.post<unknown, Response<{ uploadUrl: string }>>(
    "/api/upload/movie-metadata",
    data
  );

/** Auth */
export const register = (email: string, password: string, name?: string) =>
  request.post<unknown, Response<AuthResponse>>("/api/auth/register", { email, password, name });

export const signup = (email: string, password: string, name?: string) =>
  request.post<unknown, Response<AuthResponse>>("/api/auth/signup", { email, password, name });

export const login = (email: string, password: string) =>
  request.post<unknown, Response<AuthResponse>>("/api/auth/login", { email, password });

export const getMe = () =>
  request.get<unknown, Response<AuthResponse["user"]>>("/api/auth/me");

/** Global library */
export const searchGlobalLibrary = (q: string, page = 1, limit = 20) =>
  request.get<unknown, Response<{ movies: GlobalMovie[]; pagination: { page: number; total: number; pages: number } }>>(
    `/api/global-library?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
  );

export const getGlobalMovie = (id: string) =>
  request.get<unknown, Response<GlobalMovie>>(`/api/global-library/${id}`);

/** User library */
export const addToLibrary = (globalMovieId: string) =>
  request.post<unknown, Response<{ libraryItemId: string; downloadJobId: string; status: string }>>(
    "/api/library",
    { globalMovieId }
  );

export const getLibrary = () =>
  request.get<unknown, Response<UserLibraryItem[]>>("/api/library");

export const getLibraryItem = (id: string) =>
  request.get<unknown, Response<UserLibraryItem>>(`/api/library/${id}`);

/** Friends */
export const sendFriendRequest = (addresseeEmail: string) =>
  request.post<unknown, Response<unknown>>("/api/friends/request", { addresseeEmail });

export const acceptFriend = (friendId: string) =>
  request.post<unknown, Response<unknown>>("/api/friends/accept", { friendId });

export const listFriends = () =>
  request.get<unknown, Response<unknown[]>>("/api/friends");

export const listPendingFriends = () =>
  request.get<unknown, Response<unknown[]>>("/api/friends/pending");

/** Search movies via YTS ajax API directly from the frontend. */
export const searchMovies = async (searchQuery: string): Promise<Movie[]> => {
  const query = searchQuery.trim();
  if (!query) return [];

  const url = `${YTS_AJAX_SEARCH}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: YTS_SEARCH_HEADERS,
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const json = (await res.json()) as YTSAjaxResponse;
  const items = json?.data ?? [];

  return items.map((item, index) => ({
    id: index + 1,
    title: item.title ?? "",
    poster: item.img ?? "",
    year: item.year,
  }));
};
