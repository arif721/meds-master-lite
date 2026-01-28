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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DbRawMaterial,
  DbRawMaterialLot,
  useRawMaterials,
  useAddRawMaterialLot,
  useUpdateRawMaterialLot,
} from '@/hooks/useRawMaterials';

const formSchema = z.object({
  material_id: z.string().min(1, 'Material is required'),
  lot_number: z.string().min(1, 'Lot number is required'),
  received_date: z.string().min(1, 'Received date is required'),
  expiry_date: z.string().optional(),
  unit_cost: z.coerce.number().min(0, 'Cost must be positive'),
  quantity_received: z.coerce.number().min(0.001, 'Quantity is required'),
  location: z.string().optional(),
  coa_document: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot?: DbRawMaterialLot | null;
  preselectedMaterialId?: string;
}

export function LotForm({ open, onOpenChange, lot, preselectedMaterialId }: LotFormProps) {
  const { data: materials } = useRawMaterials();
  const addLot = useAddRawMaterialLot();
  const updateLot = useUpdateRawMaterialLot();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      material_id: preselectedMaterialId || '',
      lot_number: '',
      received_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      unit_cost: 0,
      quantity_received: 0,
      location: '',
      coa_document: '',
    },
  });

  // Reset form when lot changes (for edit)
  React.useEffect(() => {
    if (open && lot) {
      form.reset({
        material_id: lot.material_id,
        lot_number: lot.lot_number,
        received_date: lot.received_date,
        expiry_date: lot.expiry_date || '',
        unit_cost: lot.unit_cost,
        quantity_received: lot.quantity_received,
        location: lot.location || '',
        coa_document: lot.coa_document || '',
      });
    } else if (open && !lot) {
      form.reset({
        material_id: preselectedMaterialId || '',
        lot_number: '',
        received_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        unit_cost: 0,
        quantity_received: 0,
        location: '',
        coa_document: '',
      });
    }
  }, [open, lot, preselectedMaterialId, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (lot) {
        await updateLot.mutateAsync({ 
          id: lot.id, 
          lot_number: values.lot_number,
          expiry_date: values.expiry_date || null,
          unit_cost: values.unit_cost,
          location: values.location || null,
          coa_document: values.coa_document || null,
        });
      } else {
        await addLot.mutateAsync({
          material_id: values.material_id,
          lot_number: values.lot_number,
          received_date: values.received_date,
          expiry_date: values.expiry_date || undefined,
          unit_cost: values.unit_cost,
          quantity_received: values.quantity_received,
          location: values.location || undefined,
          coa_document: values.coa_document || undefined,
          current_balance: values.quantity_received,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {lot ? 'Edit Lot' : 'Add New Lot/Batch'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!!lot || !!preselectedMaterialId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials?.filter(m => m.active).map(material => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot/Batch No *</FormLabel>
                    <FormControl>
                      <Input placeholder="LOT-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="received_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!lot} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Store/Room/Rack" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_received"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="0" 
                        {...field} 
                        disabled={!!lot}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost (৳) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="coa_document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>COA/Document Link</FormLabel>
                  <FormControl>
                    <Input placeholder="URL or reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLot.isPending || updateLot.isPending}>
                {lot ? 'Update' : 'Add'} Lot
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
