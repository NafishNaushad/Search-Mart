
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, Target, Lightbulb } from "lucide-react";

interface SearchSuggestion {
  query: string;
  reason: string;
  popularity: number;
}

interface SearchOptimizationProps {
  onSuggestionClick: (query: string) => void;
}

const SearchOptimization = ({ onSuggestionClick }: SearchOptimizationProps) => {
  const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>([]);
  const [quickSearches, setQuickSearches] = useState<string[]>([]);

  useEffect(() => {
    // Mock trending searches - in production, this would come from analytics
    setTrendingSearches([
      { query: "wireless headphones", reason: "High demand this week", popularity: 95 },
      { query: "smartphone cases", reason: "Best deals available", popularity: 88 },
      { query: "laptop backpack", reason: "Back to school season", popularity: 82 },
      { query: "fitness tracker", reason: "New year resolutions", popularity: 76 },
      { query: "coffee maker", reason: "Morning essentials", popularity: 71 }
    ]);

    setQuickSearches([
      "gaming mouse",
      "bluetooth speaker",
      "phone charger",
      "water bottle",
      "desk lamp"
    ]);
  }, []);

  const getPopularityColor = (popularity: number) => {
    if (popularity >= 90) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (popularity >= 80) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    if (popularity >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  };

  return (
    <div className="space-y-6">
      {/* Trending Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendingSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => {
                  // Directly call onSuggestionClick without setTimeout
                  onSuggestionClick(search.query);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{search.query}</span>
                    <Badge className={getPopularityColor(search.popularity)}>
                      {search.popularity}% hot
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {search.reason}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent div's onClick
                    // Directly call onSuggestionClick without setTimeout
                    onSuggestionClick(search.query);
                  }}
                >
                  Search
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickSearches.map((query, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                onClick={() => {
                  // Directly call onSuggestionClick without setTimeout
                  onSuggestionClick(query);
                }}
              >
                {query}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Search Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Target className="h-4 w-4 mt-1 text-blue-600" />
              <div>
                <p className="font-medium">Be specific</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use detailed terms like "wireless noise-canceling headphones" instead of just "headphones"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="h-4 w-4 mt-1 text-blue-600" />
              <div>
                <p className="font-medium">Use filters</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set price ranges and select specific platforms to narrow down results
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="h-4 w-4 mt-1 text-blue-600" />
              <div>
                <p className="font-medium">Include brand names</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Searching for "iPhone 15 case" gives better results than "phone case"
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchOptimization;
