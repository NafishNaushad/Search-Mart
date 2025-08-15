
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter, X, Star } from "lucide-react";
import { SearchFilters } from "@/types/product";

interface AdvancedFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availablePlatforms: string[];
  availableBrands: string[];
  isOpen: boolean;
  onToggle: () => void;
  hasSearchResults?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
}

const AdvancedFilters = ({ 
  filters, 
  onFiltersChange, 
  availablePlatforms, 
  availableBrands,
  isOpen,
  onToggle,
  hasSearchResults = false,
  minPrice = 0,
  maxPrice = 10000,
  minRating = 1,
  maxRating = 5,
}: AdvancedFiltersProps) => {
  // Toggle state for platforms section
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [priceRange, setPriceRange] = useState([
    filters.minPrice !== undefined ? filters.minPrice : minPrice,
    filters.maxPrice !== undefined ? filters.maxPrice : maxPrice
  ]);
  const [selectedRating, setSelectedRating] = useState(filters.minRating || minRating);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const togglePlatform = (platform: string) => {
    const platforms = filters.platforms || [];
    const newPlatforms = platforms.includes(platform)
      ? platforms.filter((p: string) => p !== platform)
      : [...platforms, platform];
    updateFilters({ platforms: newPlatforms });
  };

  const toggleBrand = (brand: string) => {
    const brands = filters.brands || [];
    const newBrands = brands.includes(brand)
      ? brands.filter((b: string) => b !== brand)
      : [...brands, brand];
    updateFilters({ brands: newBrands });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setPriceRange([minPrice, maxPrice]);
    setSelectedRating(minRating);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onToggle}
          className={`flex items-center gap-2 ${hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {hasActiveFilters && <span className="text-xs">•</span>}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Price Range</Label>
              <div className="px-3">
                <Slider
                  value={priceRange}
                  onValueChange={(value) => {
                    setPriceRange(value);
                    updateFilters({ minPrice: value[0], maxPrice: value[1] });
                  }}
                  min={minPrice}
                  max={maxPrice}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>₹{priceRange[0]}</span>
                  <span>₹{priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Minimum Rating</Label>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {Array.from({ length: maxRating - minRating + 1 }, (_, i) => minRating + i).map((rating) => {
                  const isSelected = selectedRating === rating;
                  return (
                    <div
                      key={rating}
                      onClick={() => {
                        const newRating = selectedRating === rating ? 0 : rating;
                        setSelectedRating(newRating);
                        updateFilters({ minRating: newRating });
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 w-[60px] md:w-[73px] justify-center ${isSelected ? 'bg-[#0f172a] text-white' : 'bg-white text-black border border-gray-200'} hover:shadow-md`}
                    >
                      <Star className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-black'}`} />
                      {rating}+
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platforms (Toggle) */}
            <div className="space-y-2">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium focus:outline-none select-none"
                onClick={() => setShowPlatforms((prev) => !prev)}
                aria-expanded={showPlatforms}
                aria-controls="platforms-list"
                style={{ userSelect: 'none' }}
              >
                <span>Platforms:</span>
                <span className={`transition-transform ${showPlatforms ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {showPlatforms && (
                <div id="platforms-list" className="flex flex-wrap gap-1 mt-1">
                  {availablePlatforms.map((platform) => {
                    // Clean up the platform name for display
                    const platformName = platform.includes('-') ? platform.split('-')[0] : platform;
                    const isSelected = (filters.platforms || []).includes(platform);
                    return (
                      <div
                        key={platform}
                        className={`cursor-pointer transition-all duration-200 px-2 py-1 text-xs rounded-full ${isSelected ? 'bg-[#0f172a] text-white' : 'bg-white text-black border border-gray-200'} hover:shadow-sm`}
                        onClick={() => togglePlatform(platform)}
                      >
                        {platformName}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Brands section removed as requested */}

            {/* Sort Options - Only show when search results are available */}
            {hasSearchResults && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select 
                  value={filters.sortBy || 'relevance'} 
                  onValueChange={(value) => {
                    // Create a new object with just the sortBy property
                    // This ensures we're only updating the sort without triggering a new search
                    const sortOnlyFilter = { sortBy: value };
                    // Update the local state
                    updateFilters({ sortBy: value as "price-low" | "price-high" | "rating" | "relevance" });
                    // Notify parent component about the sort change only
                    onFiltersChange({ ...filters, sortBy: value as "price-low" | "price-high" | "rating" | "relevance" | undefined });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select sort order" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilters;
