import { Product } from '@/types/product';

export interface ImageFeatures {
  dominantColors: string[];
  brightness: number;
  contrast: number;
  textContent: string[];
  aspectRatio: number;
  saturation?: number;
  edgeDensity?: number;
  dominantHues?: number[];
}

export interface SimilarityScore {
  product: Product;
  score: number;
  matchingKeywords: number;
  colorSimilarity: number;
  textSimilarity: number;
}

/**
 * Extracts color features from an image using canvas with timeout and optimization
 */
export const extractImageFeatures = async (imageUrl: string): Promise<ImageFeatures> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Reduced timeout for faster results
    const timeout = setTimeout(() => {
      reject(new Error('Image loading timeout'));
    }, 1500); // Reduced from 5000ms to 1500ms
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Aggressive optimization for super fast processing
        const maxSize = 100; // Reduced from 200 to 100 for 4x faster processing
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.max(img.width * scale, 50); // Minimum 50px
        canvas.height = Math.max(img.height * scale, 50);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhanced color analysis with better quantization
        const colorMap = new Map<string, number>();
        const hueMap = new Map<number, number>();
        let totalBrightness = 0;
        let totalSaturation = 0;
        let edgePixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          totalBrightness += brightness;
          
          // Convert to HSV for better color analysis
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          
          // Calculate saturation
          const saturation = max === 0 ? 0 : delta / max;
          totalSaturation += saturation;
          
          // Calculate hue
          let hue = 0;
          if (delta !== 0) {
            if (max === r) hue = ((g - b) / delta) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
            hue = Math.round(hue * 60);
            if (hue < 0) hue += 360;
          }
          
          // Track hue distribution
          const hueGroup = Math.floor(hue / 30) * 30; // Group into 30-degree segments
          hueMap.set(hueGroup, (hueMap.get(hueGroup) || 0) + 1);
          
          // Better color quantization - focus on perceptually important colors
          const quantizedR = Math.floor(r / 16) * 16;
          const quantizedG = Math.floor(g / 16) * 16;
          const quantizedB = Math.floor(b / 16) * 16;
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
          
          // Detect edges (high contrast areas that might contain text/icons)
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);
          if (x > 0 && y > 0) {
            const prevPixel = i - 4;
            const abovePixel = i - (canvas.width * 4);
            const brightnessDiff = Math.abs(brightness - (data[prevPixel] * 0.299 + data[prevPixel + 1] * 0.587 + data[prevPixel + 2] * 0.114));
            if (brightnessDiff > 50) edgePixels++;
          }
        }
        
        const pixelCount = data.length / 4;
        const avgBrightness = totalBrightness / pixelCount;
        const avgSaturation = totalSaturation / pixelCount;
        const edgeDensity = edgePixels / pixelCount;
        
        // Calculate contrast
        let contrastSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          contrastSum += Math.abs(brightness - avgBrightness);
        }
        const contrast = contrastSum / pixelCount;
        
        // Get top 8 dominant colors (more for better matching)
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color);
        
        // Get dominant hues
        const dominantHues = Array.from(hueMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hue]) => hue);
        
        const features: ImageFeatures = {
          dominantColors: sortedColors,
          brightness: avgBrightness,
          contrast: contrast,
          textContent: [], // Will be populated by OCR if needed
          aspectRatio: canvas.width / canvas.height,
          // Add new properties for enhanced analysis
          saturation: avgSaturation,
          edgeDensity: edgeDensity,
          dominantHues: dominantHues
        };
        
        resolve(features);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Enhanced color similarity calculation with hue-based matching
 */
export const calculateColorSimilarity = (colors1: string[], colors2: string[]): number => {
  if (colors1.length === 0 || colors2.length === 0) return 0;
  
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (const color1 of colors1) {
    const [r1, g1, b1] = color1.split(',').map(Number);
    
    let maxSimilarity = 0;
    for (const color2 of colors2) {
      const [r2, g2, b2] = color2.split(',').map(Number);
      
      // Calculate both RGB and perceptual color similarity
      const rgbDistance = Math.sqrt(
        Math.pow(r1 - r2, 2) + 
        Math.pow(g1 - g2, 2) + 
        Math.pow(b1 - b2, 2)
      );
      
      // Calculate perceptual color difference (weighted RGB)
      const perceptualDistance = Math.sqrt(
        2 * Math.pow(r1 - r2, 2) + 
        4 * Math.pow(g1 - g2, 2) + 
        3 * Math.pow(b1 - b2, 2)
      );
      
      // Convert to HSV for hue comparison
      const hsv1 = rgbToHsv(r1, g1, b1);
      const hsv2 = rgbToHsv(r2, g2, b2);
      
      // Calculate hue similarity (circular distance)
      const hueDiff = Math.min(
        Math.abs(hsv1.h - hsv2.h),
        360 - Math.abs(hsv1.h - hsv2.h)
      );
      const hueSimilarity = 1 - (hueDiff / 180);
      
      // Calculate saturation and value similarity
      const satSimilarity = 1 - Math.abs(hsv1.s - hsv2.s);
      const valSimilarity = 1 - Math.abs(hsv1.v - hsv2.v);
      
      // Combine similarities with weights
      const rgbSimilarity = Math.max(0, 1 - rgbDistance / (255 * Math.sqrt(3)));
      const perceptualSimilarity = Math.max(0, 1 - perceptualDistance / (255 * Math.sqrt(29)));
      
      const combinedSimilarity = (
        rgbSimilarity * 0.3 +
        perceptualSimilarity * 0.3 +
        hueSimilarity * 0.25 +
        satSimilarity * 0.1 +
        valSimilarity * 0.05
      );
      
      maxSimilarity = Math.max(maxSimilarity, combinedSimilarity);
    }
    
    totalSimilarity += maxSimilarity;
    comparisons++;
  }
  
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
};

/**
 * Convert RGB to HSV
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  return { h, s, v };
}

/**
 * Counts matching keywords between two products - improved for comma-separated values
 */
export const countMatchingKeywords = (product1: Product, product2: Product): number => {
  if (!product1.keywords || !product2.keywords) return 0;
  
  // Split by comma first, then clean up whitespace and filter
  const keywords1 = product1.keywords
    .toLowerCase()
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 1); // Allow 2+ character keywords
  
  const keywords2 = product2.keywords
    .toLowerCase()
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 1);
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let matches = 0;
  for (const keyword of set1) {
    if (set2.has(keyword)) {
      matches++;
    }
  }
  
  // Minimal keyword logging for performance
  if (matches >= 15) { // Only log high keyword matches
    console.log(`High keyword match: ${matches} keywords between products`);
  }
  
  return matches;
};

/**
 * Calculates text similarity between product titles and descriptions
 */
export const calculateTextSimilarity = (product1: Product, product2: Product): number => {
  const text1 = (product1.title + ' ' + (product1.description || '')).toLowerCase();
  const text2 = (product2.title + ' ' + (product2.description || '')).toLowerCase();
  
  const words1 = text1.split(/\W+/).filter(w => w.length > 2);
  const words2 = text2.split(/\W+/).filter(w => w.length > 2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

/**
 * Calculates brand similarity between two products
 */
export const calculateBrandSimilarity = (product1: Product, product2: Product): number => {
  // Extract brand from title or brand field
  const getBrand = (product: Product): string => {
    if (product.brand) return product.brand.toLowerCase().trim();
    
    // Try to extract brand from title (usually first word or two)
    const title = product.title.toLowerCase();
    const commonBrands = [
      'muuchstac', 'khadi', 'bombay shaving company', 'nivea', 'garnier', 
      'loreal', 'olay', 'pond', 'himalaya', 'patanjali', 'biotique',
      'mamaearth', 'wow', 'plum', 'forest essentials', 'kama ayurveda'
    ];
    
    for (const brand of commonBrands) {
      if (title.includes(brand)) {
        return brand;
      }
    }
    
    // Fallback: use first word of title
    return title.split(' ')[0] || '';
  };
  
  const brand1 = getBrand(product1);
  const brand2 = getBrand(product2);
  
  if (!brand1 || !brand2) return 0;
  
  // Exact brand match
  if (brand1 === brand2) return 1.0;
  
  // Partial brand match (for variations like "L'Oreal" vs "Loreal")
  if (brand1.includes(brand2) || brand2.includes(brand1)) return 0.8;
  
  // Similar brand names (Levenshtein distance)
  const distance = levenshteinDistance(brand1, brand2);
  const maxLength = Math.max(brand1.length, brand2.length);
  const similarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;
  
  return similarity > 0.7 ? similarity * 0.6 : 0; // Only consider if quite similar
};

/**
 * Fast hue similarity calculation for performance
 */
function calculateHueSimilarityFast(hues1: number[], hues2: number[]): number {
  if (!hues1.length || !hues2.length) return 0.5;
  
  let matches = 0;
  const maxChecks = Math.min(hues1.length, 3); // Limit to first 3 hues for speed
  
  for (let i = 0; i < maxChecks; i++) {
    for (const hue2 of hues2) {
      const hueDiff = Math.min(Math.abs(hues1[i] - hue2), 360 - Math.abs(hues1[i] - hue2));
      if (hueDiff <= 30) {
        matches++;
        break;
      }
    }
  }
  
  return matches / maxChecks;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Finds similar products based on image analysis and keyword matching - ultra-fast optimized version
 */
export const findSimilarProducts = async (
  referenceProduct: Product,
  allProducts: Product[],
  minKeywordMatches: number = 10
): Promise<SimilarityScore[]> => {
  try {
    const startTime = Date.now();
    console.log(`Starting ultra-fast similarity search for: ${referenceProduct.title}`);
    
    // ULTRA-FAST PRE-FILTERING: Use text-only matching first
    const textFilteredProducts = allProducts
      .filter(product => product.id !== referenceProduct.id)
      .map(product => {
        const matchingKeywords = countMatchingKeywords(referenceProduct, product);
        const textSimilarity = calculateTextSimilarity(referenceProduct, product);
        const brandSimilarity = calculateBrandSimilarity(referenceProduct, product);
        
        // Quick scoring without image analysis
        const quickScore = textSimilarity * 0.6 + brandSimilarity * 0.25 + (matchingKeywords / 20) * 0.15;
        
        return {
          product,
          matchingKeywords,
          textSimilarity,
          brandSimilarity,
          quickScore
        };
      })
      .filter(item => item.matchingKeywords >= minKeywordMatches && item.quickScore > 0.3)
      .sort((a, b) => b.quickScore - a.quickScore)
      .slice(0, 20); // Only top 20 candidates for image analysis
    
    console.log(`Pre-filtered to ${textFilteredProducts.length} top candidates in ${Date.now() - startTime}ms`);
    
    if (textFilteredProducts.length === 0) {
      return [];
    }
    
    // PARALLEL IMAGE ANALYSIS: Process only top candidates
    let referenceFeatures: ImageFeatures | null = null;
    const imageAnalysisPromises: Promise<any>[] = [];
    
    // Start reference image analysis
    const refImagePromise = extractImageFeatures(referenceProduct.image)
      .then(features => { referenceFeatures = features; })
      .catch(() => { referenceFeatures = null; });
    
    imageAnalysisPromises.push(refImagePromise);
    
    // Start candidate image analysis in parallel (max 10 concurrent)
    const candidateResults = new Map<string, ImageFeatures>();
    const maxConcurrent = 10;
    
    for (let i = 0; i < Math.min(textFilteredProducts.length, maxConcurrent); i++) {
      const product = textFilteredProducts[i].product;
      const imagePromise = extractImageFeatures(product.image)
        .then(features => candidateResults.set(product.id, features))
        .catch(() => {}); // Ignore failures, use text-only scoring
      
      imageAnalysisPromises.push(imagePromise);
    }
    
    // Wait for all image analysis with timeout
    await Promise.allSettled(imageAnalysisPromises.map(p => 
      Promise.race([p, new Promise(resolve => setTimeout(resolve, 800))])
    ));
    
    console.log(`Image analysis completed in ${Date.now() - startTime}ms`);
    
    // FINAL SCORING: Combine text and image analysis
    const finalResults = textFilteredProducts.map(item => {
      const candidateFeatures = candidateResults.get(item.product.id);
      let colorSimilarity = 0;
      let packagingSimilarity = 0;
      
      // Only calculate image similarity if both reference and candidate features exist
      if (referenceFeatures && candidateFeatures) {
        colorSimilarity = calculateColorSimilarity(
          referenceFeatures.dominantColors,
          candidateFeatures.dominantColors
        );
        
        const brightnessSimilarity = 1 - Math.abs(referenceFeatures.brightness - candidateFeatures.brightness) / 255;
        const hueSimilarity = referenceFeatures.dominantHues && candidateFeatures.dominantHues ? 
          calculateHueSimilarityFast(referenceFeatures.dominantHues, candidateFeatures.dominantHues) : 0.5;
        
        packagingSimilarity = colorSimilarity * 0.7 + brightnessSimilarity * 0.2 + hueSimilarity * 0.1;
      }
      
      // Final score calculation
      const finalScore = referenceFeatures && candidateFeatures ? (
        packagingSimilarity * 0.5 +     // Image similarity
        item.textSimilarity * 0.25 +    // Text similarity
        item.brandSimilarity * 0.15 +   // Brand similarity
        (item.matchingKeywords / 20) * 0.1  // Keyword bonus
      ) : item.quickScore; // Fall back to text-only score
      
      return {
        product: item.product,
        score: finalScore,
        matchingKeywords: item.matchingKeywords,
        colorSimilarity,
        textSimilarity: item.textSimilarity,
        packagingSimilarity,
        brandSimilarity: item.brandSimilarity
      };
    });
    
    // Sort and return results
    const sortedResults = finalResults
      .filter(result => result.score > 0.4) // Only return meaningful matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Limit to top 15 results
    
    const totalTime = Date.now() - startTime;
    console.log(`Ultra-fast search completed in ${totalTime}ms, returning ${sortedResults.length} results`);
    
    return sortedResults;
    
  } catch (error) {
    console.error('Error in findSimilarProducts:', error);
    return [];
  }
};
