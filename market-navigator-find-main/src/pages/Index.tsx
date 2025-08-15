
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, History, User as UserIcon } from 'lucide-react';
import SearchPageNew from '@/components/search/SearchPageNew';
import HistoryPage from '@/components/history/HistoryPage';
import ProfilePage from '@/components/profile/ProfilePage';
import CartDrawerButton from '@/components/cart/CartDrawerButton';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import AuthPage from "@/components/auth/AuthPage";
import ProductList from "@/components/search/ProductList";
import { setCurrentUserEmail, clearCurrentUserEmail } from "@/utils/recentlyViewed";
import SplashScreen from '@/components/SplashScreen';
// Removed static products import - now loading only from Supabase

// Helper function to normalize text for searching (moved from SearchPage)
const normalize = (text: string): string => {
  // Convert to lowercase and remove all non-alphanumeric characters
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
};

// Helper function to extract image from row (moved from SearchPage)
const extractImage = (row: any): string => {
  // Try various possible column names for image
  const imageKey = Object.keys(row).find(k => 
    normalize(k).includes('image') || normalize(k).includes('img') || normalize(k).includes('picture')
  );
  
  return imageKey ? row[imageKey] : "/placeholder.svg";
};

const Index = () => {
  // Personalized feed state and logic
  const [personalizedFeed, setPersonalizedFeed] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  // Product loading states - now preloaded via splash screen
  const [allExcelProducts, setAllExcelProducts] = useState<Product[]>([]);
  const [excelLoading, setExcelLoading] = useState(false); // Products come preloaded
  const [excelError, setExcelError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  // Platform loading status tracking (simplified since products are preloaded)
  const [platformLoadingStatus, setPlatformLoadingStatus] = useState<{
    [platform: string]: 'loading' | 'loaded' | 'error'
  }>({});
  const [currentLoadingPlatform, setCurrentLoadingPlatform] = useState<string>('');

  // Generate personalized feed with platform interleaving from Supabase data
  const generatePersonalizedFeed = (products: Product[]) => {
    if (!products || products.length === 0) {
      return [];
    }
    
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
    const shuffle = (arr: Product[]) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const shuffledMeesho = shuffle(meeshoProducts);
    const shuffledAjio = shuffle(ajioProducts);
    const shuffledAmazon = shuffle(amazonProducts);
    const shuffledOther = shuffle(otherProducts);
    
    // Interleave with 2-3:1 ratio (Meesho/Ajio : Amazon)
    const result: Product[] = [];
    let meeshoIdx = 0, ajioIdx = 0, amazonIdx = 0, otherIdx = 0;
    
    while (meeshoIdx < shuffledMeesho.length || ajioIdx < shuffledAjio.length || amazonIdx < shuffledAmazon.length || otherIdx < shuffledOther.length) {
      // Add 2 Meesho products
      for (let i = 0; i < 2 && meeshoIdx < shuffledMeesho.length; i++) {
        result.push(shuffledMeesho[meeshoIdx++]);
      }
      // Add 1 Ajio product
      if (ajioIdx < shuffledAjio.length) {
        result.push(shuffledAjio[ajioIdx++]);
      }
      // Add 1 Amazon product (less frequent)
      if (amazonIdx < shuffledAmazon.length && Math.random() > 0.3) { // 70% chance to include Amazon
        result.push(shuffledAmazon[amazonIdx++]);
      }
      // Add other products
      if (otherIdx < shuffledOther.length) {
        result.push(shuffledOther[otherIdx++]);
      }
    }
    
    return result;
  };

  // Handle products loaded from splash screen
  const handleProductsLoaded = (products: Product[]) => {
    console.log(`🎉 Products preloaded: ${products.length} total products`);
    setAllExcelProducts(products);
    
    // Generate personalized feed from preloaded products
    if (products.length > 0) {
      const feed = generatePersonalizedFeed(products);
      setPersonalizedFeed(feed);
    }
    
    // Mark all platforms as loaded since products are complete
    const platforms = [...new Set(products.map(p => p.platform))];
    const loadedStatus: { [platform: string]: 'loading' | 'loaded' | 'error' } = {};
    platforms.forEach(platform => {
      loadedStatus[platform] = 'loaded';
    });
    setPlatformLoadingStatus(loadedStatus);
    
    setShowSplash(false);
  };

  // Refresh feed only on button click - regenerate from Supabase data
  const handleRefreshFeed = () => {
    if (allExcelProducts.length > 0) {
      const feed = generatePersonalizedFeed(allExcelProducts);
      setPersonalizedFeed(feed);
    }
  };

  // Ensure Home tab is always the initial tab on first load
  useEffect(() => {
    if (!activeTab) {
      setActiveTab("home");
    }
  }, [activeTab]);
  // Controls top-left back-to-home button
  const [showSearchBackButton, setShowSearchBackButton] = useState(false);
  // Onboarding permanently disabled
  const [showOnboarding] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const { toast } = useToast();
  
  // Removed tab reset logic that was causing feed refresh on navigation
  
  // Define a variable to track if the timer has been started
  const timerStarted = useRef(false);

  // Products are now loaded instantly from static data - no async loading needed
  // useEffect(() => {
  //   loadAllExcelProducts(); // Removed - using static data for instant loading
  // }, []);

  useEffect(() => {
    const getSession = async () => {
      try {
        // Check for guest mode first
        const isGuestMode = localStorage.getItem('isGuest') === 'true';
        const guestUserId = localStorage.getItem('guestUserId');
        
        if (isGuestMode && guestUserId) {
          console.log("[Auth] Found guest session", guestUserId);
          console.log("[Auth] Setting up guest user...");
          setIsGuest(true);
          
          // Create a mock user object for guest
          const guestUser = {
            id: guestUserId,
            email: `guest-${guestUserId.substring(6, 14)}@example.com`,
            user_metadata: { full_name: 'Guest User' },
            app_metadata: { provider: 'guest' },
            created_at: new Date().toISOString(),
            aud: 'authenticated',
            role: 'authenticated',
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            phone: '',
            is_anonymous: false,
            updated_at: new Date().toISOString(),
            identities: []
          } as User;
          
          setUser(guestUser);
          console.log("[Auth] Guest user set successfully");
          setLoading(false);
          // Always land on Home for guest
          setActiveTab("home");
          return;
        }
        
        // Check for regular Supabase session
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[Auth] Error getting session:", error);
          setLoading(false);
          return;
        }
        
        if (sessionData.session?.user) {
          console.log("[Auth] Found existing session", sessionData.session.user.email);
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          setIsGuest(false);
          
          // Store user email for Recently Viewed persistence
          if (sessionData.session.user.email) {
            setCurrentUserEmail(sessionData.session.user.email);
          }
          // Land on Home for authenticated users
          setActiveTab("home");
          
          // Onboarding permanently disabled; skip onboarding check
        } else {
          console.log("[Auth] No existing session found");
        }
        
        setLoading(false);
      } catch (supabaseError) {
        setExcelError("Failed to load product data from backend.");
        setExcelLoading(false);
      }
    }
    console.log('[DEBUG] useEffect running, calling getSession');
    getSession();
  }, []);

  // Listen for auth state changes and keep navigation on Home
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] Auth state changed:", event, session?.user?.email);

      const isGuestMode = localStorage.getItem('isGuest') === 'true';
      if (isGuestMode && event === 'SIGNED_OUT') {
        console.log("[Auth] Ignoring SIGNED_OUT event in guest mode");
        return;
      }

      switch (event) {
        case 'SIGNED_IN':
          setSession(session);
          setUser(session?.user ?? null);
          setIsGuest(false);
          localStorage.removeItem('isGuest');
          localStorage.removeItem('guestUserId');
          if (session?.user?.email) setCurrentUserEmail(session.user.email);
          setActiveTab('home');
          break;
        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          setIsGuest(false);
          clearCurrentUserEmail();
          localStorage.removeItem('isGuest');
          localStorage.removeItem('guestUserId');
          toast({ title: 'Signed out successfully' });
          setActiveTab('home');
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  if (!user) {
    return <AuthPage />;
  }

  if (showSplash) {
    return <SplashScreen onProductsLoaded={handleProductsLoaded} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <header className="relative flex flex-col items-center mb-6 sm:mb-8">
          {/* Top-left back-to-home button (only when search results are showing) */}
          {activeTab === 'home' && typeof showSearchBackButton !== 'undefined' && showSearchBackButton && (
            <button
              className="absolute left-0 top-0 z-30 flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 shadow"
              aria-label="Back to Home"
              onClick={() => {
                setShowSearchBackButton(false);
                handleRefreshFeed();
              }}
              style={{ marginLeft: '8px', marginTop: '4px' }}
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="fixed right-2 top-2 z-50 p-1 sm:p-2 flex items-center bg-white/90 rounded-full shadow-lg border border-gray-200">
            <CartDrawerButton />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center px-12">
            Search<span className="text-blue-600">Mart</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 text-center px-4">
            Search products across multiple platforms
          </p>
        </header>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto pb-20">
          {/* Content area with bottom padding for fixed navigation */}

          <TabsContent value="home" forceMount className="data-[state=inactive]:hidden">
            <SearchPageNew
              allExcelProducts={allExcelProducts}
              excelLoading={excelLoading}
              excelError={excelError}
              platformLoadingStatus={platformLoadingStatus}
              currentLoadingPlatform={currentLoadingPlatform}
            />
          </TabsContent>

          <TabsContent value="history" forceMount className="data-[state=inactive]:hidden">
            {activeTab === "history" && <HistoryPage user={user} session={session} isGuest={isGuest} />}
          </TabsContent>

          <TabsContent value="profile" forceMount className="data-[state=inactive]:hidden">
            {activeTab === "profile" && <ProfilePage isGuest={isGuest} user={user} session={session} />}
          </TabsContent>
          
          {/* Fixed Bottom Navigation - Inside Tabs component */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent border-none rounded-none">
              <TabsTrigger 
                value="home" 
                className="flex flex-col items-center gap-1 text-xs px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 hover:bg-gray-50"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex flex-col items-center gap-1 text-xs px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 hover:bg-gray-50"
              >
                <History className="h-5 w-5" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col items-center gap-1 text-xs px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 hover:bg-gray-50"
              >
                <UserIcon className="h-5 w-5" />
                <span>Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;


