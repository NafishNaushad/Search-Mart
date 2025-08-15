
import { Product } from "../types/product";

const generateBetterProductImage = (productName: string, category: string): string => {
  // Create more specific and high-quality product images based on the search query
  const searchTerm = productName.toLowerCase();
  
  // Map search terms to specific, high-quality product images
  if (searchTerm.includes('laptop') || searchTerm.includes('macbook') || searchTerm.includes('dell') || searchTerm.includes('hp')) {
    const laptopImages = [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop'
    ];
    return laptopImages[Math.floor(Math.random() * laptopImages.length)];
  }
  
  if (searchTerm.includes('headphone') || searchTerm.includes('earphone') || searchTerm.includes('airpods') || searchTerm.includes('wireless')) {
    const headphoneImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1545127398-14699f92334b?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&h=500&fit=crop'
    ];
    return headphoneImages[Math.floor(Math.random() * headphoneImages.length)];
  }
  
  if (searchTerm.includes('phone') || searchTerm.includes('iphone') || searchTerm.includes('samsung') || searchTerm.includes('mobile')) {
    const phoneImages = [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1674501542101-9ba6d7f9c1b8?w=500&h=500&fit=crop'
    ];
    return phoneImages[Math.floor(Math.random() * phoneImages.length)];
  }
  
  if (searchTerm.includes('watch') || searchTerm.includes('smartwatch') || searchTerm.includes('apple watch')) {
    const watchImages = [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1579586337278-3f436f25d4d6?w=500&h=500&fit=crop'
    ];
    return watchImages[Math.floor(Math.random() * watchImages.length)];
  }
  
  if (searchTerm.includes('camera') || searchTerm.includes('canon') || searchTerm.includes('nikon') || searchTerm.includes('sony')) {
    const cameraImages = [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=500&h=500&fit=crop'
    ];
    return cameraImages[Math.floor(Math.random() * cameraImages.length)];
  }
  
  if (searchTerm.includes('shoe') || searchTerm.includes('sneaker') || searchTerm.includes('nike') || searchTerm.includes('adidas')) {
    const shoeImages = [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&h=500&fit=crop'
    ];
    return shoeImages[Math.floor(Math.random() * shoeImages.length)];
  }
  
  if (searchTerm.includes('bag') || searchTerm.includes('backpack') || searchTerm.includes('purse') || searchTerm.includes('handbag')) {
    const bagImages = [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
    ];
    return bagImages[Math.floor(Math.random() * bagImages.length)];
  }
  
  // Default high-quality product images for other categories
  const defaultImages = [
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
  ];
  
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
};

// Country configuration data
const countryConfigs = {
  'IN': {
    currency: 'INR',
    symbol: '₹',
    platforms: ['Amazon India', 'Flipkart', 'Meesho', 'Myntra', 'Snapdeal'],
    priceMultiplier: 83,
    popularBrands: ['Xiaomi', 'OnePlus', 'Realme', 'Vivo', 'Samsung', 'Redmi', 'OPPO']
  },
  'US': {
    currency: 'USD',
    symbol: '$',
    platforms: ['Amazon', 'eBay', 'Walmart', 'Best Buy', 'Target'],
    priceMultiplier: 1,
    popularBrands: ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'Dell', 'HP']
  },
  'GB': {
    currency: 'GBP',
    symbol: '£',
    platforms: ['Amazon UK', 'eBay UK', 'Argos', 'Currys', 'John Lewis'],
    priceMultiplier: 0.8,
    popularBrands: ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'Dell', 'HP']
  }
};

export const getCountryConfig = (countryCode: string) => {
  return countryConfigs[countryCode as keyof typeof countryConfigs] || countryConfigs['US'];
};

export const getAllBrands = (countryCode: string) => {
  const config = getCountryConfig(countryCode);
  return config.popularBrands;
};

export const generateRealisticProducts = (searchQuery: string, countryCode: string, filters: any, count: number = 20): Product[] => {
  const config = getCountryConfig(countryCode);
  return generateProducts(searchQuery, count).map(product => ({
    ...product,
    currency: config.symbol,
    platform: config.platforms[Math.floor(Math.random() * config.platforms.length)],
    price: Math.floor(parseInt(product.price) * config.priceMultiplier).toString()
  }));
};

export const generateProducts = (searchQuery: string, count: number = 20): Product[] => {
  const platforms = [
    'Amazon India', 'Flipkart', 'Meesho', 'Myntra', 'Snapdeal',
    'Amazon', 'eBay', 'Walmart', 'Best Buy', 'Target',
    'Amazon UK', 'eBay UK', 'Argos', 'Currys', 'John Lewis'
  ];
  
  const brands = ['Samsung', 'Apple', 'Sony', 'Nike', 'Adidas', 'Dell', 'HP', 'Canon', 'Nikon', 'Xiaomi', 'OnePlus', 'Realme'];
  const sellers = ['TechStore', 'ElectroMart', 'FashionHub', 'GadgetWorld', 'StyleStore', 'MegaMart', 'QuickShop'];
  
  const products: Product[] = [];
  
  for (let i = 0; i < count; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const seller = sellers[Math.floor(Math.random() * sellers.length)];
    
    // Generate more realistic product titles based on search query
    const generateProductTitle = (query: string, brand: string): string => {
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('laptop')) {
        return `${brand} ${Math.random() > 0.5 ? 'Gaming' : 'Business'} Laptop ${Math.floor(Math.random() * 16 + 4)}GB RAM`;
      }
      if (queryLower.includes('headphone') || queryLower.includes('wireless')) {
        return `${brand} Wireless Bluetooth Headphones with Noise Cancellation`;
      }
      if (queryLower.includes('phone')) {
        return `${brand} Smartphone ${Math.floor(Math.random() * 256 + 64)}GB ${Math.random() > 0.5 ? '5G' : '4G'}`;
      }
      if (queryLower.includes('watch')) {
        return `${brand} Smartwatch with Fitness Tracking`;
      }
      if (queryLower.includes('camera')) {
        return `${brand} Digital Camera ${Math.floor(Math.random() * 24 + 12)}MP`;
      }
      if (queryLower.includes('shoe')) {
        return `${brand} Premium Running Shoes`;
      }
      
      return `${brand} ${query} - Premium Quality`;
    };
    
    const basePrice = Math.floor(Math.random() * 50000 + 1000);
    const discount = Math.floor(Math.random() * 50 + 10);
    const discountedPrice = Math.floor(basePrice * (1 - discount / 100));
    
    const product: Product = {
      id: `product-${i}`,
      title: generateProductTitle(searchQuery, brand),
      price: discountedPrice.toString(),
      originalPrice: basePrice.toString(),
      currency: platform.includes('India') ? '₹' : platform.includes('UK') ? '£' : '$',
      image: generateBetterProductImage(searchQuery, 'electronics'),
      platform,
      seller,
      rating: Math.floor(Math.random() * 20 + 30) / 10, // 3.0 to 5.0
      reviews: Math.floor(Math.random() * 10000 + 100),
      discount: discount,
      freeShipping: Math.random() > 0.7,
      features: [
        'Premium build quality',
        'Latest technology',
        '1 year warranty',
        'Easy returns'
      ],
      specifications: {
        'Brand': brand,
        'Model': `${brand}-${Math.floor(Math.random() * 1000)}`,
        'Color': ['Black', 'White', 'Silver', 'Blue', 'Red'][Math.floor(Math.random() * 5)],
        'Weight': `${Math.floor(Math.random() * 500 + 100)}g`
      },
      link: `https://example.com/product-${i}`
    };
    
    products.push(product);
  }
  
  return products;
};
