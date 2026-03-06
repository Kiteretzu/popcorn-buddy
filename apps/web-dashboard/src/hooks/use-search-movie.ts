import { useState, useCallback } from "react";
import { debounce } from "lodash";
import { useQueryData } from "./react-query-hooks/useQueryData";
import { searchMovies } from "@/lib/api";
import { Movie } from "@/lib/types";

// Types
interface UseSearchMovieOptions {
  debounceMs?: number;
  apiEndpoint?: string;
}

interface UseSearchMovieReturn {
  query: string;
  results: Movie[];
  isSearching: boolean;
  showDropdown: boolean;
  selectedMovieId: string | null;
  setQuery: (query: string) => void;
  setShowDropdown: (show: boolean) => void;
  handleSearch: (query: string) => void;
  handleMovieSelect: (movie: Movie) => void;
  handleInputFocus: () => void;
  handleInputBlur: () => void;
}

export const useSearchMovie = (
  options: UseSearchMovieOptions = {}
): UseSearchMovieReturn => {
  const { debounceMs = 1000, apiEndpoint } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Use React Query for data fetching
  const { data: results = [], isFetching } = useQueryData(
    ["search-movies", debouncedQuery],
    () => searchMovies(debouncedQuery),
    !!debouncedQuery.trim() // Only enable when there's a query
  );

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      setDebouncedQuery(searchQuery);
    }, debounceMs),
    [debounceMs]
  );

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setDebouncedQuery("");
        setShowDropdown(false);
        setSelectedMovieId(null); // Clear selected movie when search is cleared
        return;
      }

      debouncedSearch(searchQuery);
      setShowDropdown(true);
      setSelectedMovieId(null); // Clear selected movie when new search starts
    },
    [debouncedSearch]
  );

  const handleMovieSelect = useCallback((movie: Movie) => {
    setQuery(movie.title);
    setShowDropdown(false);
    setSelectedMovieId(movie.id); // Store the selected movie ID
    console.log("Selected movie:", movie);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (results.length > 0) {
      setShowDropdown(true);
    }
  }, [results.length]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding dropdown to allow click on results
    setTimeout(() => setShowDropdown(false), 150);
  }, []);

  return {
    query,
    results,
    isSearching: isFetching,
    showDropdown,
    selectedMovieId,
    setQuery,
    setShowDropdown,
    handleSearch,
    handleMovieSelect,
    handleInputFocus,
    handleInputBlur,
  };
};
