import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Star, Truck, Clock, GitCompare, Heart, TrendingUp, PlusCircle } from "lucide-react";
import { Product, SearchFilters } from "@/types/product";
import { useState } from "react";
import ProductDetailModal from "./ProductDetailModal";
import AdvancedFilters from "./AdvancedFilters";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";

interface EnhancedSearchResultsProps {
  products: Product[];
  searchQuery: string;
  availablePlatforms: string[];
  availableBrands: string[];
}

const EnhancedSearchResults = ({ 
  products, 
  searchQuery, 
  availablePlatforms, 
  availableBrands 
}: EnhancedSearchResultsProps) => {
  const [compareList, setCompareList] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the product modal
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''} has been added to your cart.`,
      duration: 3000,
    });
  };

  const handleShopNow = (product: Product) => {
    // Create search URLs with the product title for better search results
    const searchTerm = product.title || searchQuery;
    const encodedSearch = encodeURIComponent(searchTerm);
    
    const platformUrls = {
      'Amazon India': `https://www.amazon.in/s?k=${encodedSearch}`,
      'Flipkart': `https://www.flipkart.com/search?q=${encodedSearch}`,
      'Meesho': `https://www.meesho.com/search?q=${encodedSearch}`,
      'Myntra': `https://www.myntra.com/search?q=${encodedSearch}`,
      'Snapdeal': `https://www.snapdeal.com/search?keyword=${encodedSearch}`,
      'Amazon': `https://www.amazon.com/s?k=${encodedSearch}`,
      'eBay': `https://www.ebay.com/sch/i.html?_nkw=${encodedSearch}`,
      'Walmart': `https://www.walmart.com/search?q=${encodedSearch}`,
      'Best Buy': `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedSearch}`,
      'Target': `https://www.target.com/s?searchTerm=${encodedSearch}`,
      'Amazon UK': `https://www.amazon.co.uk/s?k=${encodedSearch}`,
      'eBay UK': `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}`,
      'Argos': `https://www.argos.co.uk/search/${encodedSearch}`,
      'Currys': `https://www.currys.co.uk/search?q=${encodedSearch}`,
      'John Lewis': `https://www.johnlewis.com/search?search-term=${encodedSearch}`
    };

    const url = platformUrls[product.platform as keyof typeof platformUrls];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback to Google search if platform not found
      window.open(`https://www.google.com/search?q=${encodedSearch}`, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleCompare = (productId: string) => {
    setCompareList(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      'Amazon': 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
      'Amazon India': 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
      'Amazon UK': 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
      'Flipkart': 'bg-gradient-to-r from-blue-500 to-blue-700 text-white',
      'Meesho': 'bg-gradient-to-r from-pink-500 to-pink-700 text-white',
      'Myntra': 'bg-gradient-to-r from-purple-500 to-purple-700 text-white',
      'Snapdeal': 'bg-gradient-to-r from-red-500 to-red-700 text-white',
      'AliExpress': 'bg-gradient-to-r from-red-500 to-red-700 text-white',
      'eBay': 'bg-gradient-to-r from-yellow-500 to-yellow-700 text-white',
      'eBay UK': 'bg-gradient-to-r from-yellow-500 to-yellow-700 text-white',
      'Walmart': 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
      'Best Buy': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      'Target': 'bg-gradient-to-r from-red-400 to-red-600 text-white',
      'Argos': 'bg-gradient-to-r from-red-400 to-red-600 text-white',
      'Currys': 'bg-gradient-to-r from-blue-500 to-blue-700 text-white',
      'John Lewis': 'bg-gradient-to-r from-green-500 to-green-700 text-white',
    };
    return colors[platform as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-gray-700 text-white';
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    return stars;
  };

  // Apply client-side filtering and sorting
  const getFilteredProducts = () => {
    let filtered = [...products]; // Create a copy to avoid mutating original array

    // Filter out products with missing prices or prices with 5 or more digits
    filtered = filtered.filter(product => {
      // Skip products with no price or empty price string
      if (!product.price || product.price.trim() === '') return false;
      
      // Parse the price and skip if it's not a valid number
      const priceStr = product.price.replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr);
      if (isNaN(price) || price === 0) return false;
      
      // Skip products with 5 or more digits (10000 or higher)
      if (price >= 10000) return false;
      
      return true;
    });

    // Apply filters first
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price.replace(/[^0-9.]/g, ''));
        if (filters.minPrice && price < filters.minPrice) return false;
        if (filters.maxPrice && price > filters.maxPrice) return false;
        return true;
      });
    }

    if (filters.platforms && filters.platforms.length > 0) {
      filtered = filtered.filter(product => 
        filters.platforms.includes(product.platform)
      );
    }

    if (filters.brands && filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand)
      );
    }

    if (filters.minRating) {
      filtered = filtered.filter(product => 
        (product.rating || 0) >= filters.minRating
      );
    }

    // Apply sorting independently of filters
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price-low':
            return parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''));
          case 'price-high':
            return parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, ''));
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          default: // 'relevance' - maintain original order which is by relevance
            // If products have matchScore, use that for relevance sorting
            if (a.matchScore !== undefined && b.matchScore !== undefined) {
              return (b.matchScore || 0) - (a.matchScore || 0);
            }
            return 0;
        }
      });
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Compute available platforms, brands, price range, and ratings from filtered products
  const allPlatforms = Array.from(new Set(products.map(p => p.platform).filter(Boolean)));
  const allBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  const allPrices = products.map(p => parseFloat(p.price.replace(/[^0-9.]/g, ''))).filter(p => !isNaN(p));
  const minPrice = allPrices.length ? Math.min(...allPrices, 0) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices, 0) : 10000;
  const allRatings = products.map(p => p.rating).filter(r => typeof r === 'number' && !isNaN(r));
  const minRating = allRatings.length ? Math.min(...allRatings, 1) : 1;
  const maxRating = allRatings.length ? Math.max(...allRatings, 5) : 5;

  return (
    <>
      <div className="space-y-6">
        {/* Header with results info and compare */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                Results for "{searchQuery}"
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Found {filteredProducts.length} products across {availablePlatforms.length} platforms
              </p>
            </div>
            
            {compareList.length > 0 && (
              <Button className="bg-purple-600 hover:bg-purple-700">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare ({compareList.length})
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          availablePlatforms={allPlatforms}
          availableBrands={allBrands}
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minRating={minRating}
          maxRating={maxRating}
        />

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white border border-gray-200"
            >
              <div className="relative">
  <div 
    className="aspect-square bg-gray-50 overflow-hidden cursor-pointer"
    onClick={() => handleProductClick(product)}
  >
    <img
      src={product.image ? product.image : "/placeholder.svg"}
      alt={product.title}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={e => (e.currentTarget.src = '/placeholder.svg')}
    />
  </div>

              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {renderStars(product.rating)}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {product.rating}
                  </span>
                  {product.reviews && (
                    <span className="text-xs text-gray-500">
                      ({product.reviews.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
                
                {/* Shipping */}
                {product.shipping && (
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      {product.shipping}
                    </span>
                  </div>
                
                {/* Discount Badge */}
                {product.discount && (
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                    {product.discount}% OFF
                  </Badge>
                )}
                
                {/* Action Buttons */}
                <div className="absolute top-3 right-3 z-20">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product, e);
                    }}
                  >
                    <ShoppingCart className="h-3 w-3 text-gray-600" />
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 bg-white/90 hover:bg-white shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(product.id);
                    }}
                  >
                    <GitCompare className={`h-3 w-3 ${compareList.includes(product.id) ? 'text-purple-600' : 'text-gray-600'}`} />
                  </Button>
                </div>

                {/* Limited Stock Badge */}
                {product.availability?.toLowerCase().includes('limited') && (
                  <Badge className="absolute bottom-2 left-2 bg-red-500 text-white animate-pulse text-xs">
                    <Clock className="h-2 w-2 mr-1" />
                    Limited
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-3 space-y-2">
                <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5rem] text-gray-900 group-hover:text-purple-600 transition-colors">
                  {product.title}
                </h3>
                
                {/* Pricing */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {product.price && product.price.trim() !== '' && (
                      <span className="text-lg font-bold text-green-600">
                        {product.currency}{product.price}
                      </span>
                    )}
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        {product.currency}{product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {product.rating}
                    </span>
                    {product.reviews && (
                      <span className="text-xs text-gray-500">
                        ({product.reviews.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
                  
                  {/* Shipping */}
                  {product.shipping && (
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">
                        {product.shipping}
                      </span>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">by {product.seller}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      onClick={(e) => handleShopNow(product)}
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Buy Now
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 p-0 border border-gray-300 bg-white text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShopNow(product);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3">
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                  </div>
                </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your filters or search with different keywords.</p>
          </div>
        )}
      </div>

      <ProductDetailModal 
        product={selectedProduct}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default EnhancedSearchResults;
