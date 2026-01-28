import { Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrashToggleProps {
  showDeleted: boolean;
  onToggle: (show: boolean) => void;
  deletedCount?: number;
  className?: string;
}

export function TrashToggle({ showDeleted, onToggle, deletedCount = 0, className }: TrashToggleProps) {
  return (
    <Button
      variant={showDeleted ? "secondary" : "outline"}
      size="sm"
      onClick={() => onToggle(!showDeleted)}
      className={cn("gap-2", className)}
    >
      {showDeleted ? (
        <>
          <RotateCcw className="w-4 h-4" />
          Active দেখুন
        </>
      ) : (
        <>
          <Trash2 className="w-4 h-4" />
          Trash ({deletedCount})
        </>
      )}
    </Button>
  );
}
