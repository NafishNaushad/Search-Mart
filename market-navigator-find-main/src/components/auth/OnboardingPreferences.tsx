import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, ShoppingBag } from "lucide-react";

interface OnboardingPreferencesProps {
  onComplete: () => void;
}

const OnboardingPreferences = ({ onComplete }: OnboardingPreferencesProps) => {
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const { toast } = useToast();

  const interestCategories = [
    { id: "electronics", label: "Electronics & Gadgets", icon: "📱" },
    { id: "fashion", label: "Fashion & Clothing", icon: "👕" },
    { id: "home", label: "Home & Kitchen", icon: "🏠" },
    { id: "sports", label: "Sports & Fitness", icon: "⚽" },
    { id: "books", label: "Books & Education", icon: "📚" },
    { id: "beauty", label: "Beauty & Personal Care", icon: "🧴" }
  ];

  const handleInterestToggle = (categoryId: string) => {
    setInterests(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSavePreferences = async () => {
    if (!gender) {
      toast({
        title: "Please select your gender",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No user found. Please try signing in again.",
          variant: "destructive",
        });
        return;
      }

      console.log('[Onboarding] Saving preferences for user:', user.id);

      // Store preferences in localStorage for quick access
      localStorage.setItem('userPreferences', JSON.stringify({
        gender,
        interests,
        onboardingCompleted: true
      }));
      
      // Store completion status with user ID
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      
      console.log('[Onboarding] Preferences saved to localStorage');

      // Try to save to database (optional - won't block completion)
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            country: 'India',
            plan: 'free',
            search_count_today: 0,
            created_at: new Date().toISOString()
          });
        console.log('[Onboarding] Profile saved to database');
      } catch (dbError) {
        console.log('[Onboarding] Database save failed (non-critical):', dbError);
      }

      toast({
        title: "Welcome to SearchMart!",
        description: "Your personalized experience is ready.",
      });

      console.log('[Onboarding] Calling onComplete()');
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error saving preferences",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to SearchMart!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Let's personalize your shopping experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Tell us about yourself
            </CardTitle>
            <CardDescription>
              This helps us show you more relevant products and deals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gender Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">Female</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Interest Categories */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                What are you interested in? (Select all that apply)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {interestCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      interests.includes(category.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                    onClick={() => handleInterestToggle(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-sm font-medium">{category.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSavePreferences} 
                className="w-full" 
                disabled={loading || !gender}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can change these preferences anytime in your profile settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPreferences;
