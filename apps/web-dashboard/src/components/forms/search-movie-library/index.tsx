"use client";
import { Search, Film, Upload } from "lucide-react";
import { useSearchMovie } from "@/hooks/use-search-movie";

const SearchMovieForm = () => {
  const {
    query,
    results,
    isSearching,
    showDropdown,
    selectedMovieId,
    setQuery,
    handleSearch,
    handleMovieSelect,
    handleInputFocus,
    handleInputBlur,
  } = useSearchMovie({ debounceMs: 1000 });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  const handleSubmit = () => {
    if (selectedMovieId) {
      console.log("Submitting movie ID:", selectedMovieId);
      // Here you can navigate to Upload form or call a function
      // For example: onMovieSubmit(selectedMovieId);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          name="search"
          placeholder="Search movies..."
          type="text"
          value={query}
          onChange={onChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all duration-200 bg-gray-800 text-white placeholder-gray-400"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          </div>
        )}
      </div>

      {/* Submit Button - Only shows when movie is selected */}
      {selectedMovieId && (
        <button
          onClick={handleSubmit}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <Upload className="h-5 w-5" />
          <span>Continue to Upload</span>
        </button>
      )}

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((movie) => (
            <div
              key={movie.id}
              onClick={() => handleMovieSelect(movie)}
              className="flex items-center p-3 hover:bg-gray-700 cursor-pointer transition-colors duration-150 border-b border-gray-700 last:border-b-0"
            >
              <div className="flex-shrink-0 w-12 h-16 bg-gray-600 rounded overflow-hidden">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='64' viewBox='0 0 48 64'%3E%3Crect width='48' height='64' fill='%23374151'/%3E%3Cg transform='translate(12 20)'%3E%3Cpath d='M12 0L24 12H16v8h-8v-8H0z' fill='%23d1d5db'/%3E%3C/g%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-white break-words whitespace-normal">
                  {movie.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 break-words whitespace-normal">
                  {movie.year || "Year unknown"}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                <Film className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && results.length === 0 && query.trim() && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <div className="p-4 text-center text-gray-400">
            <Film className="h-8 w-8 mx-auto mb-2 text-gray-500" />
            <p className="text-sm">No movies found</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchMovieForm;
