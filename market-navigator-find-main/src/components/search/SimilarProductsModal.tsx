import React, { useState } from 'react';
import { Product } from '@/types/product';
import { SimilarityScore } from '@/utils/imageAnalysis';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, X, Palette, Type, Hash } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import ProductDetailModal from './ProductDetailModal';

interface SimilarProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceProduct: Product | null;
  similarProducts: SimilarityScore[];
  loading: boolean;
}

const SimilarProductsModal: React.FC<SimilarProductsModalProps> = ({
  isOpen,
  onClose,
  referenceProduct,
  similarProducts,
  loading
}) => {
  const [detailModalProduct, setDetailModalProduct] = useState<Product | null>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.stopPropagation();
    addToCart(product);
    toast({
      title: "Added to cart!",
      description: `${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''} has been added to your cart.`,
      duration: 3000,
    });
  };

  const formatPrice = (price: string | undefined, currency: string = "₹") => {
    if (!price) return null;
    const numeric = price.replace(/[^\d.]/g, "");
    if (!numeric) return null;
    return `${currency}${numeric}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-blue-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    if (score >= 0.4) return 'Fair Match';
    return 'Basic Match';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col mx-2 sm:mx-4 transition-none"
        aria-describedby="similar-products-modal-desc"
      >
        <DialogDescription id="similar-products-modal-desc" className="sr-only">
          View and compare similar products to your search, including similarity scores and details.
        </DialogDescription>
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg md:text-xl font-bold">
              Similar Products
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onPointerUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const swallow = (ev: MouseEvent) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  window.removeEventListener('click', swallow, true);
                };
                window.addEventListener('click', swallow, true);
                onClose();
              }}
              className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <DialogDescription id="similar-products-description" className="text-xs sm:text-sm text-gray-600 pr-8">
            Products with similar visual features and matching keywords
          </DialogDescription>
          {referenceProduct && (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 bg-gray-50 rounded-lg">
              <img
                src={referenceProduct.image || '/placeholder.svg'}
                alt={referenceProduct.title}
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain rounded-md border flex-shrink-0"
                onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm line-clamp-2">
                  {referenceProduct.title}
                </h3>
                <p className="text-blue-600 font-bold text-sm sm:text-base">
                  {formatPrice(referenceProduct.price, referenceProduct.currency)}
                </p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <span className="hidden sm:inline">Reference Product</span>
                <span className="sm:hidden">Ref</span>
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col sm:flex-row justify-center items-center min-h-[200px] gap-3 sm:gap-4 px-4">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-blue-600"></div>
              <span className="text-sm sm:text-base md:text-lg text-blue-700 text-center">
                Analyzing images and finding similar products...
              </span>
            </div>
          ) : similarProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                No similar products found
              </div>
              <p className="text-gray-400 text-sm">
                Try searching for products with more matching keywords or similar visual features.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Found {similarProducts.length} similar products with 10+ matching keywords
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:gap-4 -mx-4 sm:-mx-6">
                {similarProducts.map((item, index) => {
                  const { product, score, matchingKeywords, colorSimilarity, textSimilarity } = item;
                  const formattedPrice = formatPrice(product.price, product.currency);
                  
                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setDetailModalProduct(product)}
                    >
                      <div className="flex gap-2 sm:gap-3 md:gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src={product.image || '/placeholder.svg'}
                            alt={product.title}
                            className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain rounded-md border"
                            onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1 sm:mb-2">
                            <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 flex-1 pr-2">
                              {product.title}
                            </h4>
                            <Badge 
                              className={`ml-1 text-xs text-white ${getScoreColor(score)} flex-shrink-0`}
                            >
                              {Math.round(score * 100)}%
                            </Badge>
                          </div>
                          
                          {formattedPrice && (
                            <div className="text-blue-600 font-bold mb-1 sm:mb-2 text-sm sm:text-base">
                              {formattedPrice}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Hash className="w-3 h-3" />
                              <span className="hidden xs:inline">{matchingKeywords} keywords</span>
                              <span className="xs:hidden">{matchingKeywords}k</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Palette className="w-3 h-3" />
                              <span className="hidden xs:inline">{Math.round(colorSimilarity * 100)}% color</span>
                              <span className="xs:hidden">{Math.round(colorSimilarity * 100)}%c</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Type className="w-3 h-3" />
                              <span className="hidden xs:inline">{Math.round(textSimilarity * 100)}% text</span>
                              <span className="xs:hidden">{Math.round(textSimilarity * 100)}%t</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                              onClick={(e) => { e.stopPropagation(); window.open(product.link, '_blank', 'noopener,noreferrer'); }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              <span className="hidden xs:inline">Buy Now</span>
                              <span className="xs:hidden">Buy</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(product, e); }}
                            >
                              <span className="hidden sm:inline">Add to Cart</span>
                              <span className="sm:hidden">Add</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 flex items-center justify-between">
                          <span className="font-medium">{getScoreLabel(score)}</span>
                          <span>Rank #{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <ProductDetailModal
      product={detailModalProduct}
      isOpen={!!detailModalProduct}
      onClose={() => setDetailModalProduct(null)}
    />
    </>
  );
};

export default SimilarProductsModal;
