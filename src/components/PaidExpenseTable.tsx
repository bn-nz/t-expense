import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { File, FileX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Expense {
  id: string;
  expense_type: string;
  date: string;
  amount: number;
  currency: string;
  description: string | null;
  receipt_url: string | null;
  claim_note: string | null;
  created_at: string;
}

interface PaidExpenseTableProps {
  fromDate?: Date;
  toDate?: Date;
}

export const PaidExpenseTable = ({ fromDate, toDate }: PaidExpenseTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPaidExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('claim_paid', true);

      // Apply date range filter
      if (fromDate) {
        query = query.gte('date', format(fromDate, 'yyyy-MM-dd'));
      }
      if (toDate) {
        query = query.lte('date', format(toDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch paid expenses',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaidExpenses();
  }, [user, fromDate, toDate]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('paid-expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Expense change detected:', payload);
          fetchPaidExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Basic currency conversion rates (you may want to use a real-time API)
  const currencyRates: { [key: string]: number } = {
    USD: 1,
    EUR: 1.09,
    GBP: 1.27,
    CAD: 0.74,
    AUD: 0.66,
    JPY: 0.0067,
    // Add more currencies as needed
  };

  const convertToUSD = (amount: number, currency: string): number => {
    const rate = currencyRates[currency] || 1;
    return amount * rate;
  };

  const calculateTotalInUSD = (): number => {
    return expenses.reduce((total, expense) => {
      return total + convertToUSD(expense.amount, expense.currency);
    }, 0);
  };

  const handleReceiptClick = async (receiptUrl: string) => {
    try {
      // Extract the file path from the full URL
      const urlParts = receiptUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'receipts');
      if (bucketIndex === -1) {
        window.open(receiptUrl, '_blank');
        return;
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 604800); // 1 week in seconds
      
      if (error) {
        console.error('Error generating signed URL:', error);
        window.open(receiptUrl, '_blank');
        return;
      }
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error handling receipt click:', error);
      window.open(receiptUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading paid expenses...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Paid Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No paid expenses found for the selected date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Claim Note</TableHead>
                  <TableHead className="w-16">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell className="capitalize">{expense.expense_type}</TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>{expense.description || '-'}</TableCell>
                    <TableCell>{expense.claim_note || '-'}</TableCell>
                    <TableCell>
                      {expense.receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReceiptClick(expense.receipt_url!)}
                          className="h-8 w-8 p-0"
                        >
                          <File className="h-4 w-4" />
                        </Button>
                      ) : (
                        <FileX className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length > 0 && (
                  <TableRow className="font-medium bg-muted/50">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(calculateTotalInUSD())}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};