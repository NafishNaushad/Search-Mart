import React, { useState } from "react";
import { Product, SearchFilters } from "@/types/product";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { findSimilarProducts, SimilarityScore } from "@/utils/imageAnalysis";
import SimilarProductsModal from "./SimilarProductsModal";
import ProductDetailModal from "./ProductDetailModal";
import { useCart } from "@/contexts/CartContext";
import { addRecentlyViewed } from "@/utils/recentlyViewed";

interface ProductListProps {
  products: Product[];
  allProducts?: Product[]; // All products for similarity search
}

const getStars = (rating: number = 0) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><polygon points="9.9,1.1 7.6,6.6 1.6,7.6 6,11.7 4.8,17.6 9.9,14.6 15,17.6 13.8,11.7 18.2,7.6 12.2,6.6 "/></svg>
      ))}
      {halfStar && (
        <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><defs><linearGradient id="half"><stop offset="50%" stopColor="#facc15"/><stop offset="50%" stopColor="#e5e7eb"/></linearGradient></defs><polygon fill="url(#half)" points="9.9,1.1 7.6,6.6 1.6,7.6 6,11.7 4.8,17.6 9.9,14.6 15,17.6 13.8,11.7 18.2,7.6 12.2,6.6 "/></svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-gray-300" viewBox="0 0 20 20"><polygon points="9.9,1.1 7.6,6.6 1.6,7.6 6,11.7 4.8,17.6 9.9,14.6 15,17.6 13.8,11.7 18.2,7.6 12.2,6.6 "/></svg>
      ))}
    </div>
  );
};

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
  // If platform looks like a file name (ends with .xlsx), try to get folder from id
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
    .trim()
    .toLowerCase();
  let label = norm
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(Xlsx|Data)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Map known folders to brand names
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

function formatPrice(price: string | undefined, currency: string = "₹") {
  if (!price) return null;
  // Remove any non-numeric (except dot/decimal) characters
  const numeric = price.replace(/[^\d.]/g, "");
  if (!numeric) return null;
  return `${currency}${numeric}`;
}

const ProductList: React.FC<ProductListProps> = ({ products, allProducts = [] }) => {
  const { toast } = useToast();
  const { addToCart } = useCart();
  
  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [similarProductsModal, setSimilarProductsModal] = useState({
    isOpen: false,
    referenceProduct: null as Product | null,
    similarProducts: [] as SimilarityScore[],
    loading: false
  });

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    addToCart(product);
    
    toast({
      title: "Added to cart",
      description: `${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''} has been added to your cart.`,
      duration: 3000,
    });
  };

  const handleSimilarProductsSearch = async (product: Product, event: React.MouseEvent) => {
    event.stopPropagation();
    
    console.log('Starting similarity search for product:', product.title);
    console.log('Product keywords:', product.keywords);
    console.log('Total products available:', allProducts.length);
    
    // Check if we have enough products to search through
    if (allProducts.length === 0) {
      toast({
        title: "No products available",
        description: "Please wait for all products to load before searching for similar items.",
        variant: "destructive",
      });
      return;
    }

    // Check if the product has keywords
    if (!product.keywords || product.keywords.trim().length === 0) {
      toast({
        title: "No keywords available",
        description: "This product doesn't have keywords for similarity matching.",
        variant: "destructive",
      });
      return;
    }

    // Show modal INSTANTLY with immediate feedback
    setSimilarProductsModal({
      isOpen: true,
      referenceProduct: product,
      similarProducts: [],
      loading: true
    });

    // No toast delay - start processing immediately

    try {
      console.log('Calling findSimilarProducts...');
      const startTime = Date.now();
      
      // Find similar products with minimum 10 keyword matches (for category consistency)
      const similarProducts = await findSimilarProducts(product, allProducts, 10);
      
      const endTime = Date.now();
      console.log(`Search completed in ${endTime - startTime}ms`);
      console.log('Similar products found:', similarProducts.length);
      
      setSimilarProductsModal(prev => ({
        ...prev,
        similarProducts,
        loading: false
      }));

      // Minimal toast feedback for faster UX
      if (similarProducts.length === 0) {
        toast({
          title: "No matches found",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error finding similar products:', error);
      setSimilarProductsModal(prev => ({
        ...prev,
        loading: false
      }));
      
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to analyze similarity. Please try again.",
        variant: "destructive",
      });
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

  const handleProductClick = async (product: Product) => {
    // Open modal instantly for snappy UX
    setSelectedProduct(product);
    setIsProductModalOpen(true);

    // Save to recently viewed in background without blocking UI
    Promise.resolve()
      .then(async () => {
        try {
          console.log('[ProductList] Adding product to recently viewed:', product.title);
          await addRecentlyViewed(product);
          console.log('[ProductList] Product added to recently viewed successfully');
        } catch (error) {
          console.error('[ProductList] Error adding to recently viewed:', error);
        }
      });
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 border border-black -mx-4 sm:-mx-6">
      {products.map((product) => {
        const { label: platformLabel, color: platformColor } = getPlatformDisplay(product.platform, product.id);
        const formattedPrice = formatPrice(product.price, product.currency);


        return (
          <div
            key={product.id}
            className="bg-white flex flex-col border-r border-b border-black hover:bg-gray-50 transition-colors duration-200 overflow-hidden group relative cursor-pointer"
            onPointerDown={(e) => {
              // Trigger instantly on touch or primary mouse button
              if ((e as any).pointerType === 'touch' || (e as any).pointerType === 'mouse') {
                setSelectedProduct(product);
                setIsProductModalOpen(true);
              }
            }}
            onClick={() => {
              setSelectedProduct(product);
              setIsProductModalOpen(true);
            }}
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
            <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-1">
              <div className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2 truncate" title={product.title}>{product.title}</div>
              {formattedPrice && (
                <div className="text-blue-600 font-bold text-sm sm:text-base md:text-lg mb-1">
                  {formattedPrice.startsWith(product.currency) ? formattedPrice : product.currency + formattedPrice}
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
                  onClick={() => window.open(product.link, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={12} className="mr-1" />
                  Buy
                </Button>
                <Button
                  variant="outline"
                  className="px-2 py-1 border border-gray-300 bg-white text-gray-900 hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-xs h-7 w-7"
                  style={{ borderRadius: '4px' }}
                  onPointerDown={(e) => handleSimilarProductsSearch(product, e as any)}
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
      
      <SimilarProductsModal
        isOpen={similarProductsModal.isOpen}
        onClose={closeSimilarProductsModal}
        referenceProduct={similarProductsModal.referenceProduct}
        similarProducts={similarProductsModal.similarProducts}
        loading={similarProductsModal.loading}
      />
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
      />
    </div>
  );
};

export default ProductList;