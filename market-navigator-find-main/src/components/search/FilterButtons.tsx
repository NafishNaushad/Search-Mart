
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface FilterButtonsProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const FilterButtons = ({ 
  showFilters, 
  onToggleFilters, 
  hasActiveFilters, 
  onClearFilters 
}: FilterButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onToggleFilters}
        className={`px-3 ${hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
      >
        <Filter className="h-4 w-4" />
        {hasActiveFilters && <span className="ml-1 text-xs">•</span>}
      </Button>
      {showFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-sm"
          disabled={!hasActiveFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      )}
    </div>
  );
};

export default FilterButtons;
