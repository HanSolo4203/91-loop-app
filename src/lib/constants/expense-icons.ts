import {
  Building2,
  Zap,
  Droplets,
  Users,
  Wrench,
  Package,
  ShieldCheck,
  Fuel,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

const expenseIconMap: Record<string, LucideIcon> = {
  Building2,
  Zap,
  Droplets,
  Users,
  Wrench,
  Package,
  ShieldCheck,
  Fuel,
  CircleDollarSign,
};

export function getExpenseIcon(iconName: string | null): LucideIcon {
  if (!iconName) return CircleDollarSign;
  return expenseIconMap[iconName] ?? CircleDollarSign;
}
