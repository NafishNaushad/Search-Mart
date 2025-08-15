import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { loadAllPlatformsAndFiles } from '@/utils/platformLoader';
import * as XLSX from "xlsx";

interface SplashScreenProps {
  onProductsLoaded: (products: Product[]) => void;
}

// Helper function to normalize text for searching
const normalize = (text: string): string => {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
};

// Helper function to extract image from row
const extractImage = (row: any): string => {
  const imageKey = Object.keys(row).find(k => 
    normalize(k).includes('image') || normalize(k).includes('img') || normalize(k).includes('picture')
  );
  return imageKey ? row[imageKey] : "/placeholder.svg";
};

const SplashScreen = ({ onProductsLoaded }: SplashScreenProps) => {
  const [loadingText, setLoadingText] = useState('Loading SearchMart...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingText('Connecting to product database...');
        setProgress(10);
        
        // Detect device and connection capabilities once
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSlowConnection = (navigator as any).connection?.effectiveType === 'slow-2g' || (navigator as any).connection?.effectiveType === '2g';
        const concurrency = isMobile ? (isSlowConnection ? 1 : 2) : 3;
        
        console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}, Concurrency: ${concurrency}`);
        
        if (isMobile) {
          setLoadingText('Optimizing for mobile...');
        }
        
        const platformsData = await loadAllPlatformsAndFiles();
        setLoadingText('Found product catalogs...');
        setProgress(20);
        
        console.log(`📊 Found ${platformsData.length} platforms:`, platformsData.map(p => p.platform));
        
        const allProducts: Product[] = [];
        const fileTasks: { platform: string; file: any }[] = [];
        
        platformsData.forEach(platformData => {
          console.log(`📁 Platform ${platformData.platform} has ${platformData.files.length} files`);
          platformData.files.forEach(file => {
            fileTasks.push({ platform: platformData.platform, file });
          });
        });
        
        console.log(`🎯 Total files to process: ${fileTasks.length}`);
        
        if (fileTasks.length === 0) {
          console.error('❌ No files found to process!');
          setLoadingText('No product files found');
          return;
        }
        
        let processedFiles = 0;
        const totalFiles = fileTasks.length;
        
        const processFile = async (platform: string, file: any) => {
          try {
            console.log(`🔄 Processing ${platform}/${file.name}`);
            const response = await fetch(file.url);
            if (!response.ok) {
              console.warn(`Failed to fetch ${file.name}: ${response.status}`);
              return [];
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log(`✅ ${platform}/${file.name}: ${jsonData.length} rows`);
            
            const products = jsonData.map((row: any, index: number) => {
              const extractProductLink = (row: any): string => {
                const allowedLinkKeys = [
                  'Affiliate Link', 'Affiliate_Link', 'affiliate link', 'affiliate _link', 'URL'
                ];
                
                const linkKeys = Object.keys(row).filter(k => allowedLinkKeys.includes(k));
                
                for (const key of linkKeys) {
                  const url = row[key];
                  if (url && typeof url === 'string' && url.trim() !== '') {
                    const trimmedUrl = url.trim();
                    if (trimmedUrl.startsWith('http://') || 
                        trimmedUrl.startsWith('https://') || 
                        trimmedUrl.startsWith('//') ||
                        (trimmedUrl.includes('.') && trimmedUrl.length > 5)) {
                      return trimmedUrl;
                    }
                  }
                }
                
                const title = row.title || row.Title || row.name || row.Name || '';
                if (title && platform) {
                  const encodedTitle = encodeURIComponent(title);
                  const plat = platform.toLowerCase();
                  
                  if (plat.includes('amazon')) {
                    return `https://www.amazon.in/s?k=${encodedTitle}`;
                  } else if (plat.includes('meesho')) {
                    return `https://www.meesho.com/search?q=${encodedTitle}`;
                  } else if (plat.includes('ajio')) {
                    return `https://www.ajio.com/search/?text=${encodedTitle}`;
                  } else if (plat.includes('flipkart')) {
                    return `https://www.flipkart.com/search?q=${encodedTitle}`;
                  }
                }
                
                const searchTitle = (row.title || row.Title || row.name || row.Name || 'product').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
                return `https://www.google.com/search?q=${encodeURIComponent(searchTitle + ' ' + (platform || ''))}`;
              };
              
              const uniqueId = `${platform}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}-${index}`;
              
              const extractProductName = (row: any): string => {
                return row['product name'] || row['Product Name'] || 'Untitled Product';
              };
              
              const extractRating = (row: any): number | undefined => {
                const ratingValue = row['Product Ratings'] || row['Product Rating'] || row['star ratings'];
                if (ratingValue) {
                  const parsed = parseFloat(ratingValue);
                  return isNaN(parsed) ? undefined : parsed;
                }
                return undefined;
              };
              
              const extractReviews = (row: any): string | undefined => {
                return row['Product Reviews'] || row['product reviews'] || row['Reviews'] || row['reviews'] || undefined;
              };
              
              const extractVariants = (row: any): string | undefined => {
                return row['Variant'] || row['variant'] || row['Variants'] || row['variants'] || undefined;
              };
              
              return {
                id: uniqueId,
                title: extractProductName(row),
                price: String(row.price || row.Price || row.cost || row.Cost || '0'),
                currency: row.currency || row.Currency || '₹',
                image: extractImage(row),
                platform: platform,
                rating: extractRating(row),
                link: extractProductLink(row),
                keywords: row.keywords || row.Keywords || row.tags || row.Tags || '',
                brand: row.brand || row.Brand || undefined,
                reviews: extractReviews(row),
                variants: extractVariants(row)
              } as Product;
            });
            
            console.log(`✅ ${platform}/${file.name}: ${products.length} products extracted`);
            return products;
          } catch (fileError) {
            console.error(`❌ Error processing ${platform}/${file.name}:`, fileError);
            return [];
          }
        };
        
        // Process all files in parallel for maximum speed
        const processAllFiles = async () => {
          const results: Product[][] = [];

          // Map all file tasks to promises (no batching)
          const allPromises = fileTasks.map(async ({ platform, file }, idx) => {
            const products = await processFile(platform, file);
            processedFiles++;
            // Update progress
            const progressPercent = 20 + Math.floor((processedFiles / totalFiles) * 70);
            setProgress(progressPercent);
            setLoadingText(`Loading products... ${processedFiles}/${totalFiles} files`);
            return products;
          });

          const allResults = await Promise.all(allPromises);
          allResults.forEach(products => {
            if (products.length > 0) {
              allProducts.push(...products);
            }
          });
        };

        
        await processAllFiles();
        
        console.log(`🎉 Splash loading complete: ${allProducts.length} total products from ${totalFiles} files`);
        
        setProgress(95);
        setLoadingText('Preparing your experience...');
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setProgress(100);
        onProductsLoaded(allProducts);
        
      } catch (error) {
        console.error('Error loading products during splash:', error);
        setLoadingText('Error loading products. Please refresh.');
      }
    };
    
    loadProducts();
  }, [onProductsLoaded]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center z-50">
      {/* App Logo/Icon */}
      <div className="mb-8">
        <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white text-3xl font-bold">SM</span>
        </div>
      </div>
      
      {/* App Title */}
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        Search<span className="text-blue-600">Mart</span>
      </h1>
      
      <p className="text-gray-600 dark:text-gray-300 mb-8 text-center px-4">
        Search products across multiple platforms
      </p>
      
      {/* Loading Progress */}
      <div className="w-64 mb-4">
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Loading Text */}
      <p className="text-gray-600 dark:text-gray-300 text-sm animate-pulse">
        {loadingText}
      </p>
    </div>
  );
};

export default SplashScreen;
