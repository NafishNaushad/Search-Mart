
import { useState, useEffect } from "react";
import { SearchFilters as SearchFiltersType } from "@/types/product";
import SearchInput from "./SearchInput";
import AdvancedFilters from "./AdvancedFilters";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp, ShoppingCart } from "lucide-react";

interface SearchFormProps {
  onSearch: (query: string, filters: SearchFiltersType) => void;
  loading: boolean;
  excelLoading: boolean;
  availablePlatforms: string[];
  availableBrands: string[];
  hasSearchResults?: boolean;
}

const SearchForm = ({ onSearch, loading, excelLoading, availablePlatforms, availableBrands, hasSearchResults = false }: SearchFormProps) => {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsSticky(scrollTop > 200); // Make sticky after scrolling 200px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Log the query to verify it's being passed correctly
    console.log('Form submitted with query:', query);
    // Call onSearch with the query and filters
    onSearch(query, filters);
    // Keep the query in the search box so users can modify it if needed
    // This is especially helpful when the search button becomes available again after timeout
  };
  
  // Handle filter changes, including sort changes
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    
    // If we have search results and only the sortBy filter changed, immediately apply the sort
    if (hasSearchResults && query.trim() && 
        Object.keys(newFilters).some(key => key === 'sortBy' && newFilters.sortBy !== filters.sortBy)) {
      console.log('Sort filter changed, applying immediately:', newFilters.sortBy);
      // Call onSearch with the current query and updated filters
      onSearch(query, newFilters);
    }
  };

  return (
    <>
      {/* Sticky Search Bar - Completely flush with top */}
      {isSticky && (
        <div className="fixed left-0 right-0 z-50 bg-white border-b border-gray-200 px-2" style={{top: '0px', paddingTop: '4px', paddingBottom: '4px', margin: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <div className="w-full flex items-center justify-center">
            <div className="flex items-center gap-2 w-full max-w-md">
              
              
              {/* Search Form - Center, compact */}
              <form onSubmit={handleSubmit} className="flex-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 h-8 px-3 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={excelLoading}
                    style={{margin: 0}}
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || loading || excelLoading}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {loading || excelLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="hidden sm:inline">Search</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              {/* Scroll to Top Button - Right */}
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll to Top"
              >
                <ArrowUp className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-1 sm:space-y-2">
        {/* Compact search section with minimal background */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-1 sm:p-2 rounded-lg sm:rounded-xl shadow-lg">
          <div className="text-center mb-1 sm:mb-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 px-1">Search Products Across Multiple Platforms</h2>
            <p className="text-xs text-gray-300 mb-1 px-1">[We earn through Affiliate!]</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-1 sm:space-y-2">
            <SearchInput
              query={query}
              onQueryChange={setQuery}
              onSubmit={handleSubmit}
              loading={loading}
              excelLoading={excelLoading}
            />
          </form>
        </div>

        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availablePlatforms={availablePlatforms}
          availableBrands={availableBrands}
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          hasSearchResults={hasSearchResults}
        />
      </div>
    </>
  );
};

export default SearchForm;
