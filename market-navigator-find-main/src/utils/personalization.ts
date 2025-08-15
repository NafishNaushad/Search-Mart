import { Product } from "@/types/product";

export interface UserPreferences {
  gender: 'male' | 'female';
  interests: string[];
  onboardingCompleted: boolean;
}

export interface SearchHistory {
  query: string;
  category: string;
  timestamp: number;
  products: Product[];
}

// Category mappings for different genders and interests
const GENDER_CATEGORY_PREFERENCES = {
  male: {
    electronics: 1.3,
    automotive: 1.4,
    sports: 1.3,
    gaming: 1.5,
    tools: 1.4,
    gadgets: 1.3,
    fitness: 1.2,
    tech: 1.4
  },
  female: {
    fashion: 1.4,
    beauty: 1.5,
    home: 1.3,
    jewelry: 1.4,
    skincare: 1.4,
    makeup: 1.3,
    bags: 1.3,
    shoes: 1.3
  }
};

const INTEREST_KEYWORDS = {
  electronics: ['phone', 'laptop', 'tablet', 'headphones', 'speaker', 'camera', 'tv', 'gadget', 'tech', 'electronic'],
  fashion: ['shirt', 'dress', 'jeans', 'jacket', 'clothing', 'fashion', 'wear', 'outfit', 'style'],
  home: ['kitchen', 'furniture', 'decor', 'home', 'house', 'room', 'living', 'dining', 'bedroom'],
  sports: ['fitness', 'gym', 'sport', 'exercise', 'workout', 'athletic', 'running', 'yoga', 'training'],
  books: ['book', 'novel', 'education', 'learning', 'study', 'reading', 'literature'],
  beauty: ['beauty', 'skincare', 'makeup', 'cosmetic', 'face', 'skin', 'hair', 'nail'],
  automotive: ['car', 'auto', 'vehicle', 'motor', 'driving', 'automotive', 'bike', 'motorcycle'],
  toys: ['toy', 'game', 'gaming', 'play', 'kids', 'children', 'fun', 'entertainment']
};

export class PersonalizationEngine {
  private preferences: UserPreferences | null = null;
  private searchHistory: SearchHistory[] = [];

  constructor() {
    this.loadUserData();
  }

  private loadUserData() {
    // Load user preferences
    const storedPreferences = localStorage.getItem('userPreferences');
    if (storedPreferences && storedPreferences !== 'undefined') {
      try {
        this.preferences = JSON.parse(storedPreferences);
      } catch (e) {
        this.preferences = null;
        console.warn('Invalid userPreferences JSON:', storedPreferences);
      }
    }

    // Load search history
    const storedHistory = localStorage.getItem('searchHistory');
    if (storedHistory && storedHistory !== 'undefined') {
      try {
        this.searchHistory = JSON.parse(storedHistory);
        // Keep only last 50 searches to avoid memory issues
        this.searchHistory = this.searchHistory.slice(-50);
      } catch (e) {
        this.searchHistory = [];
        console.warn('Invalid searchHistory JSON:', storedHistory);
      }
    }
  }

  private saveSearchHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  public recordSearch(query: string, products: Product[]) {
    const category = this.categorizeQuery(query);
    const searchRecord: SearchHistory = {
      query: query.toLowerCase(),
      category,
      timestamp: Date.now(),
      products: products.slice(0, 10) // Store only top 10 products
    };

    this.searchHistory.push(searchRecord);
    this.saveSearchHistory();

    // Increment today's search count for the chart
    const currentCount = parseInt(localStorage.getItem('todaySearchCount') || '0');
    localStorage.setItem('todaySearchCount', (currentCount + 1).toString());
  }

  private categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    for (const [category, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          return category;
        }
      }
    }
    
    return 'general';
  }

  public personalizeProducts(products: Product[]): Product[] {
    if (!this.preferences || products.length === 0) {
      return this.shuffleArray([...products]);
    }

    const scoredProducts = products.map(product => ({
      product,
      score: this.calculatePersonalizationScore(product)
    }));

    // Sort by personalization score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    return scoredProducts.map(item => item.product);
  }

  private calculatePersonalizationScore(product: Product): number {
    let score = 1.0; // Base score

    if (!this.preferences) return score;

    // Gender-based scoring
    const genderPrefs = GENDER_CATEGORY_PREFERENCES[this.preferences.gender];
    if (genderPrefs) {
      for (const [category, multiplier] of Object.entries(genderPrefs)) {
        if (this.productMatchesCategory(product, category)) {
          score *= multiplier;
        }
      }
    }

    // Interest-based scoring
    for (const interest of this.preferences.interests) {
      if (this.productMatchesCategory(product, interest)) {
        score *= 1.4; // Boost for user interests
      }
    }

    // Search history-based scoring
    score *= this.getSearchHistoryScore(product);

    // Recency boost for recently searched categories
    score *= this.getRecencyBoost(product);

    return score;
  }

  private productMatchesCategory(product: Product, category: string): boolean {
    const keywords = INTEREST_KEYWORDS[category as keyof typeof INTEREST_KEYWORDS] || [];
    const productText = `${product.title} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    
    return keywords.some(keyword => productText.includes(keyword));
  }

  private getSearchHistoryScore(product: Product): number {
    if (this.searchHistory.length === 0) return 1.0;

    let historyScore = 1.0;
    const recentSearches = this.searchHistory.slice(-20); // Last 20 searches

    for (const search of recentSearches) {
      const category = search.category;
      if (this.productMatchesCategory(product, category)) {
        // More recent searches have higher impact
        const recencyFactor = (Date.now() - search.timestamp) / (1000 * 60 * 60 * 24); // Days ago
        const boost = Math.max(1.1, 1.5 - (recencyFactor * 0.1));
        historyScore *= boost;
      }
    }

    return Math.min(historyScore, 2.0); // Cap the boost
  }

  private getRecencyBoost(product: Product): number {
    if (this.searchHistory.length === 0) return 1.0;

    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentSearches = this.searchHistory.filter(s => s.timestamp > last24Hours);

    if (recentSearches.length === 0) return 1.0;

    // Count category frequency in recent searches
    const categoryCount: { [key: string]: number } = {};
    recentSearches.forEach(search => {
      categoryCount[search.category] = (categoryCount[search.category] || 0) + 1;
    });

    let boost = 1.0;
    for (const [category, count] of Object.entries(categoryCount)) {
      if (this.productMatchesCategory(product, category)) {
        boost *= (1 + (count * 0.2)); // 20% boost per recent search in category
      }
    }

    return Math.min(boost, 1.8); // Cap the boost
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public getRecommendedCategories(): string[] {
    if (!this.preferences) return [];

    const categories = [...this.preferences.interests];
    
    // Add gender-based categories
    const genderPrefs = GENDER_CATEGORY_PREFERENCES[this.preferences.gender];
    if (genderPrefs) {
      categories.push(...Object.keys(genderPrefs));
    }

    // Add frequently searched categories
    const categoryFrequency: { [key: string]: number } = {};
    this.searchHistory.forEach(search => {
      categoryFrequency[search.category] = (categoryFrequency[search.category] || 0) + 1;
    });

    const frequentCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    categories.push(...frequentCategories);

    // Remove duplicates and return top 8
    return [...new Set(categories)].slice(0, 8);
  }

  public getPersonalizedSearchSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.preferences) {
      // Add suggestions based on interests
      this.preferences.interests.forEach(interest => {
        const keywords = INTEREST_KEYWORDS[interest as keyof typeof INTEREST_KEYWORDS] || [];
        if (keywords.length > 0) {
          suggestions.push(keywords[Math.floor(Math.random() * keywords.length)]);
        }
      });

      // Add gender-specific suggestions
      const genderPrefs = GENDER_CATEGORY_PREFERENCES[this.preferences.gender];
      if (genderPrefs) {
        Object.keys(genderPrefs).forEach(category => {
          const keywords = INTEREST_KEYWORDS[category as keyof typeof INTEREST_KEYWORDS] || [];
          if (keywords.length > 0) {
            suggestions.push(keywords[Math.floor(Math.random() * keywords.length)]);
          }
        });
      }
    }

    // Add suggestions from search history
    const recentQueries = this.searchHistory
      .slice(-10)
      .map(s => s.query)
      .filter(q => q.length > 2);

    suggestions.push(...recentQueries);

    // Remove duplicates and return top 6
    return [...new Set(suggestions)].slice(0, 6);
  }
}

// Global instance
export const personalizationEngine = new PersonalizationEngine();
