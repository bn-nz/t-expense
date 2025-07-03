import { useState } from 'react';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseTable } from './ExpenseTable';
import { PaidExpenseTable } from './PaidExpenseTable';
import { ExpenseBreakdownChart } from './ExpenseBreakdownChart';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export const ExpenseManager = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fromDate, setFromDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  const handleExpenseAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Expense Tracker</h2>
        <p className="text-xl text-muted-foreground">
          Track and manage your expenses
        </p>
      </div>
      
      <ExpenseForm onExpenseAdded={handleExpenseAdded} />
      
      {/* Date Range Picker */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <ExpenseTable refreshTrigger={refreshTrigger} fromDate={fromDate} toDate={toDate} />
      <PaidExpenseTable fromDate={fromDate} toDate={toDate} />
      <ExpenseBreakdownChart fromDate={fromDate} toDate={toDate} />
    </div>
  );
};