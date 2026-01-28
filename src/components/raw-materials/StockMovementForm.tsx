import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  useRawMaterials,
  useRawMaterialLots,
  useAddStockIn,
  useAddStockOut,
  useAddAdjustment,
  MOVEMENT_TYPES,
} from '@/hooks/useRawMaterials';

const stockInSchema = z.object({
  material_id: z.string().min(1, 'Material is required'),
  lot_id: z.string().min(1, 'Lot is required'),
  type: z.enum(['OPENING', 'RECEIVE', 'PURCHASE', 'TRANSFER_IN']),
  quantity: z.coerce.number().min(0.001, 'Quantity is required'),
  unit_cost: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
  invoice_number: z.string().optional(),
  to_location: z.string().optional(),
  notes: z.string().optional(),
});

const stockOutSchema = z.object({
  material_id: z.string().min(1, 'Material is required'),
  lot_id: z.string().min(1, 'Lot is required'),
  type: z.enum(['PRODUCTION', 'SAMPLE', 'WASTE', 'TRANSFER_OUT']),
  quantity: z.coerce.number().min(0.001, 'Quantity is required'),
  from_location: z.string().optional(),
  to_location: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  material_id: z.string().min(1, 'Material is required'),
  lot_id: z.string().min(1, 'Lot is required'),
  quantity: z.coerce.number().refine(val => val !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

type StockInValues = z.infer<typeof stockInSchema>;
type StockOutValues = z.infer<typeof stockOutSchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

interface StockMovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'in' | 'out' | 'adjustment';
}

export function StockMovementForm({ open, onOpenChange, mode }: StockMovementFormProps) {
  const { data: materials } = useRawMaterials();
  const { data: allLots } = useRawMaterialLots();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  
  const addStockIn = useAddStockIn();
  const addStockOut = useAddStockOut();
  const addAdjustment = useAddAdjustment();

  // Separate forms for each mode to avoid type issues
  const stockInForm = useForm<StockInValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      material_id: '',
      lot_id: '',
      type: 'RECEIVE',
      quantity: 0,
      unit_cost: 0,
      supplier: '',
      invoice_number: '',
      to_location: '',
      notes: '',
    },
  });

  const stockOutForm = useForm<StockOutValues>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      material_id: '',
      lot_id: '',
      type: 'PRODUCTION',
      quantity: 0,
      from_location: '',
      to_location: '',
      reason: '',
      notes: '',
    },
  });

  const adjustmentForm = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      material_id: '',
      lot_id: '',
      quantity: 0,
      reason: '',
      notes: '',
    },
  });

  // Watch material_id from the correct form based on mode
  const inMaterialId = stockInForm.watch('material_id');
  const outMaterialId = stockOutForm.watch('material_id');
  const adjMaterialId = adjustmentForm.watch('material_id');
  const inLotId = stockInForm.watch('lot_id');
  const outLotId = stockOutForm.watch('lot_id');
  const adjLotId = adjustmentForm.watch('lot_id');
  
  useEffect(() => {
    if (mode === 'in') setSelectedMaterialId(inMaterialId);
    else if (mode === 'out') setSelectedMaterialId(outMaterialId);
    else setSelectedMaterialId(adjMaterialId);
  }, [mode, inMaterialId, outMaterialId, adjMaterialId]);

  useEffect(() => {
    if (mode === 'in') setSelectedLotId(inLotId);
    else if (mode === 'out') setSelectedLotId(outLotId);
    else setSelectedLotId(adjLotId);
  }, [mode, inLotId, outLotId, adjLotId]);

  // Filter lots for selected material (only non-deleted lots with balance > 0 for stock out)
  const filteredLots = allLots?.filter(lot => {
    if (lot.material_id !== selectedMaterialId || lot.is_deleted) return false;
    // For stock out, only show lots with available balance
    if (mode === 'out' && lot.current_balance <= 0) return false;
    return true;
  }) || [];

  // Auto-select lot if only one available
  useEffect(() => {
    if (selectedMaterialId && filteredLots.length === 1 && !selectedLotId) {
      const lotId = filteredLots[0].id;
      if (mode === 'in') stockInForm.setValue('lot_id', lotId);
      else if (mode === 'out') stockOutForm.setValue('lot_id', lotId);
      else adjustmentForm.setValue('lot_id', lotId);
    }
  }, [selectedMaterialId, filteredLots, selectedLotId, mode]);

  const selectedLot = filteredLots.find(lot => lot.id === selectedLotId);
  
  // Check if lot is expired
  const isExpired = selectedLot?.expiry_date && new Date(selectedLot.expiry_date) < new Date();

  const onSubmitIn = async (values: StockInValues) => {
    try {
      await addStockIn.mutateAsync({
        material_id: values.material_id,
        lot_id: values.lot_id,
        type: values.type,
        quantity: values.quantity,
        unit_cost: values.unit_cost,
        supplier: values.supplier,
        invoice_number: values.invoice_number,
        to_location: values.to_location,
        notes: values.notes,
      });
      onOpenChange(false);
      stockInForm.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const onSubmitOut = async (values: StockOutValues) => {
    try {
      await addStockOut.mutateAsync({
        material_id: values.material_id,
        lot_id: values.lot_id,
        type: values.type,
        quantity: values.quantity,
        from_location: values.from_location,
        to_location: values.to_location,
        reason: values.reason,
        notes: values.notes,
      });
      onOpenChange(false);
      stockOutForm.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const onSubmitAdjustment = async (values: AdjustmentValues) => {
    try {
      await addAdjustment.mutateAsync({
        material_id: values.material_id,
        lot_id: values.lot_id,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes,
      });
      onOpenChange(false);
      adjustmentForm.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const inTypes = MOVEMENT_TYPES.filter(t => t.direction === 'in');
  const outTypes = MOVEMENT_TYPES.filter(t => t.direction === 'out');

  const renderFormContent = () => {
    if (mode === 'in') {
      return (
        <Form {...stockInForm}>
          <form onSubmit={stockInForm.handleSubmit(onSubmitIn)} className="space-y-4">
            <FormField
              control={stockInForm.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <FormField
              control={stockInForm.control}
              name="lot_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot/Batch *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMaterialId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedMaterialId ? "Select lot" : "Select material first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lot_number} (Balance: {lot.current_balance})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stockInForm.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {inTypes.map(type => (
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
              control={stockInForm.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={stockInForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockInForm.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice No</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={stockInForm.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Cost (৳)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stockInForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addStockIn.isPending}>
                Receive Stock
              </Button>
            </div>
          </form>
        </Form>
      );
    }

    if (mode === 'out') {
      return (
        <Form {...stockOutForm}>
          <form onSubmit={stockOutForm.handleSubmit(onSubmitOut)} className="space-y-4">
            <FormField
              control={stockOutForm.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <FormField
              control={stockOutForm.control}
              name="lot_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot/Batch *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMaterialId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedMaterialId ? "Select lot" : "Select material first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lot_number} (Balance: {lot.current_balance})
                          {lot.expiry_date && ` | Exp: ${lot.expiry_date}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This lot has expired ({selectedLot?.expiry_date}). 
                  Stock out from expired lots is blocked.
                </AlertDescription>
              </Alert>
            )}

            {selectedLot && selectedLot.current_balance === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No stock available in this lot. Current balance: 0
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={stockOutForm.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {outTypes.map(type => (
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
              control={stockOutForm.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" placeholder="0" {...field} />
                  </FormControl>
                  {selectedLot && (
                    <p className="text-xs text-muted-foreground">
                      Current balance: {selectedLot.current_balance}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stockOutForm.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Usage reason" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stockOutForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addStockOut.isPending || !!isExpired || (selectedLot?.current_balance || 0) === 0}
              >
                Issue Stock
              </Button>
            </div>
          </form>
        </Form>
      );
    }

    // Adjustment mode
    return (
      <Form {...adjustmentForm}>
        <form onSubmit={adjustmentForm.handleSubmit(onSubmitAdjustment)} className="space-y-4">
          <FormField
            control={adjustmentForm.control}
            name="material_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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

          <FormField
            control={adjustmentForm.control}
            name="lot_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lot/Batch *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMaterialId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedMaterialId ? "Select lot" : "Select material first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredLots.map(lot => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.lot_number} (Balance: {lot.current_balance})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={adjustmentForm.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity * (+ to increase, - to decrease)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" placeholder="+10 or -5" {...field} />
                </FormControl>
                {selectedLot && (
                  <p className="text-xs text-muted-foreground">
                    Current balance: {selectedLot.current_balance}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={adjustmentForm.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Damaged, Lost, Recount" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={adjustmentForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional notes..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addAdjustment.isPending}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'in' ? 'Stock In (Receive)' : mode === 'out' ? 'Stock Out (Issue)' : 'Stock Adjustment'}
          </DialogTitle>
        </DialogHeader>
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
}
