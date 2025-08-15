import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const HistoryPage: React.FC = () => {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Search History</h2>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Your search history will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryPage;