import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  expense_type: z.string().min(1, 'Expense type is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
  receipt: z.any().optional(),
});

interface ExpenseFormProps {
  onExpenseAdded: () => void;
}

export const ExpenseForm = ({ onExpenseAdded }: ExpenseFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expense_type: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      currency: 'USD',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsLoading(true);
    try {
      let receiptUrl = null;

      // Upload receipt file if provided
      if (values.receipt && values.receipt[0]) {
        const file = values.receipt[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptUrl = publicUrl;
      }

      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            user_id: user.id,
            expense_type: values.expense_type,
            date: values.date,
            amount: values.amount,
            currency: values.currency,
            description: values.description,
            receipt_url: receiptUrl,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Expense added successfully',
      });

      form.reset();
      onExpenseAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add expense',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expense_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select expense type" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receipt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt/Invoice (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => field.onChange(e.target.files)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Adding...' : 'Add Expense'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};