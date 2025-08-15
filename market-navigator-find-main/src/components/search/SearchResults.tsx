
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Star, Truck, Clock, PlusCircle } from "lucide-react";
import { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";

interface SearchResultsProps {
  products: Product[];
}

const SearchResults = ({ products }: SearchResultsProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const handleViewProduct = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };
  
  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.title.substring(0, 30)}${product.title.length > 30 ? '...' : ''} has been added to your cart.`,
      duration: 3000,
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      'Amazon': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Flipkart': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Meesho': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'AliExpress': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'eBay': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getAvailabilityColor = (availability: string) => {
    if (availability?.toLowerCase().includes('limited')) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-green-600 dark:text-green-400';
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-3 w-3 text-gray-300" />
      );
    }

    return stars;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Search Results ({products.length} products found)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img
                  src={product.image ? product.image : "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => (e.currentTarget.src = '/placeholder.svg')}
                />
                <Badge 
                  className={`absolute top-2 right-2 ${getPlatformColor(product.platform)}`}
                >
                  {product.platform}
                </Badge>
                {product.availability?.toLowerCase().includes('limited') && (
                  <Badge className="absolute top-2 left-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Limited
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                  {product.title}
                </h3>
                
                {/* Rating and Reviews */}
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {product.rating}
                    </span>
                    {product.reviews && (
                      <span className="text-xs text-gray-500">
                        ({product.reviews.toLocaleString()} reviews)
                      </span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {product.currency}{product.price}
                  </span>
                </div>

                {/* Shipping and Availability */}
                <div className="space-y-1">
                  {product.shipping && (
                    <div className="flex items-center gap-1 text-sm">
                      <Truck className="h-3 w-3 text-gray-500" />
                      <span className={product.shipping.toLowerCase().includes('free') ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                        {product.shipping}
                      </span>
                    </div>
                  )}
                  {product.availability && (
                    <div className="text-sm">
                      <span className={getAvailabilityColor(product.availability)}>
                        {product.availability}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    className="group-hover:bg-green-600 transition-colors"
                    size="sm"
                    variant="secondary"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button 
                    onClick={() => handleViewProduct(product.link)}
                    className="group-hover:bg-blue-600 transition-colors"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchResults;
