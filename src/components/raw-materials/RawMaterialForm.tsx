import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DbRawMaterial,
  RAW_MATERIAL_TYPES,
  RAW_MATERIAL_UNITS,
  STORAGE_CONDITIONS,
  useAddRawMaterial,
  useUpdateRawMaterial,
} from '@/hooks/useRawMaterials';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CHEMICAL', 'HERB', 'PACKAGING', 'OTHER']),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'pcs']),
  strength_purity: z.string().optional(),
  min_stock: z.coerce.number().min(0, 'Must be 0 or positive').default(0),
  reorder_level: z.coerce.number().min(0, 'Must be 0 or positive').default(0),
  storage_condition: z.enum(['DRY', 'COOL', 'FRIDGE']),
  hazard_class: z.string().optional(),
  supplier: z.string().optional(),
  active: z.boolean().default(true),
});

// Unit display labels
const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  pcs: 'pcs',
};

type FormValues = z.infer<typeof formSchema>;

interface RawMaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: DbRawMaterial | null;
}

export function RawMaterialForm({ open, onOpenChange, material }: RawMaterialFormProps) {
  const addMaterial = useAddRawMaterial();
  const updateMaterial = useUpdateRawMaterial();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'CHEMICAL',
      unit: 'kg',
      min_stock: 0,
      reorder_level: 0,
      storage_condition: 'DRY',
      active: true,
    },
  });

  // Watch unit for dynamic labels
  const selectedUnit = form.watch('unit');
  const unitLabel = UNIT_LABELS[selectedUnit] || selectedUnit;

  // Reset form when material changes (for edit)
  React.useEffect(() => {
    if (open && material) {
      form.reset({
        name: material.name,
        type: material.type,
        unit: material.unit,
        strength_purity: material.strength_purity || '',
        min_stock: material.min_stock || 0,
        reorder_level: material.reorder_level || 0,
        storage_condition: material.storage_condition || 'DRY',
        hazard_class: material.hazard_class || '',
        supplier: material.supplier || '',
        active: material.active,
      });
    } else if (open && !material) {
      form.reset({
        name: '',
        type: 'CHEMICAL',
        unit: 'kg',
        min_stock: 0,
        reorder_level: 0,
        storage_condition: 'DRY',
        active: true,
      });
    }
  }, [open, material, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (material) {
        await updateMaterial.mutateAsync({ id: material.id, ...values });
      } else {
        await addMaterial.mutateAsync(values as any);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {material ? 'Edit Raw Material' : 'Add Raw Material'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Paracetamol BP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RAW_MATERIAL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RAW_MATERIAL_UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strength_purity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strength/Purity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 99.5%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock Level ({unitLabel})</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="any"
                          min="0"
                          placeholder={`Enter in ${unitLabel}`} 
                          className="pr-12"
                          {...field} 
                        />
                        <Badge 
                          variant="secondary" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        >
                          {unitLabel}
                        </Badge>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level ({unitLabel})</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="any"
                          min="0"
                          placeholder={`Enter in ${unitLabel}`} 
                          className="pr-12"
                          {...field} 
                        />
                        <Badge 
                          variant="secondary" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        >
                          {unitLabel}
                        </Badge>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storage_condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORAGE_CONDITIONS.map(condition => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hazard_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hazard Class</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Flammable" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Default Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMaterial.isPending || updateMaterial.isPending}>
                {material ? 'Update' : 'Add'} Material
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
