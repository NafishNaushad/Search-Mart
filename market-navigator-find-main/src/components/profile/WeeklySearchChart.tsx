import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { User, Session } from "@supabase/supabase-js";

interface WeeklySearchData {
  day: string;
  searches: number;
  date: Date;
  isToday: boolean;
  isFuture: boolean;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  user_id: string;
}

interface WeeklySearchChartProps {
  user?: User | null;
  session?: Session | null;
  isGuest?: boolean;
}

const WeeklySearchChart = ({ user, session, isGuest = false }: WeeklySearchChartProps) => {
  const [weeklyData, setWeeklyData] = useState<WeeklySearchData[]>([]);
  const [averageSearches, setAverageSearches] = useState<number>(0);
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week, 1 = next week
  const [loading, setLoading] = useState<boolean>(false); // Tab is always solid - no loading
  const [error, setError] = useState<string | null>(null);

  // Helper: convert a Date or timestamp string to a Date representing the same clock time in IST
  const toIST = (dateLike: Date | string) => {
    const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    // Build a new Date from the locale string in IST to lock the components to IST
    const parts = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return parts;
  };

  // Helper: strip time to midnight in IST for day bucketing
  const startOfDayIST = (dateLike: Date | string) => {
    const d = toIST(dateLike);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Helper: compare two dates by IST day equality
  const isSameISTDay = (a: Date | string, b: Date | string) => {
    const da = startOfDayIST(a);
    const db = startOfDayIST(b);
    return da.getTime() === db.getTime();
  };

  useEffect(() => {
    loadWeeklySearchData();
    
    // Listen for real-time search events
    const handleSearchPerformed = () => {
      console.log('[WeeklySearchChart] Search performed event received');
      // Only update if we're viewing the current week
      if (currentWeekOffset === 0) {
        // Small delay to ensure search history is saved first
        setTimeout(() => {
          loadWeeklySearchData();
        }, 500);
      }
    };
    
    // Add event listener for real-time updates
    window.addEventListener('searchPerformed', handleSearchPerformed);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('searchPerformed', handleSearchPerformed);
    };
  }, [currentWeekOffset, user, session, isGuest]);

  const loadWeeklySearchData = async () => {
    try {
      // No loading state - tab is always solid and instant
      setError(null);
      
      console.log('[WeeklySearchChart] loadWeeklySearchData called with:', { isGuest, user: user?.id, userEmail: user?.email });
      
      // Use passed props instead of internal supabase calls
      if (isGuest || !user) {
        // For guests, try to read from localStorage saved by SearchPageNew
        const guestUserId = localStorage.getItem('guestUserId');
        const isGuestFlag = localStorage.getItem('isGuest') === 'true';
        if (isGuestFlag && guestUserId) {
          const guestHistoryKey = `searchHistory_guest_${guestUserId}`;
          const raw = localStorage.getItem(guestHistoryKey);
          if (raw) {
            try {
              const guestHistory = JSON.parse(raw) as { timestamp: string }[];
              const weekData = generateWeekDataFromHistory(currentWeekOffset, guestHistory as any);
              setWeeklyData(weekData);
              calculateAverage(weekData);
              return;
            } catch (e) {
              console.warn('[WeeklySearchChart] Failed to parse guest history:', e);
            }
          }
        }
        // Fallback: empty week
        console.log('[WeeklySearchChart] Guest user or no user, setting empty data');
        setWeeklyData(generateEmptyWeekData(currentWeekOffset));
        setAverageSearches(0);
        return;
      }

      // Authenticated users: query pre-aggregated IST-bucketed daily view for current week window
      const nowIST = toIST(new Date());
      const mondayOfWeek = addWeeks(startOfWeek(nowIST, { weekStartsOn: 1 }), currentWeekOffset);
      const sundayOfWeek = addDays(mondayOfWeek, 6);

      const mondayStr = format(mondayOfWeek, 'yyyy-MM-dd');
      const sundayStr = format(sundayOfWeek, 'yyyy-MM-dd');

      // Use an untyped query because 'search_history_daily' is a view not present in the generated TS schema
      const { data: dailyRows, error } = await supabase
        .from<any>('search_history_daily')
        .select('*')
        .eq('user_id', user.id)
        .gte('day_ist', mondayStr)
        .lte('day_ist', sundayStr);

      if (error) {
        console.error('Error loading daily search history view:', error);
        setError('Failed to load search history');
        setWeeklyData(generateEmptyWeekData(currentWeekOffset));
        setAverageSearches(0);
        return;
      }

      // Map results by day string
      const countByDate: Record<string, number> = {};
      (dailyRows || []).forEach((row: any) => {
        const key: string = String(row.day_ist); // ensure key is string
        countByDate[key] = typeof row.searches === 'number' ? row.searches : Number(row.searches) || 0;
      });

      // Build week data using IST helpers
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekData = days.map((dayName, index) => {
        const dayDate = addDays(mondayOfWeek, index);
        const isToday = isSameISTDay(dayDate, nowIST);
        const isFuture = startOfDayIST(dayDate).getTime() > startOfDayIST(nowIST).getTime();
        const key = format(dayDate, 'yyyy-MM-dd');
        const searchesForDay = countByDate[key] || 0;
        return {
          day: dayName,
          searches: searchesForDay,
          date: dayDate,
          isToday,
          isFuture,
        } as WeeklySearchData;
      });

      setWeeklyData(weekData);
      calculateAverage(weekData);
    } catch (error) {
      console.error('Error in loadWeeklySearchData:', error);
      setError('Unable to load weekly search data');
      setWeeklyData(generateEmptyWeekData(currentWeekOffset));
      setAverageSearches(0);
    } finally {
      // Tab is always solid - no loading states
    }
  };

  const generateEmptyWeekData = (weekOffset: number): WeeklySearchData[] => {
    // Base everything on IST
    const nowIST = toIST(new Date());
    // Monday of the target week in IST
    const mondayOfWeek = addWeeks(startOfWeek(nowIST, { weekStartsOn: 1 }), weekOffset);
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((dayName, index) => {
      const dayDate = addDays(mondayOfWeek, index);
      const isToday = isSameISTDay(dayDate, nowIST);
      const isFuture = startOfDayIST(dayDate).getTime() > startOfDayIST(nowIST).getTime();
      
      return {
        day: dayName,
        searches: 0,
        date: dayDate,
        isToday,
        isFuture
      };
    });
  };

  const generateWeekDataFromHistory = (weekOffset: number, searchHistory: SearchHistoryItem[]): WeeklySearchData[] => {
    // Base everything on IST
    const nowIST = toIST(new Date());
    // Monday of the target week in IST
    const mondayOfWeek = addWeeks(startOfWeek(nowIST, { weekStartsOn: 1 }), weekOffset);
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = days.map((dayName, index) => {
      const dayDate = addDays(mondayOfWeek, index);
      const isToday = isSameISTDay(dayDate, nowIST);
      const isFuture = startOfDayIST(dayDate).getTime() > startOfDayIST(nowIST).getTime();
      
      // Count searches for this specific day
      const searchesForDay = searchHistory.filter(search => {
        try {
          // Compare by IST day buckets
          return isSameISTDay(search.timestamp, dayDate);
        } catch (dateError) {
          console.warn('Error parsing search timestamp:', search.timestamp, dateError);
          return false;
        }
      }).length;
      
      return {
        day: dayName,
        searches: searchesForDay,
        date: dayDate,
        isToday,
        isFuture
      };
    });
    
    return weekData;
  };

  const calculateAverage = (data: WeeklySearchData[]) => {
    const total = data.reduce((sum, day) => sum + day.searches, 0);
    const avg = Math.round((total / data.length) * 10) / 10; // Round to 1 decimal
    setAverageSearches(avg);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeekOffset(prev => prev - 1);
    } else {
      setCurrentWeekOffset(prev => prev + 1);
    }
  };

  const getWeekRange = () => {
    // Base on IST for display as well
    const nowIST = toIST(new Date());
    const mondayOfWeek = addWeeks(startOfWeek(nowIST, { weekStartsOn: 1 }), currentWeekOffset);
    const sundayOfWeek = addDays(mondayOfWeek, 6);
    
    const formatDate = (date: Date) => {
      return format(date, 'MMM d');
    };
    
    if (currentWeekOffset === 0) {
      return 'This Week';
    } else {
      return `${formatDate(mondayOfWeek)} - ${formatDate(sundayOfWeek)}`;
    }
  };

  const maxSearches = Math.max(...weeklyData.map(d => d.searches), 1);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Weekly Search Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Weekly Search Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <p className="text-sm">Unable to load search activity</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => loadWeeklySearchData()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weekly Search Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateWeek('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getWeekRange()}
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateWeek('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Average searches per week */}
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{averageSearches}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Average searches per day</p>
          </div>
          
          {/* Bar chart */}
          <div className="flex items-end justify-between gap-1 sm:gap-2 h-32 px-1 sm:px-2">
            {weeklyData.map((day, index) => {
              const height = (day.searches / Math.max(maxSearches, 1)) * 100;
              
              return (
                <div key={`${day.day}-${day.date}`} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center justify-end h-24 w-full">
                    <span className="text-xs text-gray-600 mb-1">{day.searches}</span>
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${
                        day.isToday
                          ? 'bg-blue-600 text-white'
                          : day.isFuture
                          ? 'bg-gray-100 text-gray-400'
                          : day.searches > 0
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-xs mt-2 ${
                    day.isToday && currentWeekOffset === 0
                      ? 'font-bold text-blue-600' 
                      : day.isFuture && currentWeekOffset === 0
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 text-xs text-gray-500 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span>Past days</span>
            </div>
            {currentWeekOffset === 0 && (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <span>Future</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklySearchChart;
