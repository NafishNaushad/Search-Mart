
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Sparkles } from "lucide-react";

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  excelLoading?: boolean;
  quickSearchSuggestions?: string[];
}

const SearchInput = ({ query, onQueryChange, onSubmit, loading, excelLoading, quickSearchSuggestions = ["Kurtis", "Facewash", "Sport shoes"] }: SearchInputProps) => {
  const [isClicked, setIsClicked] = useState(false);

  // Reset isClicked when loading completes
  useEffect(() => {
    if (!loading && !excelLoading) {
      setIsClicked(false);
    }
  }, [loading, excelLoading]);

  return (
    <div className="flex-1 transition-all duration-200">
      <div className="flex gap-2">
        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-md blur opacity-20 group-hover:opacity-30"></div>
          <div className="relative">
            <Input
              placeholder="Search products..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="text-sm h-9 sm:h-10 pr-8 sm:pr-10 bg-white/95 backdrop-blur-sm border border-white/50 rounded-md shadow-md focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
              disabled={excelLoading}
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 rounded-md"
                onClick={() => onQueryChange("")}
              >
                <X className="h-3 w-3 text-gray-400" />
              </Button>
            )}
          </div>
        </div>
        
        <Button 
          type="button" 
          disabled={!query.trim()} 
          className="h-9 sm:h-10 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-md shadow-md relative overflow-hidden transition-all duration-150 ease-in-out flex-shrink-0"
          onClick={(e) => {
            e.preventDefault();
            if (query.trim()) {
              // Show spinner immediately on click for instant feedback
              setIsClicked(true);
              console.log('Search button clicked with query:', query);
              onSubmit(e);
            }
          }}
        >
          {/* Static content that never moves */}
          <div className="flex items-center gap-1 relative z-10">
            <Search className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm hidden xs:inline">Search</span>
          </div>
          
          {/* Instant loading overlay - shows immediately on click */}
          <div 
            className={`absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center transition-opacity duration-75 ${(loading || excelLoading || isClicked) ? 'opacity-90' : 'opacity-0 pointer-events-none'}`}
            style={{ backdropFilter: 'blur(0px)' }}
          >
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          </div>
        </Button>
      </div>
      
      {!query && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-white/80">Quick search:</span>
          {quickSearchSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={(e) => {
                // Log the suggestion
                console.log('Quick search button clicked with suggestion:', suggestion);
                // First set the query
                onQueryChange(suggestion);
                // Submit immediately without delay
                // Pass the original event to onSubmit
                onSubmit(e);
              }}
              className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm touch-manipulation"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
