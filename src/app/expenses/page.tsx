'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navigation from '@/components/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MonthSelector from '@/components/dashboard/month-selector';
import MetricCard from '@/components/dashboard/metric-card';
import ExpenseForm from '@/components/expenses/expense-form';
import {
  Receipt,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import {
  useExpenses,
  useExpenseCategories,
  useExpenseSummary,
  useProfitLoss,
  useRecurringExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/lib/hooks/use-expenses';
import type { ExpenseWithCategory } from '@/types/database';
import type { CreateExpenseRequest } from '@/lib/services/expenses';

const ProfitLossChart = dynamic(
  () => import('@/components/expenses/profit-loss-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-slate-500">
        Loading chart...
      </div>
    ),
  }
);

const ExpenseIncomeChart = dynamic(
  () => import('@/components/expenses/expense-income-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-slate-500">
        Loading chart...
      </div>
    ),
  }
);

type PeriodType = 'monthly' | 'quarterly' | 'half-yearly' | 'annually';

export default function ExpensesPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<{
    month: number | null;
    year: number;
  }>({
    month: now.getMonth(),
    year: now.getFullYear(),
  });
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(
    () => Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4
  );
  const [selectedHalf, setSelectedHalf] = useState<1 | 2>(() =>
    now.getMonth() < 6 ? 1 : 2
  );
  const [pnlMonths, setPnlMonths] = useState(6);
  const [pnlViewMode, setPnlViewMode] = useState<'rolling' | 'monthly'>('rolling');
  const [pnlMonth, setPnlMonth] = useState(now.getMonth() + 1);
  const [pnlYear, setPnlYear] = useState(now.getFullYear());
  const [pnlYearFilter, setPnlYearFilter] = useState<number | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [activeTab, setActiveTab] = useState('monthly');

  const apiYear = selectedMonth.year;
  const apiMonth = selectedMonth.month !== null ? selectedMonth.month + 1 : undefined;

  const expenseParams =
    periodType === 'monthly'
      ? apiMonth
        ? { month: apiMonth, year: apiYear }
        : { year: apiYear }
      : periodType === 'quarterly'
        ? {
            year: apiYear,
            month_from: (selectedQuarter - 1) * 3 + 1,
            month_to: selectedQuarter * 3,
          }
        : periodType === 'half-yearly'
          ? {
              year: apiYear,
              month_from: selectedHalf === 1 ? 1 : 7,
              month_to: selectedHalf === 1 ? 6 : 12,
            }
          : { year: apiYear, month_from: 1, month_to: 12 };

  const { data: expensesData } = useExpenses(expenseParams);
  const { data: categoriesData } = useExpenseCategories();
  const useSummary = periodType === 'monthly' && apiMonth != null;
  const { data: summaryData } = useExpenseSummary(
    useSummary ? apiMonth : now.getMonth() + 1,
    apiYear
  );
  const profitLossParams =
    pnlViewMode === 'monthly'
      ? { year: pnlYear, month: pnlMonth }
      : pnlMonths;
  const { data: profitLossData } = useProfitLoss(profitLossParams);
  const { data: monthlyChartData } = useProfitLoss(12);
  const { data: recurringData } = useRecurringExpenses();
  const { data: currentMonthExpensesData } = useExpenses({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = expensesData?.success ? expensesData.data ?? [] : [];
  const categories = categoriesData?.success ? categoriesData.data ?? [] : [];
  const summary = summaryData?.success ? summaryData.data : null;
  const profitLoss = profitLossData?.success ? profitLossData.data ?? [] : [];
  const monthlyIncomeExpenseData =
    monthlyChartData?.success ? monthlyChartData.data ?? [] : [];
  const recurringExpenses = recurringData?.success ? recurringData.data ?? [] : [];

  const handleMonthChange = (month: number | null, year: number) => {
    setSelectedMonth({ month, year });
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEditExpense = (expense: ExpenseWithCategory) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleSaveExpense = async (payload: CreateExpenseRequest) => {
    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense.id, payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    setFormOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      await deleteExpense.mutateAsync(id);
    }
  };

  const handleToggleRecurring = async (expense: ExpenseWithCategory) => {
    await updateExpense.mutateAsync({
      id: expense.id,
      payload: { is_recurring: !expense.is_recurring },
    });
  };

  const currentMonthExpenses =
    currentMonthExpensesData?.success
      ? currentMonthExpensesData.data ?? []
      : [];

  const handleCopyToThisMonth = async (expense: ExpenseWithCategory) => {
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const exists = currentMonthExpenses.some(
      (e) =>
        e.category_id === expense.category_id &&
        e.name === expense.name &&
        e.period_month === thisMonth &&
        e.period_year === thisYear
    );
    if (exists) {
      window.alert('This expense already exists for the current month.');
      return;
    }
    await createExpense.mutateAsync({
      category_id: expense.category_id,
      name: expense.name,
      amount: Number(expense.amount),
      expense_date: `${thisYear}-${String(thisMonth).padStart(2, '0')}-01`,
      period_month: thisMonth,
      period_year: thisYear,
      is_recurring: expense.is_recurring,
      notes: expense.notes ?? undefined,
      receipt_url: expense.receipt_url ?? undefined,
    });
    window.alert('Copied to this month.');
  };

  const isMonthlyPeriod = periodType === 'monthly' && useSummary;
  const totalMonth = isMonthlyPeriod
    ? (summary?.total ?? 0)
    : expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = isMonthlyPeriod
    ? (summary?.by_category ?? [])
    : (() => {
        const map = new Map<
          string,
          { category_name: string; total: number; is_fixed?: boolean }
        >();
        for (const e of expenses) {
          const name = e.category?.name ?? 'Uncategorised';
          const key = e.category_id ?? 'uncategorised';
          const cur = map.get(key) ?? {
            category_name: name,
            total: 0,
            is_fixed: e.category?.is_fixed ?? false,
          };
          cur.total += Number(e.amount);
          map.set(key, cur);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
      })();
  const largestCategory = byCategory[0];
  const fixedTotal = byCategory
    .filter((c) => c.is_fixed)
    .reduce((s, c) => s + c.total, 0);
  const variableTotal = totalMonth - fixedTotal;

  const periodLabel =
    periodType === 'monthly' && apiMonth
      ? new Date(apiYear, apiMonth - 1).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })
      : periodType === 'quarterly'
        ? `Q${selectedQuarter} ${apiYear}`
        : periodType === 'half-yearly'
          ? `H${selectedHalf} ${apiYear} (${selectedHalf === 1 ? 'Jan–Jun' : 'Jul–Dec'})`
          : `${apiYear}`;

  const filteredProfitLoss =
    pnlViewMode === 'monthly'
      ? profitLoss
      : pnlYearFilter === 'all'
        ? profitLoss
        : profitLoss.filter((p) => p.period.includes(String(pnlYearFilter)));

  const totalRevenue = filteredProfitLoss.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = filteredProfitLoss.reduce((s, p) => s + p.expenses, 0);
  const totalNetProfit = filteredProfitLoss.reduce((s, p) => s + p.net_profit, 0);
  const avgMargin =
    filteredProfitLoss.length > 0
      ? filteredProfitLoss.reduce((s, p) => s + p.margin_percentage, 0) /
        filteredProfitLoss.length
      : 0;

  const availableYears = Array.from(
    new Set(
      profitLoss
        .map((p) => {
          const parts = p.period.split(' ');
          const y = parts.length >= 2 ? parseInt(parts[parts.length - 1], 10) : null;
          return !isNaN(y as number) ? y : null;
        })
        .filter((y): y is number => y !== null && !isNaN(y))
    )
  ).sort((a, b) => b - a);

  const recurringFixedTotal = recurringExpenses
    .filter((e) => e.category?.is_fixed)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <Receipt className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            <span>Expenses</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Track monthly operating costs and profitability against revenue.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="monthly">Monthly Expenses</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6 mt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                View by:
              </span>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as PeriodType)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half-yearly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
              {periodType === 'monthly' && (
                <MonthSelector
                  value={selectedMonth}
                  onChange={handleMonthChange}
                />
              )}
              {periodType === 'quarterly' && (
                <>
                  <Select
                    value={String(selectedMonth.year)}
                    onValueChange={(v) =>
                      setSelectedMonth((prev) => ({ ...prev, year: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((i) => {
                        const y = now.getFullYear() - i;
                        return (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(selectedQuarter)}
                    onValueChange={(v) =>
                      setSelectedQuarter(parseInt(v, 10) as 1 | 2 | 3 | 4)
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {periodType === 'half-yearly' && (
                <>
                  <Select
                    value={String(selectedMonth.year)}
                    onValueChange={(v) =>
                      setSelectedMonth((prev) => ({ ...prev, year: parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((i) => {
                        const y = now.getFullYear() - i;
                        return (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(selectedHalf)}
                    onValueChange={(v) =>
                      setSelectedHalf(parseInt(v, 10) as 1 | 2)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Half" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">H1 (Jan–Jun)</SelectItem>
                      <SelectItem value="2">H2 (Jul–Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {periodType === 'annually' && (
                <Select
                  value={String(selectedMonth.year)}
                  onValueChange={(v) =>
                    setSelectedMonth((prev) => ({ ...prev, year: parseInt(v, 10) }))
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const y = now.getFullYear() - i;
                      return (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              <span className="text-sm text-slate-600">— {periodLabel}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title={periodType === 'monthly' ? 'Total Expenses' : `Total (${periodLabel})`}
                value={formatCurrencySSR(totalMonth)}
                icon={DollarSign}
                variant="default"
              />
              <MetricCard
                title="Largest Category"
                value={largestCategory?.category_name ?? '—'}
                icon={PieChart}
                variant="default"
              />
              <MetricCard
                title="Fixed Costs"
                value={formatCurrencySSR(fixedTotal)}
                icon={Receipt}
                variant="default"
              />
              <MetricCard
                title="Variable Costs"
                value={formatCurrencySSR(variableTotal)}
                icon={TrendingUp}
                variant="default"
              />
              <MetricCard
                title="Entries"
                value={expenses.length}
                icon={Receipt}
                variant="default"
              />
            </div>

            <ExpenseIncomeChart data={monthlyIncomeExpenseData} />

            {byCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {byCategory.map((cat) => {
                      const pct = totalMonth > 0 ? (cat.total / totalMonth) * 100 : 0;
                      return (
                        <div key={cat.category_name} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">
                              {cat.category_name}
                            </span>
                            <span className="text-slate-600">
                              {formatCurrencySSR(cat.total)} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expenses</CardTitle>
                <Button onClick={handleAddExpense} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </Button>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No expenses for this period.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Recurring</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>
                            {new Date(exp.expense_date).toLocaleDateString('en-ZA')}
                          </TableCell>
                          <TableCell>{exp.category?.name ?? '—'}</TableCell>
                          <TableCell>{exp.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrencySSR(Number(exp.amount))}
                          </TableCell>
                          <TableCell>
                            {exp.is_recurring ? 'Yes' : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditExpense(exp)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-6 mt-6">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-slate-700">
                  Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    View:
                  </span>
                  <Button
                    variant={pnlViewMode === 'rolling' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPnlViewMode('rolling')}
                  >
                    Last N months
                  </Button>
                  <Button
                    variant={pnlViewMode === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPnlViewMode('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
                {pnlViewMode === 'rolling' && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">
                        Period:
                      </span>
                      {[3, 6, 12].map((n) => (
                        <Button
                          key={n}
                          variant={pnlMonths === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPnlMonths(n)}
                        >
                          Last {n} months
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">
                        Year:
                      </span>
                      <Select
                        value={pnlYearFilter === 'all' ? 'all' : String(pnlYearFilter)}
                        onValueChange={(v) =>
                          setPnlYearFilter(v === 'all' ? 'all' : parseInt(v, 10))
                        }
                      >
                        <SelectTrigger className="w-[120px] bg-white">
                          <SelectValue placeholder="All years" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All years</SelectItem>
                          {availableYears.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {pnlViewMode === 'monthly' && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">
                        Month:
                      </span>
                      <Select
                        value={String(pnlMonth)}
                        onValueChange={(v) => setPnlMonth(parseInt(v, 10))}
                      >
                        <SelectTrigger className="w-[130px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {new Date(2000, m - 1, 1).toLocaleString('default', {
                                month: 'long',
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">
                        Year:
                      </span>
                      <Select
                        value={String(pnlYear)}
                        onValueChange={(v) => setPnlYear(parseInt(v, 10))}
                      >
                        <SelectTrigger className="w-[100px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4].map((i) => {
                            const y = now.getFullYear() - i;
                            return (
                              <SelectItem key={y} value={String(y)}>
                                {y}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Income vs Expenses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Income (Revenue)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrencySSR(totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrencySSR(totalExpenses)}
                    </p>
                  </CardContent>
                </Card>
              <Card
                className={
                  totalNetProfit >= 0
                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50'
                    : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50'
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-bold ${
                      totalNetProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {formatCurrencySSR(totalNetProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Avg Margin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">
                    {avgMargin.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
            </div>

            {profitLoss.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No income or expense data for the selected period.
              </p>
            ) : filteredProfitLoss.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No months match the selected year filter. Try &quot;All years&quot;.
              </p>
            ) : (
              <>
                <ProfitLossChart data={filteredProfitLoss} />
                <Card>
                  <CardHeader>
                    <CardTitle>Income vs Expenses by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Income</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                          <TableHead className="text-right">Gross Profit</TableHead>
                          <TableHead className="text-right">Net Profit</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfitLoss.map((p) => (
                          <TableRow
                            key={p.period}
                            className={
                              p.net_profit >= 0
                                ? 'bg-green-50/50'
                                : 'bg-red-50/50'
                            }
                          >
                            <TableCell className="font-medium">{p.period}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrencySSR(p.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrencySSR(p.expenses)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrencySSR(p.gross_profit)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                p.net_profit >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {formatCurrencySSR(p.net_profit)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${
                                p.margin_percentage >= 0
                                  ? 'text-green-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {p.margin_percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Recurring Expenses
              </h3>
              <Button onClick={handleAddExpense} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>

            {recurringExpenses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  No recurring expenses.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Monthly Amount</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringExpenses.map((exp) => {
                        const date = new Date(exp.expense_date);
                        const nextMonth = new Date(date);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        return (
                          <TableRow key={exp.id}>
                            <TableCell>{exp.category?.name ?? '—'}</TableCell>
                            <TableCell>{exp.name}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrencySSR(Number(exp.amount))}
                            </TableCell>
                            <TableCell>
                              {nextMonth.toLocaleDateString('en-ZA')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={exp.is_recurring}
                                    onChange={() => handleToggleRecurring(exp)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Active</span>
                                </label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyToThisMonth(exp)}
                                >
                                  Copy to This Month
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(exp)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700">
                      Total Fixed Monthly Overhead:{' '}
                      <span className="font-bold">
                        {formatCurrencySSR(recurringFixedTotal)}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <ExpenseForm
          open={formOpen}
          onOpenChange={setFormOpen}
          categories={categories}
          expense={editingExpense}
          defaultMonth={apiMonth}
          defaultYear={apiYear}
          onSave={handleSaveExpense}
        />
      </div>
    </div>
  );
}
