"use client";
import { useState } from "react";
import Image from "next/image";
import { Film, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchGlobalLibrary, addToLibrary } from "@/lib/api";
import { GlobalMovie } from "@/lib/types";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<GlobalMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchGlobalLibrary(query.trim());
      setMovies(res.data.movies);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Discover Movies</h1>
        <p className="text-muted text-sm mt-1">
          Search the global library and add movies to your collection
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 max-w-lg">
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

      {/* Results / empty state */}
      {movies.length === 0 && !loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary-dark border border-foreground flex items-center justify-center mx-auto">
            <Film className="w-8 h-8 text-muted" />
          </div>
          <div>
            <p className="text-subtle text-lg font-medium">Search for movies</p>
            <p className="text-muted text-sm mt-1">
              Enter a movie title above to find it in the global library
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-primary-dark rounded-xl overflow-hidden animate-pulse">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-primary-dark border border-foreground rounded-xl overflow-hidden hover:border-blue-tertiary/50 transition-colors group"
            >
              {/* Poster */}
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

              {/* Info */}
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
                {movie.genres.length > 0 && (
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
      )}
    </div>
  );
}
