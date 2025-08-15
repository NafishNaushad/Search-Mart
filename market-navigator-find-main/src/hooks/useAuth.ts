import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut as signOutUser } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Handle auth state changes
  useEffect(() => {
    // Check for guest user in localStorage
    const isGuest = localStorage.getItem('isGuest') === 'true';
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        if (isGuest) {
          // Create a guest user object with a unique ID based on localStorage or generate new
          const guestId = localStorage.getItem('guestUserId') || `guest-${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('guestUserId', guestId);
          
          const guestUser: User = {
            id: guestId,
            email: `guest-${guestId.substring(0, 8)}@example.com`,
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
          };
          
          // Create a session that won't expire for a long time (year 2100)
          const guestSession = {
            access_token: `guest-access-${guestId}`,
            refresh_token: `guest-refresh-${guestId}`,
            token_type: 'bearer',
            user: guestUser,
            expires_in: 60 * 60 * 24 * 30 * 12 * 10, // 10 years
            expires_at: 4102444800, // January 1, 2100
          };

          // Store the session in localStorage to persist across page refreshes
          localStorage.setItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_REF || 'mytuwopzcvaexioecyae'}-auth-token`, 
            JSON.stringify({
              currentSession: guestSession,
              expiresAt: guestSession.expires_at * 1000,
            })
          );
          
          setUser(guestUser);
          setSession(guestSession as any);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error getting initial session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Only update if not a guest user, or if the guest session is being set
        const isGuest = localStorage.getItem('isGuest') === 'true';
        if (!isGuest || event === 'SIGNED_IN') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with Google
  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      console.error('Error signing in:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if current user is a guest
      const isGuest = localStorage.getItem('isGuest') === 'true' || 
                     (user?.id && user.id.startsWith('guest-'));
      
      // Clear guest-related data
      if (isGuest) {
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestUserId');
        
        // Clear the Supabase auth token for guest
        localStorage.removeItem(
          `sb-${import.meta.env.VITE_SUPABASE_PROJECT_REF || 'mytuwopzcvaexioecyae'}-auth-token`
        );
      } else {
        // Only try to sign out with Supabase for non-guest users
        const { error } = await signOutUser();
        if (error) throw error;
      }
      
      // Clear the session and user
      setUser(null);
      setSession(null);
      
      // Force a page reload to reset all auth state
      window.location.href = '/';
    } catch (err) {
      setError(err as Error);
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
};