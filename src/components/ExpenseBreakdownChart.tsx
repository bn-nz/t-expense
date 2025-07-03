import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  currency: string;
}

interface ExpenseBreakdownChartProps {
  fromDate?: Date;
  toDate?: Date;
}

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#0088FE',
  '#00C49F', 
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF7C7C',
  '#8DD1E1',
  '#D084D0'
];

export const ExpenseBreakdownChart = ({ fromDate, toDate }: ExpenseBreakdownChartProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

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

  const fetchExpenseBreakdown = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('id, expense_type, amount, currency')
        .eq('user_id', user.id);

      // Apply date range filter
      if (fromDate) {
        query = query.gte('date', format(fromDate, 'yyyy-MM-dd'));
      }
      if (toDate) {
        query = query.lte('date', format(toDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setChartData([]);
        setTotalAmount(0);
        return;
      }

      // Group expenses by type and convert to USD
      const expensesByType: { [key: string]: number } = {};
      let total = 0;

      data.forEach((expense: Expense) => {
        const amountInUSD = convertToUSD(expense.amount, expense.currency);
        const capitalizedType = expense.expense_type.charAt(0).toUpperCase() + expense.expense_type.slice(1);
        
        expensesByType[capitalizedType] = (expensesByType[capitalizedType] || 0) + amountInUSD;
        total += amountInUSD;
      });

      setTotalAmount(total);

      // Convert to chart data format with percentages
      const formattedData: ChartData[] = Object.entries(expensesByType)
        .map(([type, amount], index) => ({
          name: type,
          value: amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.value - a.value); // Sort by amount descending

      setChartData(formattedData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch expense breakdown',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseBreakdown();
  }, [user, fromDate, toDate]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('expense-breakdown-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchExpenseBreakdown();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const renderTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ${data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading expense breakdown...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown by Type (All Expenses)</CardTitle>
        <p className="text-sm text-muted-foreground mb-2">All amounts converted to USD</p>
        {totalAmount > 0 && (
          <p className="text-sm text-muted-foreground">
            Total: {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(totalAmount)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No expenses found for the selected date range.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};