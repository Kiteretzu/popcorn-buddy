"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Film, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchGlobalLibrary, addToLibrary } from "@/lib/api";
import type { GlobalMovie } from "@/lib/types";
import type { GlobalLibraryPagination } from "@/lib/api";

const PER_PAGE_OPTIONS = [12, 20, 24, 48];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<GlobalMovie[]>([]);
  const [pagination, setPagination] = useState<GlobalLibraryPagination | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const fetchMovies = useCallback(
    async (pageNum: number, perPageNum: number, searchQuery: string) => {
      setLoading(true);
      try {
        const res = await searchGlobalLibrary(
          searchQuery.trim(),
          pageNum,
          perPageNum
        );
        setMovies(res.data.movies);
        setPagination(res.data.pagination);
      } catch {
        setMovies([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load: fetch first page of global movies (no search)
  useEffect(() => {
    fetchMovies(1, 20, "");
  }, [fetchMovies]);

  const handleSearch = () => {
    setPage(1);
    fetchMovies(1, perPage, query);
  };

  const handlePageChange = (newPage: number) => {
    if (!pagination || newPage < 1 || newPage > pagination.pages) return;
    setPage(newPage);
    fetchMovies(newPage, perPage, query);
  };

  const handlePerPageChange = (value: string) => {
    const num = parseInt(value, 10);
    setPerPage(num);
    setPage(1);
    fetchMovies(1, num, query);
  };

  const handleAdd = async (movieId: string) => {
    if (added[movieId]) return;
    setAdding((prev) => ({ ...prev, [movieId]: true }));
    try {
      await addToLibrary(movieId);
      setAdded((prev) => ({ ...prev, [movieId]: true }));
    } catch {
      // ignore
    } finally {
      setAdding((prev) => ({ ...prev, [movieId]: false }));
    }
  };

  const showEmptyState =
    !loading && movies.length === 0 && !query.trim() && !pagination?.total;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Discover Movies</h1>
        <p className="text-muted text-sm mt-1">
          Browse the global library and add movies to your collection
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-3 max-w-md flex-1 min-w-[200px]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search movies by title..."
              className="pl-9 bg-primary-dark border-foreground text-subtle placeholder:text-muted focus-visible:ring-0 focus-visible:border-blue-tertiary"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="bg-blue-tertiary hover:bg-blue-secondary text-white font-semibold shrink-0"
          >
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm whitespace-nowrap">
            Per page
          </span>
          <Select
            value={String(perPage)}
            onValueChange={handlePerPageChange}
            disabled={loading}
          >
            <SelectTrigger className="w-[72px] bg-primary-dark border-foreground text-subtle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results / empty state */}
      {showEmptyState ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary-dark border border-foreground flex items-center justify-center mx-auto">
            <Film className="w-8 h-8 text-muted" />
          </div>
          <div>
            <p className="text-subtle text-lg font-medium">No movies yet</p>
            <p className="text-muted text-sm mt-1">
              Use search above or check back later for the global library
            </p>
          </div>
        </div>
      ) : loading && movies.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: Math.min(perPage, 10) }).map((_, i) => (
            <div
              key={i}
              className="bg-primary-dark rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[2/3] bg-foreground/30" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-foreground/30 rounded w-3/4" />
                <div className="h-3 bg-foreground/20 rounded w-1/2" />
                <div className="h-7 bg-foreground/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="bg-primary-dark border border-foreground rounded-xl overflow-hidden hover:border-blue-tertiary/50 transition-colors group"
              >
                <div className="relative aspect-[2/3] bg-foreground/20">
                  {movie.poster ? (
                    <Image
                      src={movie.poster}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-10 h-10 text-muted" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                      {movie.title}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {movie.year}
                      {movie.rating ? ` · ${movie.rating}` : ""}
                    </p>
                  </div>
                  {movie.genres?.length > 0 && (
                    <p className="text-muted text-xs truncate">
                      {movie.genres.slice(0, 2).join(", ")}
                    </p>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleAdd(movie.id)}
                    disabled={adding[movie.id] || added[movie.id]}
                    className={`w-full h-7 text-xs font-semibold transition-colors ${
                      added[movie.id]
                        ? "bg-green/20 text-green border border-green/30 hover:bg-green/20"
                        : "bg-blue-tertiary hover:bg-blue-secondary text-white"
                    }`}
                  >
                    {adding[movie.id]
                      ? "Adding…"
                      : added[movie.id]
                        ? "Added"
                        : "+ Add to Library"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-foreground">
              <p className="text-muted text-sm">
                Page {pagination.page} of {pagination.pages}
                {pagination.total != null && (
                  <span className="ml-1">
                    ({pagination.total} total)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="bg-primary-dark border-foreground text-subtle hover:bg-primary hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.pages || loading}
                  className="bg-primary-dark border-foreground text-subtle hover:bg-primary hover:text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
