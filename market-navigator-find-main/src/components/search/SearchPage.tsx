import { useState, useEffect, useRef } from "react";
import SearchForm from "./SearchForm";
import { getCountryConfig, getAllBrands } from "@/utils/productGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { personalizationEngine } from "@/utils/personalization";
import { Product, SearchFilters } from "@/types/product";
import ProductList from "./ProductList";
import PersonalizedFeed from "./PersonalizedFeed";

interface SearchPageProps {
  allExcelProducts: Product[];
  excelLoading: boolean;
  excelError: string | null;
  setTab?: (tab: string) => void;
  showBackArrow?: boolean;
  onBackArrowClick?: () => void;
  onResultsStateChange?: (hasResults: boolean) => void;
  personalizedFeed: Product[];
  onRefreshFeed: () => void;
  onClearSearch?: () => void;
}

const SearchPage = ({ allExcelProducts, excelLoading, excelError, setTab, showBackArrow, onBackArrowClick, onResultsStateChange, personalizedFeed, onRefreshFeed, onClearSearch }: SearchPageProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [countryConfig, setCountryConfig] = useState<any>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [currentCountry, setCurrentCountry] = useState<string>('US');
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeUserData();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Notify parent when search results state changes
  useEffect(() => {
    if (onResultsStateChange) {
      onResultsStateChange(products.length > 0);
    }
  }, [products.length, onResultsStateChange]);

  const initializeUserData = async () => {
    const detectedCountry = detectUserLocation();
    console.log('Detected country from browser:', detectedCountry);
    setCurrentCountry(detectedCountry);
    
    const initialConfig = getCountryConfig(detectedCountry);
    console.log('Initial country config:', initialConfig);
    setCountryConfig(initialConfig);
    setAvailableBrands(getAllBrands(detectedCountry));

    await loadUserProfile(detectedCountry);
  };
  
  const normalize = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  };

  const loadUserProfile = async (fallbackCountry: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
        let userCountry = fallbackCountry;
        
        if (data.country === 'India') {
          userCountry = 'IN';
        } else if (data.country === 'United States' || data.country === 'US') {
          userCountry = 'US';
        } else if (data.country === 'United Kingdom' || data.country === 'GB') {
          userCountry = 'GB';
        } else if (data.country) {
          userCountry = data.country;
        }
        
        console.log('User country from profile:', data.country, '-> mapped to:', userCountry);
        setCurrentCountry(userCountry);
        
        const userCountryConfig = getCountryConfig(userCountry);
        console.log('User country config:', userCountryConfig);
        setCountryConfig(userCountryConfig);
        setAvailableBrands(getAllBrands(userCountry));
      }
    }
  };

  const detectUserLocation = (): string => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('User timezone:', timezone);
    
    const language = navigator.language || navigator.languages[0];
    console.log('User language:', language);
    
    if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
      return 'IN';
    } else if (timezone.includes('Europe/London') || language.startsWith('en-GB')) {
      return 'GB';
    } else if (timezone.includes('America/') && (language.startsWith('en-US') || language.startsWith('en'))) {
      return 'US';
    } else if (language.startsWith('hi') || language.includes('IN')) {
      return 'IN';
    }
    
    return 'US';
  };

  const handleSearch = async (query: string, filters: SearchFilters) => {
    setLoading(true);
    
    const onlySortChanged = 
      lastQuery === query && 
      Object.keys(filters).length === 1 && 
      'sortBy' in filters;
    
    if (onlySortChanged) {
      setProducts(prevProducts => {
        const sortedProducts = [...prevProducts];
        if (filters.sortBy) {
          sortedProducts.sort((a, b) => {
            const getPrice = (product: any) => {
              const priceStr = product.price?.replace(/[^\d.]/g, "");
              return priceStr ? parseFloat(priceStr) : 0;
            };
            
            switch (filters.sortBy) {
              case 'price-low':
                return getPrice(a) - getPrice(b);
              case 'price-high':
                return getPrice(b) - getPrice(a);
              case 'rating':
                return (b.rating || 0) - (a.rating || 0);
              default:
                return (b.matchScore || 0) - (a.matchScore || 0);
            }
          });
        }
        return sortedProducts;
      });
      
      const sortLabels: Record<string, string> = {
        'price-low': 'Price: Low to High',
        'price-high': 'Price: High to Low',
        'rating': 'Highest Rated',
        'relevance': 'Relevance'
      };
      
      // Results sorted - no notification needed
      
      return;
    }
    
    // Reset loading state and clear previous results
    setLoading(true);
    // No longer changing searchStable state to prevent UI movement
    
    // Clear any existing timeout to prevent race conditions
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // Declare safetyTimeout at the function scope level so it can be accessed in the finally block
    const safetyTimeout: NodeJS.Timeout | null = null;
    
    if (excelLoading || !allExcelProducts || allExcelProducts.length === 0) {
      // Product data loading - no notification needed
      console.log("Product data is still loading or unavailable");
      setLoading(false);
      // No longer using searchStable state
      return;
    }
    if (!query.trim()) {
      setProducts([]);
      setLoading(false); // Ensure loading is false for empty query
      return;
    }
    setLastQuery(query);
    
    // Store the current filters without sortBy for search
    const searchFilters = { ...filters };
    delete searchFilters.sortBy; // Remove sortBy from search filters
    
    // IMMEDIATE RESULTS: Show initial results immediately
    const q = normalize(query.trim());

    try {
      // ULTRA-FAST SEARCH: Process all products instantly without any delays
      // Filter allExcelProducts by product name (normalized for better matching)
      
      // ULTRA-FAST FILTERING: Process all products instantly
      let filtered = allExcelProducts.filter(p => {
        // Fast string matching - check title first (most common match)
        const normalizedTitle = normalize(p.title);
        const matchesTitle = normalizedTitle.includes(q);
        
        // Only check keywords if title doesn't match (optimization)
        let matchesKeywords = false;
        if (!matchesTitle && p.keywords) {
          const normalizedKeywords = normalize(p.keywords);
          matchesKeywords = normalizedKeywords.includes(q);
        }
        
        // Fast match scoring and filtering
        if (matchesTitle && p.keywords && normalize(p.keywords).includes(q)) {
          p.matchScore = 2; // Both title and keywords match
        } else if (matchesTitle || matchesKeywords) {
          p.matchScore = 1; // Single match
        } else {
          return false; // No match - filter out immediately
        }
        
        // Then apply all other filters
        if (Object.keys(searchFilters).length > 0) {
          // Price range filter
          if (searchFilters.minPrice !== undefined || searchFilters.maxPrice !== undefined) {
            const priceStr = p.price?.replace(/[^\d.]/g, "");
            if (!priceStr) return false;
            
            const price = parseFloat(priceStr);
            if (isNaN(price)) return false;
            
            const minPrice = searchFilters.minPrice !== undefined ? searchFilters.minPrice : 0;
            const maxPrice = searchFilters.maxPrice !== undefined ? searchFilters.maxPrice : Infinity;
            
            if (price < minPrice || price > maxPrice) return false;
          }
          
          // Platform filter
          if (searchFilters.platforms && searchFilters.platforms.length > 0) {
            if (!searchFilters.platforms.includes(p.platform)) return false;
          }
          
          // Brand filter
          if (searchFilters.brands && searchFilters.brands.length > 0) {
            if (!searchFilters.brands.includes(p.brand)) return false;
          }
          
          // Note: Category and gender filters removed due to type definition constraints
        }
        
        return true;
      });

      // Platform priority mapping (higher number = higher priority)
      const platformPriority = {
        'neuro': 100,
        'neurogum': 100,
        'dot': 90,
        'dotkey': 90,
        'minimalist': 85,
        'meesho': 80,
        'ajio': 75,
        'flipkart': 40,
        'amazon': 20
      };
      
      const getPlatformPriority = (platform: string) => {
        const norm = platform.toLowerCase();
        for (const [key, priority] of Object.entries(platformPriority)) {
          if (norm.includes(key)) return priority;
        }
        return 50; // Default priority for unknown platforms
      };
      
      // Randomize results first, then apply platform prioritization
      filtered = [...filtered].sort(() => Math.random() - 0.5);
      
      // --- Platform and category interleaving logic ---
      // Split by platform and favor fashion/women's items
      const isMeesho = (p: Product) => (p.platform || '').toLowerCase().includes('meesho');
      const isAjio = (p: Product) => (p.platform || '').toLowerCase().includes('ajio');
      const isAmazon = (p: Product) => (p.platform || '').toLowerCase().includes('amazon');
      const isFashion = (p: Product) => {
        const searchText = `${p.title} ${p.keywords || ''}`.toLowerCase();
        const womensFashionKeywords = [
          'women', 'ladies', 'girl', 'female', 'dress', 'saree', 'kurti', 'lehenga', 'blouse',
          'top', 'shirt', 'jeans', 'pants', 'skirt', 'ethnic', 'western', 'indo-western',
          'handbag', 'purse', 'jewelry', 'earrings', 'necklace', 'bracelet', 'ring',
          'footwear', 'heels', 'sandals', 'flats', 'boots', 'makeup', 'cosmetics',
          'lipstick', 'foundation', 'mascara', 'eyeshadow', 'nail polish', 'skincare',
          'face cream', 'serum', 'moisturizer', 'sunscreen', 'hair care', 'shampoo',
          'conditioner', 'hair oil', 'styling', 'fashion', 'style', 'trendy', 'chic'
        ];
        const generalFashionKeywords = [
          'clothing', 'apparel', 'wear', 'outfit', 'fashion', 'style', 'trendy',
          'accessories', 'watch', 'sunglasses', 'belt', 'wallet', 'bag', 'shoes',
          'sneakers', 'casual', 'formal', 'party', 'wedding', 'festive'
        ];
        const hasWomensFashion = womensFashionKeywords.some(keyword => searchText.includes(keyword));
        const hasGeneralFashion = generalFashionKeywords.some(keyword => searchText.includes(keyword));
        return hasWomensFashion || hasGeneralFashion;
      };
      // Meesho should be most dominant, then Ajio, then Amazon
      const meeshoFashion = filtered.filter(p => isMeesho(p) && isFashion(p));
      const ajioFashion = filtered.filter(p => isAjio(p) && isFashion(p));
      const amazonFashion = filtered.filter(p => isAmazon(p) && isFashion(p));
      const flipkartFashion = filtered.filter(p => (p.platform || '').toLowerCase().includes('flipkart') && isFashion(p));
      const otherFashion = filtered.filter(p => !isMeesho(p) && !isAjio(p) && !isAmazon(p) && !((p.platform || '').toLowerCase().includes('flipkart')) && isFashion(p));
      const mixedMeesho = [...meeshoFashion].sort(() => 0.5 - Math.random());
      const mixedAjio = [...ajioFashion].sort(() => 0.5 - Math.random());
      const mixedAmazon = [...amazonFashion].sort(() => 0.5 - Math.random());
      const mixedFlipkart = [...flipkartFashion].sort(() => 0.5 - Math.random());
      const mixedOther = [...otherFashion].sort(() => 0.5 - Math.random());
      // Interleave: 2 Meesho, 1 Ajio, 1 Amazon, 1 Flipkart, then fill with others
      const interleaved: Product[] = [];
      let i = 0, j = 0, k = 0, l = 0, m = 0;
      while (interleaved.length < filtered.length && (i < mixedMeesho.length || j < mixedAjio.length || k < mixedAmazon.length || l < mixedFlipkart.length || m < mixedOther.length)) {
        // Add up to 2 Meesho
        for (let x = 0; x < 2 && i < mixedMeesho.length && interleaved.length < filtered.length; x++, i++) {
          interleaved.push(mixedMeesho[i]);
        }
        // Add 1 Ajio
        if (j < mixedAjio.length && interleaved.length < filtered.length) {
          interleaved.push(mixedAjio[j++]);
        }
        // Add 1 Amazon
        if (k < mixedAmazon.length && interleaved.length < filtered.length) {
          interleaved.push(mixedAmazon[k++]);
        }
        // Add 1 Flipkart
        if (l < mixedFlipkart.length && interleaved.length < filtered.length) {
          interleaved.push(mixedFlipkart[l++]);
        }
        // Add 1 Other
        if (m < mixedOther.length && interleaved.length < filtered.length) {
          interleaved.push(mixedOther[m++]);
        }
      }
      // Fill up with any remaining
      while (interleaved.length < filtered.length && i < mixedMeesho.length) interleaved.push(mixedMeesho[i++]);
      while (interleaved.length < filtered.length && j < mixedAjio.length) interleaved.push(mixedAjio[j++]);
      while (interleaved.length < filtered.length && k < mixedAmazon.length) interleaved.push(mixedAmazon[k++]);
      while (interleaved.length < filtered.length && l < mixedFlipkart.length) interleaved.push(mixedFlipkart[l++]);
      while (interleaved.length < filtered.length && m < mixedOther.length) interleaved.push(mixedOther[m++]);
      // Fill with non-fashion if still not enough
      const nonFashion = filtered.filter(p => !isFashion(p));
      let nonFashionIdx = 0;
      while (interleaved.length < filtered.length && nonFashionIdx < nonFashion.length) {
        interleaved.push(nonFashion[nonFashionIdx++]);
      }
      setProducts(interleaved);
      
      // Update lastQuery to track the current query for future sort-only operations
      setLastQuery(query);
      
      // Create a description message that includes filter information
      const description = `Found ${filtered.length} products matching "${query}" across all platforms. Results are ranked by relevance.`;
      
      // Add filter information if filters are applied
      const filterDescriptions = [];
      
      // Price range filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const minPrice = filters.minPrice !== undefined ? filters.minPrice : 0;
        const maxPrice = filters.maxPrice !== undefined ? filters.maxPrice : 'any';
        filterDescriptions.push(`Price: ₹${minPrice} - ₹${maxPrice === 'any' ? 'any' : maxPrice}`);
      }
      
      // Platform filter
      if (filters.platforms && filters.platforms.length > 0) {
        filterDescriptions.push(`Platforms: ${filters.platforms.join(', ')}`);
      }
      
      // Brand filter
      if (filters.brands && filters.brands.length > 0) {
        filterDescriptions.push(`Brands: ${filters.brands.length > 2 ? filters.brands.length + ' selected' : filters.brands.join(', ')}`);
      }
      
      // Rating filter
      if (filters.minRating !== undefined) {
        filterDescriptions.push(`Min Rating: ${filters.minRating}+`);
      }

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      }); // Only show error toast, no success/completion/product count toasts
    } finally {
      // Immediately set loading to false for instant results
      setLoading(false);
      setHasSearched(true);
    }
  };

  const handleSuggestionClick = (query: string) => {
    // Log the query to verify it's being passed correctly
    console.log('Suggestion clicked with query:', query);
    // Call handleSearch with the query and empty filters
    handleSearch(query, {});
  };

  const clearSearchResults = () => {
    setProducts([]);
    setHasSearched(false);
    setLastQuery("");
    if (onResultsStateChange) {
      onResultsStateChange(false);
    }
  };

  // Use the specific platforms from Real-data/Scrap data folders
  const platforms = [
    'Amazon',
    'FLipkart',
    'Meesho',
    'Ajio',
    'DermaCo',
    'Dot&Key',
    'Minimalist',
    'Neuro Gum',
    'ALL MAN'
  ];
  

  return (
    <div className="space-y-2 sm:space-y-3 max-w-7xl mx-auto pt-0 relative">


      <SearchForm 
        onSearch={handleSearch} 
        loading={loading}
        excelLoading={excelLoading}
        availablePlatforms={platforms}
        availableBrands={availableBrands}
        hasSearchResults={products.length > 0}
      />

      {excelLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
          <span className="text-lg text-blue-700">Loading products from all platforms...</span>
        </div>
      ) : products.length > 0 ? (
        <ProductList 
          products={products}
          allProducts={allExcelProducts}
        />
      ) : hasSearched && products.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-4">
          <div className="mb-6">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4 max-w-md">
            We couldn't find any products matching your search. Please check the spelling and try searching again.
          </p>
          <div className="text-sm text-gray-400">
            <p>Try using different keywords or check for typos</p>
          </div>
        </div>
      ) : !loading && (
        <PersonalizedFeed 
          personalizedProducts={personalizedFeed}
          allProducts={allExcelProducts}
          onProductClick={(product) => {
            console.log('Product clicked:', product.title);
          }}
          onRefreshFeed={onRefreshFeed}
        />
      )}
    </div>
  );
};

function extractImage(row: any) {
  if (!row) return '/placeholder.svg';
  
  // Helper function to normalize text
  const normalize = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  };
  
  // Find the first key that matches 'image' or 'Product Image' using normalize function
  const imageKey = Object.keys(row).find(k => {
    const normalizedKey = normalize(k);
    return normalizedKey === 'image' || normalizedKey === 'product image';
  });
  
  let image = imageKey ? row[imageKey] : '';
  if (typeof image === 'string') image = image.trim();
  if (!image) image = '/placeholder.svg';
  return image;
}

export default SearchPage;
