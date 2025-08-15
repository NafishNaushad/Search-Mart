import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { Heart, ShoppingCart, ExternalLink, Sparkles, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { findSimilarProducts } from "@/utils/imageAnalysis";
import SimilarProductsModal from "./SimilarProductsModal";
import { addRecentlyViewed } from "@/utils/recentlyViewed";

// Platform colors matching ProductList
const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-orange-500 text-white",
  "amazon-scrap data": "bg-orange-500 text-white",
  flipkart: "bg-blue-600 text-white",
  "flipkart scrap-data": "bg-blue-600 text-white",
  meesho: "bg-pink-500 text-white",
  "meesho-scrap data": "bg-pink-500 text-white",
  ajio: "bg-purple-400 text-white",
  "ajio scrap-data": "bg-purple-400 text-white",
  ajioo: "bg-purple-400 text-white",
  minimalist: "bg-gray-700 text-white",
  derma: "bg-green-500 text-white",
  dotkey: "bg-yellow-400 text-white",
  neuro: "bg-blue-400 text-white",
  allman: "bg-gray-400 text-white",
};

function getPlatformDisplay(platform: string, id?: string) {
  let norm = platform || "";
  let folder = "";
  if (norm.match(/\.xlsx$/i) && id) {
    const match = id.match(/Real-data\/Scrap data\/([^/]+)\//); 
    if (match && match[1]) folder = match[1];
  }
  if (folder) norm = folder;
  norm = norm
    .replace(/\.xlsx$/i, "")
    .replace(/-/g, " ")
    .replace(/ scrap data/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(Xlsx|Data)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  let label = norm
    .replace(/\b\w/g, c => c.toUpperCase());
  if (norm.includes("amazon")) label = "Amazon";
  else if (norm.includes("flipkart")) label = "Flipkart";
  else if (norm.includes("meesho")) label = "Meesho";
  else if (norm.includes("ajio")) label = "Ajio";
  else if (norm.includes("minimalist")) label = "Minimalist";
  else if (norm.includes("derma")) label = "DermaCo";
  else if (norm.includes("dot")) label = "Dot & Key";
  else if (norm.includes("neuro")) label = "Neuro Gum";
  else if (norm.includes("all man")) label = "ALL MAN";
  const color =
    PLATFORM_COLORS[norm] ||
    (norm.includes("amazon") ? PLATFORM_COLORS["amazon"] :
    norm.includes("flipkart") ? PLATFORM_COLORS["flipkart"] :
    norm.includes("meesho") ? PLATFORM_COLORS["meesho"] :
    norm.includes("ajio") ? PLATFORM_COLORS["ajio"] :
    "bg-gray-400 text-white");
  return { label, color };
}

interface PersonalizedFeedProps {
  personalizedProducts: Product[];
  allProducts?: Product[]; // Full 17,000+ products for true infinite scroll
  onProductClick?: (product: Product) => void;
  onRefreshFeed?: () => void;
}

const PersonalizedFeed = ({ personalizedProducts, allProducts = [], onProductClick, onRefreshFeed }: PersonalizedFeedProps) => {
  // True infinite scroll through all 17,000+ products with no duplicates
  const PRODUCTS_PER_LOAD = 20; // Increased batch size for faster loading
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [usedProductIds, setUsedProductIds] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [similarProductsModal, setSimilarProductsModal] = useState({
    isOpen: false,
    referenceProduct: null as Product | null,
    similarProducts: [] as any[],
    loading: false
  });
  const { toast } = useToast();

  // Platform interleaving function - same logic as Index.tsx generatePersonalizedFeed
  const generateInterleavedBatch = useCallback((products: Product[], batchSize: number = PRODUCTS_PER_LOAD): Product[] => {
    if (products.length === 0) return [];
    
    // Separate by platform
    const meeshoProducts = products.filter(p => p.platform?.toLowerCase().includes('meesho'));
    const ajioProducts = products.filter(p => p.platform?.toLowerCase().includes('ajio'));
    const amazonProducts = products.filter(p => p.platform?.toLowerCase().includes('amazon'));
    const otherProducts = products.filter(p => 
      !p.platform?.toLowerCase().includes('meesho') && 
      !p.platform?.toLowerCase().includes('ajio') && 
      !p.platform?.toLowerCase().includes('amazon')
    );
    
    // Shuffle each platform's products
    const shuffledMeesho = [...meeshoProducts].sort(() => 0.5 - Math.random());
    const shuffledAjio = [...ajioProducts].sort(() => 0.5 - Math.random());
    const shuffledAmazon = [...amazonProducts].sort(() => 0.5 - Math.random());
    const shuffledOther = [...otherProducts].sort(() => 0.5 - Math.random());
    
    // Interleave with 2-3:1 ratio (Meesho/Ajio : Amazon)
    const result: Product[] = [];
    let meeshoIdx = 0, ajioIdx = 0, amazonIdx = 0, otherIdx = 0;
    
    while (result.length < batchSize && (meeshoIdx < shuffledMeesho.length || ajioIdx < shuffledAjio.length || amazonIdx < shuffledAmazon.length || otherIdx < shuffledOther.length)) {
      // Add 2 Meesho products
      for (let i = 0; i < 2 && meeshoIdx < shuffledMeesho.length && result.length < batchSize; i++) {
        result.push(shuffledMeesho[meeshoIdx++]);
      }
      // Add 1 Ajio product
      if (ajioIdx < shuffledAjio.length && result.length < batchSize) {
        result.push(shuffledAjio[ajioIdx++]);
      }
      // Add 1 Amazon product (less frequent)
      if (amazonIdx < shuffledAmazon.length && result.length < batchSize) {
        result.push(shuffledAmazon[amazonIdx++]);
      }
      // Add 1 other product
      if (otherIdx < shuffledOther.length && result.length < batchSize) {
        result.push(shuffledOther[otherIdx++]);
      }
    }
    
    return result;
  }, []);

  // Initialize with products from Supabase data
  useEffect(() => {
    if (personalizedProducts.length > 0) {
      // Show more products initially for faster perceived loading
      const initialBatch = personalizedProducts.slice(0, Math.min(30, personalizedProducts.length));
      setDisplayedProducts(initialBatch);
      setUsedProductIds(new Set(initialBatch.map(p => p.id)));
    } else {
      // Clear displayed products if no data available
      setDisplayedProducts([]);
      setUsedProductIds(new Set());
    }
  }, [personalizedProducts]);

  // Manual refresh function - called when refresh button is clicked
  const handleRefresh = useCallback(() => {
    if (onRefreshFeed) {
      onRefreshFeed(); // Let parent handle the refresh
    }
  }, [onRefreshFeed]);

  // Simple infinite scroll  // Load more products for infinite scroll - optimized for speed
  const loadMoreProducts = useCallback(() => {
    if (loadingMore || displayedProducts.length >= personalizedProducts.length) return;
    
    setLoadingMore(true);
    
    // Immediate loading for better performance - no artificial delay
    const nextBatch = personalizedProducts.slice(
      displayedProducts.length, 
      displayedProducts.length + PRODUCTS_PER_LOAD
    );
    
    if (nextBatch.length > 0) {
      setDisplayedProducts(prev => [...prev, ...nextBatch]);
      const newIds = nextBatch.map(p => p.id);
      setUsedProductIds(prev => new Set([...prev, ...newIds]));
    }
    
    setLoadingMore(false);
  }, [displayedProducts.length, personalizedProducts, loadingMore]);

  // Instagram Reels-style infinite scroll with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Always load more when user scrolls near bottom - no limits like Instagram Reels
        if (entry.isIntersecting && !loadingMore) {
          loadMoreProducts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '400px' // Start loading earlier for even smoother experience
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMoreProducts, loadingMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore) {
        return;
      }
      loadMoreProducts();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreProducts]);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Added to cart",
      description: `${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''} has been added to your cart.`,
      duration: 3000,
    });
  };

  const handleProductClick = (product: Product) => {
    // Add to recently viewed
    addRecentlyViewed(product);
    
    setSelectedProduct(product);
    setIsProductModalOpen(true);
    
    if (onProductClick) {
      onProductClick(product);
    }
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSimilarProductsSearch = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSimilarProductsModal({
      isOpen: true,
      referenceProduct: product,
      similarProducts: [],
      loading: true
    });

    try {
      const similarProducts = await findSimilarProducts(product, personalizedProducts, 10);
      setSimilarProductsModal(prev => ({
        ...prev,
        similarProducts,
        loading: false
      }));
    } catch (error) {
      console.error('Error finding similar products:', error);
      setSimilarProductsModal(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const closeSimilarProductsModal = () => {
    setSimilarProductsModal({
      isOpen: false,
      referenceProduct: null,
      similarProducts: [],
      loading: false
    });
  };

  if (personalizedProducts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading personalized recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto" style={{ scrollBehavior: 'smooth', touchAction: 'pan-y', willChange: 'transform' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl text-gray-900 dark:text-white">
          Recommended for you
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-6 w-6 ml-1 text-gray-500 hover:text-blue-600"
          title="Refresh recommendations"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Products Grid - True infinite scroll through all 17,000+ products */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 border border-black -mx-4 sm:-mx-6">
        {displayedProducts.map((product) => {
          const { label: platformLabel, color: platformColor } = getPlatformDisplay(product.platform, product.id);
          const formattedPrice = product.price ? `${product.currency || '₹'}${product.price}` : null;
          return (
            <div
              key={product.id}
              className="bg-white flex flex-col border-r border-b border-black hover:bg-gray-50 transition-colors duration-200 overflow-hidden group relative cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Platform tag (top left, overlapping image) */}
              <span
                className={`absolute top-2 sm:top-3 left-2 sm:left-3 z-20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold shadow ${platformColor}`}
                style={{ pointerEvents: 'none' }}
              >
                {platformLabel}
              </span>
              {/* Add to Cart button (top right) */}
              <Button
                className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 bg-white/80 rounded-full p-1 sm:p-1.5 shadow hover:bg-white transition-colors"
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(product, e);
                }}
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
              </Button>
              
              <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  src={product.image ? product.image : "/placeholder.svg"}
                  alt={product.title}
                  className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-200"
                  onError={e => (e.currentTarget.src = '/placeholder.svg')}
                />
              </div>
              
              {/* Product Info */}
              <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-1">
                <div className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2 truncate" title={product.title}>{product.title}</div>
                {formattedPrice && (
                  <div className="text-blue-600 font-bold text-sm sm:text-base md:text-lg mb-1">
                    {formattedPrice.startsWith(product.currency || '₹') ? formattedPrice : (product.currency || '₹') + formattedPrice}
                  </div>
                )}
                {typeof product.rating === 'number' && !isNaN(product.rating) && (
                  <div className="flex items-center mb-1 sm:mb-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(Math.floor(product.rating))].map((_, i) => (
                        <svg key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><polygon points="9.9,1.1 7.6,6.6 1.6,7.6 6,11.7 4.8,17.6 9.9,14.6 15,17.6 13.8,11.7 18.2,7.6 12.2,6.6 "/></svg>
                      ))}
                    </div>
                    <span className="ml-1 sm:ml-2 text-xs text-gray-500">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="mt-auto flex items-center gap-1">
                  <Button
                    className="flex-1 bg-blue-600 text-white px-2 py-1 shadow hover:bg-blue-700 transition-colors text-center font-medium flex items-center justify-center text-xs h-7"
                    style={{ borderRadius: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(product.link, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLink size={12} className="mr-1" />
                    Buy
                  </Button>
                  <Button
                    variant="outline"
                    className="px-2 py-1 border border-gray-300 bg-white text-gray-900 hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-xs h-7 w-7"
                    style={{ borderRadius: '4px' }}
                    onClick={(e) => handleSimilarProductsSearch(product, e)}
                    title="Find similar products"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instagram Reels-style endless scroll trigger - always present */}
      <div ref={loadMoreRef} className="h-1 w-full" />

      {/* Product Detail Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="personalized-feed-product-modal-description">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription id="personalized-feed-product-modal-description">
              View detailed information about this product including price, platform, and purchase options
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <>
              <div className="space-y-4">
                {/* Product Image */}
                <div className="aspect-square w-full max-w-md mx-auto overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={selectedProduct.image || '/placeholder.svg'}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.src = '/placeholder.svg')}
                  />
                </div>
                
                {/* Complete Product Title - Small, Non-Bold */}
                <div className="text-center px-4">
                  <h3 className="text-sm text-gray-800 leading-relaxed">
                    {selectedProduct.title}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {selectedProduct.price && (
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedProduct.currency || '₹'}{selectedProduct.price}
                    </div>
                  )}
                  
                  {selectedProduct.platform && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Available on:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPlatformDisplay(selectedProduct.platform, selectedProduct.id).color}`}>
                        {getPlatformDisplay(selectedProduct.platform, selectedProduct.id).label}
                      </span>
                    </div>
                  )}
                  
                  {typeof selectedProduct.rating === 'number' && !isNaN(selectedProduct.rating) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(Math.floor(selectedProduct.rating))].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                            <polygon points="9.9,1.1 7.6,6.6 1.6,7.6 6,11.7 4.8,17.6 9.9,14.6 15,17.6 13.8,11.7 18.2,7.6 12.2,6.6 "/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{selectedProduct.rating.toFixed(1)}</span>
                    </div>
                  )}
                  
                  {selectedProduct.brand && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Brand:</span>
                      <span className="text-sm font-medium">{selectedProduct.brand}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      window.open(selectedProduct.link, '_blank', 'noopener,noreferrer');
                      closeProductModal();
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on {getPlatformDisplay(selectedProduct.platform, selectedProduct.id).label}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Added to cart",
                        description: `${selectedProduct.title.substring(0, 30)}${selectedProduct.title.length > 30 ? '...' : ''} has been added to your cart.`,
                        duration: 3000,
                      });
                    }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Similar Products Modal */}
      <SimilarProductsModal
        isOpen={similarProductsModal.isOpen}
        onClose={closeSimilarProductsModal}
        referenceProduct={similarProductsModal.referenceProduct}
        similarProducts={similarProductsModal.similarProducts}
        loading={similarProductsModal.loading}
      />
    </div>
  );
};

export default PersonalizedFeed;
