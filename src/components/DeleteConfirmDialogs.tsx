import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkDependencies, SoftDeleteTable } from '@/hooks/useSoftDelete';

interface SoftDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function SoftDeleteDialog({ 
  open, 
  onOpenChange, 
  itemName, 
  onConfirm, 
  isPending = false 
}: SoftDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-warning" />
            ট্র্যাশে সরাবেন?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>"{itemName}"</strong> ট্র্যাশে সরানো হবে। পরে চাইলে রিস্টোর করতে পারবেন।
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            ট্র্যাশে সরান
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function RestoreDialog({ 
  open, 
  onOpenChange, 
  itemName, 
  onConfirm, 
  isPending = false 
}: RestoreDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            রিস্টোর করবেন?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>"{itemName}"</strong> রিস্টোর করলে আবার Active লিস্টে ফিরে যাবে।
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            রিস্টোর করুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId: string;
  table: SoftDeleteTable;
  onConfirm: () => void;
  isPending?: boolean;
}

export function PermanentDeleteDialog({ 
  open, 
  onOpenChange, 
  itemName, 
  itemId,
  table,
  onConfirm, 
  isPending = false 
}: PermanentDeleteDialogProps) {
  const [checking, setChecking] = useState(false);
  const [hasDependencies, setHasDependencies] = useState(false);
  const [dependencyLabels, setDependencyLabels] = useState<string[]>([]);
  
  useEffect(() => {
    if (open && itemId) {
      setChecking(true);
      checkDependencies(table, itemId).then(result => {
        setHasDependencies(result.hasDependencies);
        setDependencyLabels(result.dependencyLabels);
        setChecking(false);
      });
    }
  }, [open, itemId, table]);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            স্থায়ীভাবে ডিলিট করবেন?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              <strong>"{itemName}"</strong> স্থায়ীভাবে ডিলিট করা হবে। 
              <span className="text-destructive font-medium"> এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না!</span>
            </p>
            
            {checking ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                সম্পর্কিত ডাটা চেক করা হচ্ছে...
              </div>
            ) : hasDependencies ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                <p className="text-destructive font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  ডিলিট করা যাবে না!
                </p>
                <p className="text-sm">
                  এই রেকর্ডের সাথে সম্পর্কিত ডাটা আছে:
                </p>
                <ul className="text-sm list-disc list-inside">
                  {dependencyLabels.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  এই রেকর্ড Archived/Deleted হিসেবে রাখুন।
                </p>
              </div>
            ) : (
              <div className="bg-accent/50 rounded-lg p-3 text-sm">
                ✓ কোনো সম্পর্কিত ডাটা নেই। স্থায়ীভাবে ডিলিট করা নিরাপদ।
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={checking || hasDependencies}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            স্থায়ীভাবে ডিলিট করুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
