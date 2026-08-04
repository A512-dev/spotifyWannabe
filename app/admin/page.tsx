"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Table, Tabs, type TableColumn } from "@/components/ui";
import {
  operationsApi,
  type AdminOverviewApi,
  type RevenueRecordApi,
  type SubscriptionPlanApi
} from "@/features/operations/api";
import { ApiError } from "@/lib/api";
import { formatCurrencyFromCents, formatDate, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [records, setRecords] = useState<RevenueRecordApi[]>([]);
  const [overview, setOverview] = useState<AdminOverviewApi | null>(null);
  const [silverPrice, setSilverPrice] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RevenueRecordApi | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (currentUser?.role !== "admin") return;
    setLoading(true);
    setNotice("");
    try {
      const [planData, revenueData, overviewData] = await Promise.all([
        operationsApi.listSubscriptionPlans(),
        operationsApi.listRevenue(),
        operationsApi.adminOverview()
      ]);
      setPlans(planData);
      setRecords(revenueData.results);
      setOverview(overviewData);
      setSilverPrice(String(planData.find((plan) => plan.tier === "silver")?.monthlyPriceCents ?? ""));
      setGoldPrice(String(planData.find((plan) => plan.tier === "gold")?.monthlyPriceCents ?? ""));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updatePrices = async () => {
    const silver = Number(silverPrice);
    const gold = Number(goldPrice);
    if (!Number.isInteger(silver) || !Number.isInteger(gold) || silver <= 0 || gold <= 0 || silver > gold) {
      setNotice("Enter positive prices in cents and keep Gold at least as expensive as Silver.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all([
        operationsApi.updateSubscriptionPrice("silver", silver),
        operationsApi.updateSubscriptionPrice("gold", gold)
      ]);
      setNotice("Subscription prices were updated for the whole system.");
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (!selectedRecord) return;
    setBusy(true);
    try {
      await operationsApi.settleRevenue(selectedRecord.id);
      setNotice("Artist payout marked as settled.");
      setSelectedRecord(null);
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const planColumns = useMemo<TableColumn<SubscriptionPlanApi>[]>(() => [
    { key: "tier", header: "Tier", render: (row) => <span className="font-medium capitalize text-slate-50">{row.tier}</span> },
    { key: "monthly", header: "Monthly", render: (row) => formatCurrencyFromCents(row.monthlyPriceCents, row.currency) },
    { key: "three", header: "3 months", render: (row) => formatCurrencyFromCents(row.periodPrices["3"] ?? row.monthlyPriceCents * 3, row.currency) },
    { key: "six", header: "6 months", render: (row) => formatCurrencyFromCents(row.periodPrices["6"] ?? row.monthlyPriceCents * 6, row.currency) },
    { key: "twelve", header: "12 months", render: (row) => formatCurrencyFromCents(row.periodPrices["12"] ?? row.monthlyPriceCents * 12, row.currency) },
    { key: "playlists", header: "Playlist limit", render: (row) => row.playlistLimit === null ? "Unlimited" : formatNumber(row.playlistLimit) }
  ], []);

  const revenueColumns = useMemo<TableColumn<RevenueRecordApi>[]>(() => [
    { key: "artist", header: "Artist", render: (row) => <div><p className="font-medium text-slate-50">{row.artistName}</p><p className="text-xs text-slate-400">{row.artistId}</p></div> },
    { key: "period", header: "Period", render: (row) => `${formatDate(row.periodStart)} - ${formatDate(row.periodEnd)}` },
    { key: "listeners", header: "Listeners", render: (row) => formatNumber(row.uniqueListeners) },
    { key: "streams", header: "Streams", render: (row) => formatNumber(row.streamCount) },
    { key: "payout", header: "Payout", render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency) },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.paymentStatus === "settled" ? "success" : "warning"}>{row.paymentStatus}</Badge> },
    { key: "action", header: "Action", render: (row) => <Button disabled={row.paymentStatus === "settled"} onClick={() => setSelectedRecord(row)} size="sm" variant="secondary">Mark settled</Button> }
  ], []);

  if (currentUser && currentUser.role !== "admin") {
    return (
      <DashboardLayout eyebrow="Administration">
        <PageHeader description="Only the system administrator can access this dashboard." title="Access denied" />
      </DashboardLayout>
    );
  }

  const pricingPanel = (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Dynamic subscription prices</h2>
        <p className="mt-2 text-sm text-slate-400">Prices are stored in the backend. Enter integer values in the smallest currency unit.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="Silver monthly price (cents)" min={1} onChange={(event) => setSilverPrice(event.target.value)} type="number" value={silverPrice} />
          <Input label="Gold monthly price (cents)" min={1} onChange={(event) => setGoldPrice(event.target.value)} type="number" value={goldPrice} />
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void updatePrices()}>Update prices</Button>
      </Card>
      <Table columns={planColumns} emptyMessage={loading ? "Loading plans..." : "No plans found."} getRowKey={(row) => row.tier} rows={plans} />
    </div>
  );

  const accountingPanel = (
    <Table columns={revenueColumns} emptyMessage={loading ? "Loading accounting records..." : "No accounting records found."} getRowKey={(row) => row.id} rows={records} />
  );

  const reportsPanel = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved artists" value={formatNumber(overview?.artists.approved ?? 0)} />
        <StatCard label="Pending artist applications" value={formatNumber(overview?.artists.pendingApplications ?? 0)} />
        <StatCard label="Streams in period" value={formatNumber(overview?.accounting.streams ?? 0)} />
        <StatCard label="Unique listeners" value={formatNumber(overview?.accounting.uniqueListeners ?? 0)} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Revenue by currency</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(overview?.accounting.currencyBreakdown ?? []).map((row) => (
            <div className="rounded-md border border-surface-600 p-4" key={row.currency}>
              <p className="text-sm font-medium text-slate-100">{row.currency}</p>
              <p className="mt-2 text-sm text-slate-400">Gross: {formatCurrencyFromCents(row.grossRevenueCents, row.currency)}</p>
              <p className="text-sm text-slate-400">Platform: {formatCurrencyFromCents(row.platformFeeCents, row.currency)}</p>
              <p className="text-sm text-slate-400">Artist net: {formatCurrencyFromCents(row.artistPayoutCents, row.currency)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Support workload</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open tickets" value={String(overview?.support.tickets.open ?? 0)} />
          <StatCard label="Waiting for user" value={String(overview?.support.tickets.waiting_for_user ?? 0)} />
          <StatCard label="Urgent open" value={String(overview?.support.urgentOpenTickets ?? 0)} />
          <StatCard label="Unassigned open" value={String(overview?.support.unassignedOpenTickets ?? 0)} />
        </div>
      </Card>
    </div>
  );

  return (
    <DashboardLayout eyebrow="Administration">
      <PageHeader actions={<Button disabled={loading} onClick={() => void loadData()} variant="secondary">Refresh</Button>} description="Manage subscription pricing, artist payouts, and aggregated operational reports." title="Admin dashboard" />
      {notice ? <p className="mt-4 rounded-md border border-surface-600 bg-surface-800 p-3 text-sm text-slate-200">{notice}</p> : null}
      <section className="mt-6">
        <Tabs tabs={[
          { id: "reports", label: "Overview", content: reportsPanel },
          { id: "accounting", label: "Artist accounting", content: accountingPanel },
          { id: "pricing", label: "Subscription pricing", content: pricingPanel }
        ]} />
      </section>
      <Modal onClose={() => setSelectedRecord(null)} open={Boolean(selectedRecord)} title="Confirm settlement">
        {selectedRecord ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Mark {selectedRecord.artistName}&apos;s payout of {formatCurrencyFromCents(selectedRecord.netRevenueCents, selectedRecord.currency)} as settled?</p>
            <div className="flex gap-2"><Button disabled={busy} onClick={() => void settle()}>Confirm</Button><Button onClick={() => setSelectedRecord(null)} variant="ghost">Cancel</Button></div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
