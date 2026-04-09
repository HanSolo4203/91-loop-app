'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Save } from 'lucide-react';
import { useExpenseSummary } from '@/lib/hooks/use-expenses';
import { useProfitLoss } from '@/lib/hooks/use-expenses';
import { formatCurrencySSR } from '@/lib/utils/formatters';

const STORAGE_KEY = 'business-plan-one-pager';

type StoredPlan = {
  businessName: string;
  date: string;
  whatWeDo: string;
  whatWeSell: string;
  whoWeSellTo: string;
  howWeMakeMoney: string;
  revenueTarget: string;
  whatMakesUsDifferent: string;
  priority1: string;
  priority2: string;
  priority3: string;
  ownerContact: string;
};

const defaultPlan: StoredPlan = {
  businessName: '',
  date: '',
  whatWeDo: '',
  whatWeSell: '',
  whoWeSellTo: '',
  howWeMakeMoney: '',
  revenueTarget: '',
  whatMakesUsDifferent: '',
  priority1: '',
  priority2: '',
  priority3: '',
  ownerContact: '',
};

function loadFromStorage(): StoredPlan {
  if (typeof window === 'undefined') return defaultPlan;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPlan;
    const parsed = JSON.parse(raw) as Partial<StoredPlan>;
    return { ...defaultPlan, ...parsed };
  } catch {
    return defaultPlan;
  }
}

function saveToStorage(plan: StoredPlan) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // ignore
  }
}

function BusinessPlanContent() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  const [plan, setPlan] = useState<StoredPlan>(defaultPlan);
  const [businessSettingsLoaded, setBusinessSettingsLoaded] = useState(false);

  const { data: summaryData } = useExpenseSummary(currentMonth, currentYear);
  const { data: pnlData } = useProfitLoss({ year: currentYear, month: currentMonth });

  const summary = summaryData?.success ? summaryData.data : null;
  const pnl = pnlData?.success && pnlData.data?.length ? pnlData.data[0] : null;

  const mainCosts = summary?.by_category ?? [];
  const totalCosts = summary?.total ?? 0;
  const revenueThisMonth = pnl?.revenue ?? 0;
  const paymentTermsHint =
    pnl != null
      ? `Revenue this month: ${formatCurrencySSR(pnl.revenue)} · Expenses: ${formatCurrencySSR(pnl.expenses)} · Net: ${formatCurrencySSR(pnl.net_profit)}`
      : '';

  useEffect(() => {
    setPlan((prev) => {
      const stored = loadFromStorage();
      return { ...stored, date: stored.date || todayStr };
    });
  }, [todayStr]);

  useEffect(() => {
    if (businessSettingsLoaded) return;
    let cancelled = false;
    fetch('/api/business-settings')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success || !json.data) return;
        const bs = json.data as { company_name?: string; phone?: string; email?: string };
        setPlan((prev) => ({
          ...prev,
          businessName: prev.businessName || bs.company_name || '',
          ownerContact: prev.ownerContact || [bs.phone, bs.email].filter(Boolean).join(' · ') || '',
        }));
        setBusinessSettingsLoaded(true);
      })
      .catch(() => setBusinessSettingsLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [businessSettingsLoaded]);

  const update = useCallback((field: keyof StoredPlan, value: string) => {
    setPlan((prev) => {
      const next = { ...prev, [field]: value };
      saveToStorage(next);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    saveToStorage(plan);
  }, [plan]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <FileText className="w-4 h-4" />
          <span>/</span>
          <span className="text-slate-900 font-medium">Business Plan</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            Business Plan — One Pager
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Fill in your plan. Main costs are pulled from Expenses for the current month.
          </p>
        </div>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your one pager</CardTitle>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  value={plan.businessName}
                  onChange={(e) => update('businessName', e.target.value)}
                  placeholder="From Settings"
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={plan.date}
                  onChange={(e) => update('date', e.target.value)}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatWeDo">What we do (1 sentence)</Label>
              <Input
                id="whatWeDo"
                value={plan.whatWeDo}
                onChange={(e) => update('whatWeDo', e.target.value)}
                placeholder="e.g. Commercial linen laundry for hotels and restaurants"
                className="bg-white border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatWeSell">What we sell / offer</Label>
              <Input
                id="whatWeSell"
                value={plan.whatWeSell}
                onChange={(e) => update('whatWeSell', e.target.value)}
                placeholder="e.g. Wash, iron, deliver; per batch or per kg"
                className="bg-white border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whoWeSellTo">Who we sell to (customers)</Label>
              <Input
                id="whoWeSellTo"
                value={plan.whoWeSellTo}
                onChange={(e) => update('whoWeSellTo', e.target.value)}
                placeholder="e.g. Hotels, guesthouses, restaurants in Cape Town CBD"
                className="bg-white border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="howWeMakeMoney">How we make money (pricing / model)</Label>
              <Input
                id="howWeMakeMoney"
                value={plan.howWeMakeMoney}
                onChange={(e) => update('howWeMakeMoney', e.target.value)}
                placeholder="e.g. Per batch invoicing; payment terms from Settings"
                className="bg-white border-slate-300"
              />
              {paymentTermsHint && (
                <p className="text-xs text-slate-500">{paymentTermsHint}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueTarget">Revenue target (monthly) — R</Label>
              <Input
                id="revenueTarget"
                type="number"
                min={0}
                step={100}
                value={plan.revenueTarget}
                onChange={(e) => update('revenueTarget', e.target.value)}
                placeholder="e.g. 50000"
                className="bg-white border-slate-300 max-w-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Main costs (monthly) — from Expenses</Label>
              <p className="text-xs text-slate-500">
                From your Expenses for {new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </p>
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount (R)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mainCosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-slate-500 text-sm">
                          No expense data for this month. Add expenses to see costs here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mainCosts.map((row) => (
                        <TableRow key={row.category_name}>
                          <TableCell className="font-medium">{row.category_name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrencySSR(row.total)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {mainCosts.length > 0 && (
                      <TableRow className="bg-slate-50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {formatCurrencySSR(totalCosts)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatMakesUsDifferent">What makes us different</Label>
              <Input
                id="whatMakesUsDifferent"
                value={plan.whatMakesUsDifferent}
                onChange={(e) => update('whatMakesUsDifferent', e.target.value)}
                placeholder="e.g. Reliable turnaround, clear pricing"
                className="bg-white border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label>Next 3 priorities</Label>
              <div className="space-y-2">
                <Input
                  value={plan.priority1}
                  onChange={(e) => update('priority1', e.target.value)}
                  placeholder="1."
                  className="bg-white border-slate-300"
                />
                <Input
                  value={plan.priority2}
                  onChange={(e) => update('priority2', e.target.value)}
                  placeholder="2."
                  className="bg-white border-slate-300"
                />
                <Input
                  value={plan.priority3}
                  onChange={(e) => update('priority3', e.target.value)}
                  placeholder="3."
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerContact">Owner / contact</Label>
              <Input
                id="ownerContact"
                value={plan.ownerContact}
                onChange={(e) => update('ownerContact', e.target.value)}
                placeholder="From Settings (phone, email)"
                className="bg-white border-slate-300"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BusinessPlanPage() {
  return (
    <AuthGuard>
      <BusinessPlanContent />
    </AuthGuard>
  );
}
