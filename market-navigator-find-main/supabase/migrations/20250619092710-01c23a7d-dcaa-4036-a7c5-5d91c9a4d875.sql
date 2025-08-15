
-- Create users profile table to store additional user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  country TEXT DEFAULT 'US',
  search_count_today INTEGER DEFAULT 0,
  last_reset DATE DEFAULT CURRENT_DATE,
  plan TEXT DEFAULT 'Free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create search history table
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  query TEXT NOT NULL,
  filters JSONB,
  results_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create country configuration table
CREATE TABLE public.country_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT UNIQUE NOT NULL,
  currency_symbol TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  daily_search_limit INTEGER DEFAULT 10,
  platforms JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default country configurations
INSERT INTO public.country_config (country_code, currency_symbol, currency_code, daily_search_limit, platforms) VALUES
('IN', '₹', 'INR', 10, '["amazon.in", "flipkart.com", "meesho.com"]'),
('US', '$', 'USD', 10, '["amazon.com", "aliexpress.com"]'),
('UK', '£', 'GBP', 10, '["amazon.co.uk", "aliexpress.com"]'),
('CA', '$', 'CAD', 10, '["amazon.ca", "aliexpress.com"]');

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for search_history
CREATE POLICY "Users can view their own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON public.search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for country_config (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view country config" ON public.country_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, country)
  VALUES (NEW.id, NEW.email, 'US');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to reset daily search counts
CREATE OR REPLACE FUNCTION public.reset_daily_search_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET search_count_today = 0, last_reset = CURRENT_DATE
  WHERE last_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
