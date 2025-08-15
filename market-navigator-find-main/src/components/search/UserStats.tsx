
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search, Globe, DollarSign } from "lucide-react";

interface UserStatsProps {
  searchCount: number;
  searchLimit: number;
  currency: string;
  country: string;
}

const UserStats = ({ searchCount, searchLimit, currency, country }: UserStatsProps) => {
  const progressPercentage = (searchCount / searchLimit) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="flex items-center p-4">
          <Search className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Searches Today
            </p>
            <p className="text-2xl font-bold">
              {searchCount}/{searchLimit}
            </p>
            <Progress value={progressPercentage} className="mt-2 h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-4">
          <Globe className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Region
            </p>
            <p className="text-2xl font-bold">{country}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-4">
          <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Currency
            </p>
            <p className="text-2xl font-bold">{currency}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStats;
