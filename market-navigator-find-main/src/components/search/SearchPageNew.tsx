  // Utility: strict interleaving with strong Meesho/Ajio bias and Amazon cap
  const mixWithBias = (
    m: Product[], a: Product[], z: Product[], o: Product[],
    maxAmazonRatio = 0.25
  ): Product[] => {
    const res: Product[] = [];
    let iM = 0, iA = 0, iZ = 0, iO = 0;
    let amazonUsed = 0;
    const totalCount = () => res.length;
    let lastWasAmazon = false;

    while (iM < m.length || iA < a.length || iZ < z.length || iO < o.length) {
      // Push two Meesho if available
      for (let i = 0; i < 2 && iM < m.length; i++) {
        res.push(m[iM++]);
        lastWasAmazon = false;
      }
      // Push one Ajio if available
      if (iA < a.length) {
        res.push(a[iA++]);
        lastWasAmazon = false;
      }
      // Only allow Amazon if:
      // - not consecutive
      // - current amazon ratio < maxAmazonRatio
      // - item available
      const currentRatio = totalCount() > 0 ? amazonUsed / totalCount() : 0;
      if (iZ < z.length && !lastWasAmazon && currentRatio < maxAmazonRatio) {
        res.push(z[iZ++]);
        amazonUsed++;
        lastWasAmazon = true;
      } else {
        lastWasAmazon = false;
      }
      // Add one from others if available
      if (iO < o.length) {
        res.push(o[iO++]);
        lastWasAmazon = false;
      }
      // Safety: if Meesho/Ajio drained but Amazon remains, still enforce cap
      if (iM >= m.length && iA >= a.length && iO >= o.length && iZ < z.length) {
        const ratio = totalCount() > 0 ? amazonUsed / totalCount() : 0;
        if (ratio >= maxAmazonRatio) break; // stop adding extra Amazon
        if (!lastWasAmazon) {
          res.push(z[iZ++]);
          amazonUsed++;
          lastWasAmazon = true;
        } else {
          // insert a spacer from any available non-Amazon if exists
          if (iO < o.length) { res.push(o[iO++]); lastWasAmazon = false; }
          else break;
        }
      }
    }
    // Append remaining non-Amazon respecting bias order
    while (iM < m.length) res.push(m[iM++]);
    while (iA < a.length) res.push(a[iA++]);
    while (iO < o.length) res.push(o[iO++]);
    // Do not append exceeding Amazon
    return res;
  };
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import SearchForm from "./SearchForm";
import { getCountryConfig, getAllBrands } from "@/utils/productGenerator";
import { supabase } from "@/integrations/supabase/client";
// Removed in-app toasts as requested
import { personalizationEngine } from "@/utils/personalization";
import { Product, SearchFilters } from "@/types/product";
import ProductList from "./ProductList";
import PersonalizedFeed from "./PersonalizedFeed";

interface SearchPageNewProps {
  allExcelProducts: Product[];
  excelLoading: boolean;
  excelError: string | null;
  platformLoadingStatus?: { [platform: string]: 'loading' | 'loaded' | 'error' };
  currentLoadingPlatform?: string;
}

const SearchPageNew = ({ 
  allExcelProducts, 
  excelLoading, 
  excelError, 
  platformLoadingStatus = {}, 
  currentLoadingPlatform = '' 
}: SearchPageNewProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [countryConfig, setCountryConfig] = useState<any>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [currentCountry, setCurrentCountry] = useState<string>('US');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prefer fashion/face-wash/footwear categories on home
  const isPreferredCategory = (p: Product) => {
    const text = `${p.title || ''} ${p.keywords || ''}`.toLowerCase();
    const keywords = [
      'women', 'kurti', 'saree', 'dress', 'top', 'tshirt', 'shirt', 'jeans', 'leggings', 'salwar', 'ethnic',
      'men', 'tracks', 'jogger', 'hoodie', 'jacket', 'cargo', 'pant',
      'shoe', 'sandal', 'sneaker', 'flip flop', 'footwear',
      'face wash', 'cleanser', 'facewash', 'skin', 'beauty', 'cosmetic'
    ];
    return keywords.some(k => text.includes(k));
  };

  // Generate interleaved, Meesho/Ajio-favored mixed feed for Home from Supabase data only
  const homeMixedFeed = useMemo(() => {
    if (excelLoading || !allExcelProducts || allExcelProducts.length === 0) {
      return [] as Product[];
    }

    // Use Fisher-Yates shuffle for better performance
    const shuffle = (arr: Product[]) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Pre-filter products by platform for better performance
    const meeshoProducts: Product[] = [];
    const ajioProducts: Product[] = [];
    const amazonProducts: Product[] = [];
    const otherProducts: Product[] = [];

    // Single pass through products for better performance
    for (const p of allExcelProducts) {
      const plat = (p.platform || '').toLowerCase();
      if (plat.includes('meesho')) meeshoProducts.push(p);
      else if (plat.includes('ajio')) ajioProducts.push(p);
      else if (plat.includes('amazon')) amazonProducts.push(p);
      else otherProducts.push(p);
    }

    // Within each platform, prioritize preferred categories, then others
    const prioritize = (list: Product[]) => {
      const preferred: Product[] = [];
      const rest: Product[] = [];
      
      // Single pass categorization for better performance
      for (const p of list) {
        if (isPreferredCategory(p)) preferred.push(p);
        else rest.push(p);
      }
      
      return [...shuffle(preferred), ...shuffle(rest)];
    };

    const m = prioritize(meeshoProducts);
    const a = prioritize(ajioProducts);
    const z = prioritize(amazonProducts); // keep least frequent
    const o = prioritize(otherProducts);

    const result = mixWithBias(m, a, z, o, 0.22); // ~max 22% Amazon
    return result;
  }, [allExcelProducts, excelLoading]); // Include excelLoading to update when data loads

  // Post-process head to avoid grouped first rows and reduce Amazon dominance at top
  const enforceHeadConstraints = (list: Product[], headSize = 12, maxAmazonInHead = 3): Product[] => {
    const head = list.slice(0, headSize);
    const tail = list.slice(headSize);
    const isAmazon = (p: Product) => (p.platform || '').toLowerCase().includes('amazon');
    const nonAmazonFromTail: Product[] = [];
    const amazonFromHead: Product[] = [];
    // Separate excess Amazon from head
    let amazonCount = 0;
    const newHead: Product[] = [];
    for (const p of head) {
      if (isAmazon(p)) {
        if (amazonCount < maxAmazonInHead) {
          // allow if not consecutive Amazon
          if (newHead.length === 0 || !isAmazon(newHead[newHead.length - 1])) {
            newHead.push(p);
            amazonCount++;
          } else {
            amazonFromHead.push(p);
          }
        } else {
          amazonFromHead.push(p);
        }
      } else {
        newHead.push(p);
      }
    }
    // Pull non-Amazon from tail to fill gaps in head
    for (const p of tail) {
      if (!isAmazon(p)) nonAmazonFromTail.push(p);
    }
    let i = 0;
    while (newHead.length < headSize && i < nonAmazonFromTail.length) {
      // avoid consecutive Amazon by construction (we only insert non-Amazon)
      newHead.push(nonAmazonFromTail[i++]);
    }
    // Rebuild list: adjusted head + remaining tail (with moved items removed)
    const usedSet = new Set(nonAmazonFromTail.slice(0, i).map(p => p));
    const rebuiltTail = tail.filter(p => !usedSet.has(p)).concat(amazonFromHead);
    return [...newHead, ...rebuiltTail];
  };

  useEffect(() => {
    initializeUserData();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

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
      
      // Notifications removed
      
      setLoading(false);
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (excelLoading || !allExcelProducts || allExcelProducts.length === 0) {
      // Notifications removed
      setLoading(false);
      return;
    }
    
    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    setLastQuery(query);
    
    try {
      const searchFilters = { ...filters };
      delete searchFilters.sortBy;
      
      const q = normalize(query.trim());

      // QUICK PASS: show immediate, already-interleaved results to avoid blank screen - optimized
      // Do a lightweight filter on a capped subset, then mix with bias and render immediately
      try {
        // Balanced, per-platform sampling to avoid grouped-first paint
        const cap = { meesho: 40, ajio: 30, amazon: 20, other: 20 }; // Increased caps for faster loading
        const buckets = { meesho: [] as Product[], ajio: [] as Product[], amazon: [] as Product[], other: [] as Product[] };

        // Optimized search with early termination
        let totalFound = 0;
        const maxResults = 110; // Total cap for quick pass
        
        for (let i = 0; i < allExcelProducts.length && totalFound < maxResults; i++) {
          const p = allExcelProducts[i];
          const t = normalize(p.title);
          const k = p.keywords ? normalize(p.keywords) : '';
          if (!(t.includes(q) || k.includes(q))) continue;

          const pl = (p.platform || '').toLowerCase();
          let added = false;
          
          if (pl.includes('meesho') && buckets.meesho.length < cap.meesho) {
            buckets.meesho.push(p);
            added = true;
          } else if (pl.includes('ajio') && buckets.ajio.length < cap.ajio) {
            buckets.ajio.push(p);
            added = true;
          } else if (pl.includes('amazon') && buckets.amazon.length < cap.amazon) {
            buckets.amazon.push(p);
            added = true;
          } else if (buckets.other.length < cap.other) {
            buckets.other.push(p);
            added = true;
          }
          
          if (added) totalFound++;
        }

        if (totalFound > 0) {
          // Optimized shuffle using Fisher-Yates
          const shuffle = (arr: Product[]) => {
            const shuffled = [...arr];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
          };
          
          const prioritize = (list: Product[]) => {
            const preferred: Product[] = [];
            const rest: Product[] = [];
            for (const p of list) {
              if (isPreferredCategory(p)) preferred.push(p);
              else rest.push(p);
            }
            return [...shuffle(preferred), ...shuffle(rest)];
          };
          
          const mixedQuick = enforceHeadConstraints(
            mixWithBias(
              prioritize(buckets.meesho),
              prioritize(buckets.ajio),
              prioritize(buckets.amazon),
              prioritize(buckets.other),
              0.22
            )
          ).slice(0, 30); // Show more results initially

          // Show immediately; keep loading true while full search proceeds
          setProducts(mixedQuick);
          setNoResults(false);
        }
      } catch (e) {
        console.debug('Quick pass failed, continuing with full search', e);
      }

      console.log('Searching with country:', currentCountry);
      console.log('Using country config:', countryConfig);
      
      let filtered: Product[] = [];
      const batchSize = 1000;
      const totalProducts = allExcelProducts.length;
      
      for (let i = 0; i < totalProducts; i += batchSize) {
        const batch = allExcelProducts.slice(i, i + batchSize);
        
        const batchResults = batch.filter(p => {
          const normalizedTitle = normalize(p.title);
          const normalizedKeywords = p.keywords ? normalize(p.keywords) : '';
          
          const matchesTitle = normalizedTitle.includes(q);
          const matchesKeywords = normalizedKeywords.includes(q);
          
          if (matchesTitle && matchesKeywords) {
            (p as any).matchScore = 2;
          } else if (matchesTitle || matchesKeywords) {
            (p as any).matchScore = 1;
          } else {
            (p as any).matchScore = 0;
            return false;
          }
          
          if (Object.keys(searchFilters).length > 0) {
            if (searchFilters.minPrice !== undefined || searchFilters.maxPrice !== undefined) {
              const priceStr = p.price?.replace(/[^\d.]/g, "");
              if (!priceStr) return false;
              
              const price = parseFloat(priceStr);
              if (isNaN(price)) return false;
              
              const minPrice = searchFilters.minPrice !== undefined ? searchFilters.minPrice : 0;
              const maxPrice = searchFilters.maxPrice !== undefined ? searchFilters.maxPrice : Infinity;
              
              if (!(price >= minPrice && price <= maxPrice)) {
                return false;
              }
            }
            
            if (searchFilters.platforms && searchFilters.platforms.length > 0) {
              const platform = normalize(p.platform);
              const matchesPlatform = searchFilters.platforms.some(fp => {
                return platform === normalize(fp);
              });
              if (!matchesPlatform) return false;
            }
            
            if (searchFilters.brands && searchFilters.brands.length > 0) {
              const brand = normalize(p.brand || p.title);
              const matchesBrand = searchFilters.brands.some(fb => {
                return brand.includes(normalize(fb));
              });
              if (!matchesBrand) return false;
            }
            
            if (searchFilters.minRating !== undefined && p.rating !== undefined) {
              if (p.rating < searchFilters.minRating) return false;
            }
          }
          
          return true;
        });
        
        filtered = filtered.concat(batchResults);
        
        if (i + batchSize < totalProducts) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      filtered.sort((a, b) => {
        const scoreA = (a as any).matchScore || 0;
        const scoreB = (b as any).matchScore || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        if (filters.sortBy) {
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
              return 0;
          }
        }
        return 0;
      });
      
      // Build a mixed/interleaved list when no explicit sort is selected
      let finalResults: Product[];
      if (!filters.sortBy) {
        const byPlatform = {
          meesho: [] as Product[],
          ajio: [] as Product[],
          amazon: [] as Product[],
          other: [] as Product[],
        };
        const shuffle = (arr: Product[]) => [...arr].sort(() => Math.random() - 0.5);
        filtered.forEach(p => {
          const plat = (p.platform || '').toLowerCase();
          if (plat.includes('meesho')) byPlatform.meesho.push(p);
          else if (plat.includes('ajio')) byPlatform.ajio.push(p);
          else if (plat.includes('amazon')) byPlatform.amazon.push(p);
          else byPlatform.other.push(p);
        });

        // Personalize first, then enforce distribution via mixing
        const personalizedPre = personalizationEngine.personalizeProducts(filtered);
        const platOf = (p: Product) => (p.platform || '').toLowerCase();
        const m = personalizedPre.filter(p => platOf(p).includes('meesho'));
        const a = personalizedPre.filter(p => platOf(p).includes('ajio'));
        const z = personalizedPre.filter(p => platOf(p).includes('amazon'));
        const o = personalizedPre.filter(p => !platOf(p).includes('meesho') && !platOf(p).includes('ajio') && !platOf(p).includes('amazon'));
        const prioritize = (list: Product[]) => {
          const preferred = list.filter(isPreferredCategory);
          const rest = list.filter(p => !isPreferredCategory(p));
          return [...shuffle(preferred), ...shuffle(rest)];
        };
        finalResults = enforceHeadConstraints(
          mixWithBias(prioritize(m), prioritize(a), prioritize(z), prioritize(o), 0.22)
        );
      } else {
        // Respect explicit sort but still personalize order
        finalResults = personalizationEngine.personalizeProducts(filtered);
      }

      // Update today's search count for real-time tracking
      const currentCount = parseInt(localStorage.getItem('todaySearchCount') || '0');
      localStorage.setItem('todaySearchCount', (currentCount + 1).toString());

      // Commit results
      setProducts(finalResults);
      setNoResults(finalResults.length === 0);
      setLastQuery(query);
      let description = `Found ${filtered.length} products matching "${query}" across all platforms. Results are ranked by relevance.`;
      
      const filterDescriptions = [];
      
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const minPrice = filters.minPrice !== undefined ? filters.minPrice : 0;
        const maxPrice = filters.maxPrice !== undefined ? filters.maxPrice : 'any';
        filterDescriptions.push(`Price: ₹${minPrice} - ₹${maxPrice === 'any' ? 'any' : maxPrice}`);
      }
      
      if (filters.platforms && filters.platforms.length > 0) {
        filterDescriptions.push(`Platforms: ${filters.platforms.join(', ')}`);
      }
      
      if (filters.brands && filters.brands.length > 0) {
        filterDescriptions.push(`Brands: ${filters.brands.length > 2 ? filters.brands.length + ' selected' : filters.brands.join(', ')}`);
      }
      
      if (filters.minRating !== undefined) {
        filterDescriptions.push(`Min Rating: ${filters.minRating}+`);
      }
      
      if (filters.sortBy) {
        const sortLabels: Record<string, string> = {
          'price-low': 'Price: Low to High',
          'price-high': 'Price: High to Low',
          'rating': 'Highest Rated',
          'relevance': 'Relevance'
        };
        filterDescriptions.push(`Sort: ${sortLabels[filters.sortBy] || filters.sortBy}`);
      }
      
      if (filterDescriptions.length > 0) {
        description += ` Filters: ${filterDescriptions.join(' | ')}`;
      }
      // Notifications removed
      console.log('[SearchPageNew] Search completed:', description);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            query,
            filters: filters as any,
            results_count: filtered.length,
            timestamp: new Date().toISOString()
          });
      } else {
        // Handle guest user search history in localStorage
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const guestUserId = localStorage.getItem('guestUserId');
        
        if (isGuest && guestUserId) {
          const guestHistoryKey = `searchHistory_guest_${guestUserId}`;
          const existingHistory = localStorage.getItem(guestHistoryKey);
          const historyArray = existingHistory ? JSON.parse(existingHistory) : [];
          
          const newSearchEntry = {
            id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            query,
            filters: filters as any,
            results_count: filtered.length,
            timestamp: new Date().toISOString()
          };
          
          // Add new search to beginning of array and limit to 50 entries
          historyArray.unshift(newSearchEntry);
          const limitedHistory = historyArray.slice(0, 50);
          
          localStorage.setItem(guestHistoryKey, JSON.stringify(limitedHistory));
          console.log('[SearchPageNew] Guest search history saved:', newSearchEntry);
        }
      }

      // Trigger event for weekly chart and history updates AFTER database/localStorage save
      window.dispatchEvent(new CustomEvent('searchPerformed'));

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
  };

  const handleSuggestionClick = (query: string) => {
    console.log('Suggestion clicked with query:', query);
    handleSearch(query, {});
  };

  // Dynamically derive available platforms from loaded products - use exact folder names
  const platforms = useMemo(() => {
    const seen = new Set<string>();
    for (const p of allExcelProducts || []) {
      const platformName = (p.platform || '').toString().trim();
      if (platformName) {
        seen.add(platformName); // Use exact folder name as platform name
      }
    }
    return Array.from(seen).sort();
  }, [allExcelProducts]);

  return (
    <div className="space-y-2 sm:space-y-3 max-w-7xl mx-auto">
      {products.length > 0 && (
        <div className="flex items-center justify-start px-1">
          <button
            onClick={() => { setProducts([]); setNoResults(false); }}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition"
            aria-label="Back to Home"
            title="Back to Home"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </button>
        </div>
      )}
      <SearchForm 
        onSearch={handleSearch} 
        loading={loading}
        excelLoading={excelLoading}
        availablePlatforms={platforms}
        availableBrands={availableBrands}
        hasSearchResults={products.length > 0}
      />

      {noResults && !loading && (
        <div className="mx-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No results found. Please check the spelling and try again.
        </div>
      )}

      {excelLoading ? (
        <div className="flex flex-col justify-center items-center min-h-[200px] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-700 mb-2">Loading Products from Multiple Platforms</div>
            {currentLoadingPlatform && (
              <div className="text-md text-blue-600 mb-3">
                Currently loading from: <span className="font-medium">{currentLoadingPlatform}</span>
              </div>
            )}
            
            {/* Platform loading status list */}
            <div className="space-y-1 text-sm max-w-md">
              {Object.entries(platformLoadingStatus).map(([platform, status]) => (
                <div key={platform} className="flex items-center justify-between px-3 py-1 rounded">
                  <span className="text-gray-700">{platform}</span>
                  <div className="flex items-center space-x-2">
                    {status === 'loading' && (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-blue-600 font-medium">Loading...</span>
                      </>
                    )}
                    {status === 'loaded' && (
                      <>
                        <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-green-600 font-medium">Loaded</span>
                      </>
                    )}
                    {status === 'error' && (
                      <>
                        <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-red-600 font-medium">Error</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : products.length > 0 ? (
        <PersonalizedFeed
          personalizedProducts={products}
          allProducts={allExcelProducts}
          onProductClick={(product) => {
            console.log('Product clicked:', product.title);
          }}
        />
      ) : !loading && (
        <PersonalizedFeed
          personalizedProducts={homeMixedFeed}
          allProducts={allExcelProducts}
          onProductClick={(product) => {
            console.log('Product clicked:', product.title);
          }}
        />
      )}
      

    </div>
  );
};

export default SearchPageNew;
