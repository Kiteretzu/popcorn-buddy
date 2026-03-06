"use client";
import { useState, useEffect, useCallback } from "react";
import { searchGlobalLibrary, addToLibrary } from "@/lib/api";
import { GlobalMovie } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function BrowsePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<GlobalMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fetchMovies = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await searchGlobalLibrary(q, p, 24);
      setMovies(res.data.movies);
      setTotalPages(res.data.pagination.pages);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies(query, page);
  }, [query, page, fetchMovies]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleAdd = async (movie: GlobalMovie) => {
    if (addedIds.has(movie.id)) return;
    setAddingId(movie.id);
    try {
      await addToLibrary(movie.id);
      setAddedIds((prev) => new Set([...prev, movie.id]));
      router.push("/dashboard/library");
    } catch (err: any) {
      const msg = err?.message ?? "Failed to add";
      if (msg.includes("already in your library")) {
        setAddedIds((prev) => new Set([...prev, movie.id]));
      } else {
        alert(msg);
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Browse Movies</h1>
        <p className="text-gray-400 text-sm mt-1">
          Discover movies from the global library and add them to yours
        </p>
      </div>

      <input
        type="search"
        placeholder="Search movies..."
        value={query}
        onChange={handleSearch}
        className="w-full max-w-md bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 transition"
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl aspect-[2/3] animate-pulse" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No movies found.{" "}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-green-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group relative bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition"
            >
              <div className="relative aspect-[2/3] bg-white/5">
                {movie.poster ? (
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    No image
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    onClick={() => handleAdd(movie)}
                    disabled={addingId === movie.id || addedIds.has(movie.id)}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    {addedIds.has(movie.id)
                      ? "Added"
                      : addingId === movie.id
                      ? "Adding..."
                      : "+ My Library"}
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{movie.title}</p>
                <p className="text-gray-500 text-xs">{movie.year}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3 justify-center pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-sm transition"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-sm transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
