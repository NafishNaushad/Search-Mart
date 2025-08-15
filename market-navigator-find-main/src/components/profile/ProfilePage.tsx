import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Settings, 
  LogOut, 
  LogIn,
  Lock,
  Eye,
  ShoppingCart,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { User, Session } from "@supabase/supabase-js";
import WeeklySearchChart from "./WeeklySearchChart";
import { getRecentlyViewed, addRecentlyViewed, clearGuestData } from "@/utils/recentlyViewed";
import { Product } from "@/types/product";
import ProductDetailModal from "@/components/search/ProductDetailModal";

interface UserProfile {
  id: string;
  email: string;
  country: string;
  plan: string;
  search_count_today: number;
  created_at: string;
}

interface ProfilePageProps {
  isGuest?: boolean;
  user?: User | null;
  session?: Session | null;
}

const ProfilePage = ({ isGuest = false, user, session }: ProfilePageProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false); // Tab is always solid - no loading
  const [updating, setUpdating] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [recentlyViewedScrollPosition, setRecentlyViewedScrollPosition] = useState(0);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const { toast } = useToast();

  // Load profile data and recently viewed when authentication props change
  useEffect(() => {
    console.log('[ProfilePage] useEffect triggered for profile and recently viewed loading');
    loadProfile();
    loadRecentlyViewed();
    
    // Listen for tab visibility change (user switches back) - strict control
    const handleVisibility = () => {
      if (!document.hidden && !loading) {
        console.log('[ProfilePage] Tab became visible, refreshing recently viewed...');
        loadRecentlyViewed();
      }
    };
    
    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recentlyViewed') {
        console.log('[ProfilePage] localStorage changed, refreshing recently viewed...');
        loadRecentlyViewed();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, session, isGuest]);

  const loadRecentlyViewed = async () => {
    try {
      const products = await getRecentlyViewed();
      setRecentlyViewed(products);
      console.log('[ProfilePage] Loaded recently viewed products:', products.length);
    } catch (error) {
      console.error('[ProfilePage] Error loading recently viewed:', error);
      setRecentlyViewed([]);
    }
  };



  const addTestProduct = () => {
    const testProduct = {
      id: 'test-product-1',
      title: 'Test Product for Recently Viewed',
      price: '999',
      currency: '₹',
      image: '/placeholder.svg',
      platform: 'Test Platform',
      link: '#'
    };
    
    console.log('[ProfilePage] Adding test product manually...');
    try {
      addRecentlyViewed(testProduct);
      console.log('[ProfilePage] Test product added, refreshing...');
      setTimeout(() => loadRecentlyViewed(), 100);
    } catch (error) {
      console.error('[ProfilePage] Error adding test product:', error);
    }
  };

  const handleProductClick = (product: Product) => {
    console.log('[ProfilePage] Product clicked in Recently Viewed:', product.title);
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    // Refresh recently viewed in case a new product was added
    console.log('[ProfilePage] Modal closed, refreshing recently viewed...');
    loadRecentlyViewed();
  };

  const loadProfile = async () => {
    try {
      // No loading state - tab is always solid and instant
      console.log('[ProfilePage] loadProfile called with:', { isGuest, user: user?.id, userEmail: user?.email });
      
      // Skip profile loading for guest users
      if (isGuest) {
        console.log('[ProfilePage] Skipping profile load for guest user');
        return;
      }

      // Use passed user prop instead of fetching from supabase
      if (!user) { 
        console.log('[ProfilePage] No user found, skipping profile load');
        return; 
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) { 
        console.error('Profile load error:', error);
        setProfile(null); // Provide fallback
        return; 
      }
      
      if (data) {
        setProfile(data);
        setCountry(data.country || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null); // Always provide fallback data
      toast({
        title: "Profile Load Error",
        description: "Unable to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Tab is always solid - no loading states
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ country })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, country } : null);
      toast({
        title: "Profile updated",
        description: "Your preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Check if current user is a guest
      const isCurrentGuest = isGuest || (user?.id && user.id.startsWith('guest-'));
      
      // Clear guest-related data
      if (isCurrentGuest) {
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestUserId');
        clearGuestData();
        
        // Clear the Supabase auth token for guest
        localStorage.removeItem(
          `sb-${import.meta.env.VITE_SUPABASE_PROJECT_REF || 'mytuwopzcvaexioecyae'}-auth-token`
        );
      } else {
        // Only try to sign out with Supabase for non-guest users
        await supabase.auth.signOut();
      }
      
      // Force a page reload to reset all auth state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignIn = () => {
    // Clear guest data (recently viewed, search history)
    clearGuestData();
    
    // Clear guest session data
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestUserId');
    
    // Navigate to root path which will show AuthPage
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Always show profile content - never show "Unable to load profile"
  // Profile tab should always be solid and functional

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Account Overview</CardTitle>
          <div className="flex items-center gap-2">
            {isGuest && (
              <Button 
                onClick={handleSignIn}
                size="sm"
                className="bg-black hover:bg-gray-800 text-white"
              >
                Sign in
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isGuest ? (
                  <DropdownMenuItem onClick={handleSignIn}>
                    Sign In
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Email</span>
              <span className="text-sm font-medium">
                {isGuest ? 'Guest Account' : (profile?.email || 'N/A')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Member Since</span>
              <span className="text-sm font-medium">
                {isGuest ? 'Guest Session' : (profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A')}
              </span>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Viewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Navigation Arrows */}
              {recentlyViewed.length > 3 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-md"
                    onClick={() => {
                      const container = document.getElementById('recently-viewed-container');
                      if (container) {
                        container.scrollBy({ left: -200, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-md"
                    onClick={() => {
                      const container = document.getElementById('recently-viewed-container');
                      if (container) {
                        container.scrollBy({ left: 200, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* Product Slider */}
              <div 
                id="recently-viewed-container"
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {recentlyViewed.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex-shrink-0 w-28 h-36 bg-white dark:bg-gray-800 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => handleProductClick(product)}
                  >
                    <img 
                      src={product.image} 
                      alt={product.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Search Activity */}
      <div className="weekly-search-chart-container">
        {isGuest ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Weekly Search Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Mock transparent chart */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="text-2xl font-bold text-blue-600">--</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Average searches per day</p>
                  
                  {/* Mock chart with transparent bars */}
                  <div className="flex items-end justify-between h-32 mb-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                      <div key={day} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-8 bg-blue-200 opacity-30 mb-2 rounded-t"
                          style={{ height: `${Math.random() * 80 + 20}px` }}
                        ></div>
                        <span className="text-xs text-gray-400">{day}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-200 opacity-30 rounded"></div>
                      <span className="text-gray-400">Past days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-600 opacity-30 rounded"></div>
                      <span className="text-gray-400">Today</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-200 opacity-30 rounded"></div>
                      <span className="text-gray-400">Future</span>
                    </div>
                  </div>
                </div>
                
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <div className="text-center space-y-4">
                    {/* Prominent lock icon */}
                    <div className="flex justify-center">
                      <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-2">
                        Sign in to unlock this feature
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Track your search patterns and activity
                      </p>
                      <Button 
                        onClick={handleSignIn}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Sign in to unlock
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <WeeklySearchChart user={user} session={session} isGuest={isGuest} />
        )}
      </div>

      {/* Product Detail Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-md mx-auto" aria-describedby="profile-product-modal-desc">
          <DialogDescription id="profile-product-modal-desc" className="sr-only">
            Product details modal showing information about a recently viewed product.
          </DialogDescription>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product details from your recently viewed items
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedProduct.image || '/placeholder.svg'}
                  alt={selectedProduct.title}
                  className="w-32 h-32 object-contain rounded-lg border"
                  onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-sm font-normal">{selectedProduct.title}</h3>
                <p className="text-lg font-bold text-blue-600">
                  {selectedProduct.currency} {selectedProduct.price}
                </p>
                <Button
                  onClick={() => {
                    window.open(selectedProduct.link, '_blank', 'noopener,noreferrer');
                    closeProductModal();
                  }}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
