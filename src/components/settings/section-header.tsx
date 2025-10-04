import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SectionHeader({ title, count, isExpanded, onToggle }: SectionHeaderProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 shadow-sm hover:shadow-md" onClick={onToggle}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-900 flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                <ChevronDown className="w-5 h-5 text-blue-600" />
              </div>
              <span>{title}</span>
            </div>
            <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}
