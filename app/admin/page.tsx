import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Card, Table, type TableColumn } from "@/components/ui";
import { artistApprovalRequests } from "@/data/artist-approval-requests";
import { subscriptionPrices } from "@/data/subscription-prices";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import type { ArtistApprovalRequest, SubscriptionPrice } from "@/types/domain";

const approvalColumns: TableColumn<ArtistApprovalRequest>[] = [
  { key: "profile", header: "Artist profile", render: (row) => row.artistProfileId },
  { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "approved" ? "success" : "warning"}>{row.status}</Badge> },
  { key: "submitted", header: "Submitted", render: (row) => formatDate(row.submittedAt) }
];

const priceColumns: TableColumn<SubscriptionPrice>[] = [
  { key: "tier", header: "Tier", render: (row) => row.tier },
  { key: "monthly", header: "Monthly", render: (row) => formatCurrencyFromCents(row.monthlyPriceCents, row.currency) },
  { key: "playlists", header: "Playlist limit", render: (row) => row.playlistLimit }
];

export default function AdminPage() {
  return (
    <DashboardLayout eyebrow="Admin workspace">
      <PageHeader
        description="Admin dashboard skeleton for approvals, settings, subscription configuration, and platform health."
        title="Admin"
      />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Developer 3 can add real platform metrics and app settings forms here. */}
        <StatCard label="Pending approvals" value={String(artistApprovalRequests.filter((item) => item.status === "pending").length)} />
        <StatCard label="Subscription tiers" value={String(subscriptionPrices.length)} />
        <StatCard label="Maintenance mode" value="Off" />
      </section>
      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-50">Artist approvals</h2>
          <Table columns={approvalColumns} getRowKey={(row) => row.id} rows={artistApprovalRequests} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-50">Subscription prices</h2>
          <Table columns={priceColumns} getRowKey={(row) => row.tier} rows={subscriptionPrices} />
        </Card>
      </section>
    </DashboardLayout>
  );
}

