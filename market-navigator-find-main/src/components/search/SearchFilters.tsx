
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap } from "lucide-react";
import FilterButtons from "./FilterButtons";

interface SearchFiltersProps {
  showFilters: boolean;
  minPrice: string;
  maxPrice: string;
  selectedPlatforms: string[];
  sortBy: 'price' | 'rating' | 'popularity' | 'relevance';
  freeShipping: boolean;
  availablePlatforms: string[];
  hasActiveFilters: boolean;
  onMinPriceChange: (price: string) => void;
  onMaxPriceChange: (price: string) => void;
  onTogglePlatform: (platform: string) => void;
  onSortByChange: (sortBy: 'price' | 'rating' | 'popularity' | 'relevance') => void;
  onFreeShippingChange: (freeShipping: boolean) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

const SearchFilters = ({
  showFilters,
  minPrice,
  maxPrice,
  selectedPlatforms,
  sortBy,
  freeShipping,
  availablePlatforms,
  hasActiveFilters,
  onMinPriceChange,
  onMaxPriceChange,
  onTogglePlatform,
  onSortByChange,
  onFreeShippingChange,
  onToggleFilters,
  onClearFilters
}: SearchFiltersProps) => {
  if (!showFilters) {
    return (
      <FilterButtons
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterButtons
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Advanced Filters
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Price Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Price Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => onMinPriceChange(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => onMaxPriceChange(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select value={sortBy} onValueChange={onSortByChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="rating">Rating: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Free Shipping */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Shipping</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="free-shipping"
                    checked={freeShipping}
                    onCheckedChange={onFreeShippingChange}
                  />
                  <Label htmlFor="free-shipping" className="text-sm">
                    Free shipping only
                  </Label>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => (
                  <Badge
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => onTogglePlatform(platform)}
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchFilters;
