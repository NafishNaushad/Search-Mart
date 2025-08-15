import { Product } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";

const RECENTLY_VIEWED_PREFIX = "recentlyViewed_";
// No limit - store all recently viewed products

// Get user-specific localStorage key with multiple fallback strategies
async function getUserSpecificKey(): Promise<string> {
  try {
    // Check if user is in guest mode
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const guestUserId = localStorage.getItem('guestUserId');
    
    if (isGuest && guestUserId) {
      console.log('[recentlyViewed] Using guest-specific key for:', guestUserId);
      return `${RECENTLY_VIEWED_PREFIX}guest_${guestUserId}`;
    }

    // Try to get current user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      console.log('[recentlyViewed] Using user-specific key for:', user.email);
      return `${RECENTLY_VIEWED_PREFIX}${user.email}`;
    }

    // Fallback: Try to get user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      console.log('[recentlyViewed] Using session-specific key for:', session.user.email);
      return `${RECENTLY_VIEWED_PREFIX}${session.user.email}`;
    }

    // Fallback: Check if there's a stored user email in localStorage
    const storedUserEmail = localStorage.getItem('currentUserEmail');
    if (storedUserEmail) {
      console.log('[recentlyViewed] Using stored email key for:', storedUserEmail);
      return `${RECENTLY_VIEWED_PREFIX}${storedUserEmail}`;
    }

    console.log('[recentlyViewed] No user found, using generic key');
    return "recentlyViewed";
  } catch (error) {
    console.error('[recentlyViewed] Error getting user key:', error);
    return "recentlyViewed";
  }
}

// Store current user email for persistence
export function setCurrentUserEmail(email: string) {
  try {
    localStorage.setItem('currentUserEmail', email);
    console.log('[recentlyViewed] Stored current user email:', email);
  } catch (error) {
    console.error('[recentlyViewed] Error storing user email:', error);
  }
}

// Clear current user email on sign out
export function clearCurrentUserEmail() {
  try {
    localStorage.removeItem('currentUserEmail');
    console.log('[recentlyViewed] Cleared current user email');
  } catch (error) {
    console.error('[recentlyViewed] Error clearing user email:', error);
  }
}

// Clear guest data on sign out (session-limited)
export function clearGuestData() {
  try {
    const guestUserId = localStorage.getItem('guestUserId');
    if (guestUserId) {
      // Clear recently viewed data
      const guestKey = `${RECENTLY_VIEWED_PREFIX}guest_${guestUserId}`;
      localStorage.removeItem(guestKey);
      
      // Clear search history data
      const guestHistoryKey = `searchHistory_guest_${guestUserId}`;
      localStorage.removeItem(guestHistoryKey);
      
      console.log('[recentlyViewed] Cleared guest recently viewed and search history data');
    }
  } catch (error) {
    console.error('[recentlyViewed] Error clearing guest data:', error);
  }
}

export async function addRecentlyViewed(product: Product) {
  try {
    const key = await getUserSpecificKey();
    console.log('[recentlyViewed] Adding product with key:', key);
    
    const stored = localStorage.getItem(key);
    let arr: Product[] = [];
    
    if (stored) {
      arr = JSON.parse(stored);
      // Remove duplicate by id
      arr = arr.filter((p) => p.id !== product.id);
    }
    
    arr.unshift(product);
    // No limit - keep all products
    
    localStorage.setItem(key, JSON.stringify(arr));
    console.log('[recentlyViewed] Saved product, total count:', arr.length);
  } catch (e) {
    console.error('Error saving recently viewed product:', e);
  }
}

export async function getRecentlyViewed(): Promise<Product[]> {
  try {
    const key = await getUserSpecificKey();
    console.log('[recentlyViewed] Loading products with key:', key);
    
    const stored = localStorage.getItem(key);
    if (stored) {
      const products = JSON.parse(stored);
      console.log('[recentlyViewed] Loaded products count:', products.length);
      return products;
    }
    
    console.log('[recentlyViewed] No products found');
    return [];
  } catch (e) {
    console.error('Error loading recently viewed products:', e);
    return [];
  }
}
