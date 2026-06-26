import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Table, type TableColumn } from "@/components/ui";
import { tickets } from "@/data/tickets";
import { formatDate } from "@/lib/formatters";
import type { Ticket } from "@/types/domain";

const ticketColumns: TableColumn<Ticket>[] = [
  { key: "subject", header: "Subject", render: (row) => row.subject },
  { key: "status", header: "Status", render: (row) => <Badge tone="info">{row.status}</Badge> },
  { key: "priority", header: "Priority", render: (row) => <Badge tone="warning">{row.priority}</Badge> },
  { key: "updated", header: "Updated", render: (row) => formatDate(row.updatedAt) }
];

export default function SupportPage() {
  return (
    <DashboardLayout eyebrow="Support workspace">
      <PageHeader
        description="Support dashboard skeleton for ticket queues, internal notes, and customer messages."
        title="Support"
      />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Developer 3 can add queue assignment, SLA timers, and ticket detail routes here. */}
        <StatCard label="Open tickets" value={String(tickets.filter((ticket) => ticket.status === "open").length)} />
        <StatCard label="Waiting for user" value={String(tickets.filter((ticket) => ticket.status === "waiting_for_user").length)} />
        <StatCard label="Urgent tickets" value={String(tickets.filter((ticket) => ticket.priority === "urgent").length)} />
      </section>
      <section className="mt-6">
        <Table columns={ticketColumns} getRowKey={(row) => row.id} rows={tickets} />
      </section>
    </DashboardLayout>
  );
}

