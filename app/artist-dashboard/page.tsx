import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Table, type TableColumn } from "@/components/ui/Table";
import { artistRevenueRecords } from "@/data/financial-records";
import { formatCurrencyFromCents, formatNumber } from "@/lib/formatters";
import type { ArtistRevenueRecord } from "@/types/domain";

const revenueColumns: TableColumn<ArtistRevenueRecord>[] = [
  { key: "period", header: "Period", render: (row) => `${row.periodStart.slice(0, 10)} to ${row.periodEnd.slice(0, 10)}` },
  { key: "streams", header: "Streams", render: (row) => formatNumber(row.streamCount) },
  { key: "net", header: "Net revenue", render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency) }
];

export default function ArtistDashboardPage() {
  const totalStreams = artistRevenueRecords.reduce((sum, record) => sum + record.streamCount, 0);

  return (
    <DashboardLayout eyebrow="Artist workspace">
      <PageHeader
        description="Artist dashboard skeleton for uploads, analytics, catalog management, and revenue reports."
        title="Artist Dashboard"
      />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Developer 3 can replace mock stats with artist-specific analytics later. */}
        <StatCard label="Total streams" value={formatNumber(totalStreams)} />
        <StatCard label="Pending uploads" value="0" />
        <StatCard label="Reports ready" value={String(artistRevenueRecords.length)} />
      </section>
      <section className="mt-6">
        <Table columns={revenueColumns} getRowKey={(row) => row.id} rows={artistRevenueRecords} />
      </section>
    </DashboardLayout>
  );
}

