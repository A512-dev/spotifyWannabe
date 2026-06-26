import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string;
  helperText?: string;
}

export function StatCard({ helperText, label, value }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
      {helperText ? <p className="mt-1 text-xs text-slate-500">{helperText}</p> : null}
    </Card>
  );
}

