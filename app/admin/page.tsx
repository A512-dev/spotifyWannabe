"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard, SubscriptionDistributionChart } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Select, Table, Tabs, type TableColumn } from "@/components/ui";
import {
  operationsApi,
  type AdminOverviewApi,
  type ApprovedArtistApi,
  type RevenueGenerationInput,
  type RevenueRecordApi,
  type SubscriptionPlanApi
} from "@/features/operations/api";
import { ApiError } from "@/lib/api";
import { formatCurrencyFromCents, formatDate, formatNumber } from "@/lib/formatters";
import { useAuth, useUserPreferences } from "@/providers";

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

function localDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRevenuePeriod() {
  const today = new Date();
  return {
    periodStart: localDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    periodEnd: localDateInput(today)
  };
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const { locale, t } = useUserPreferences();
  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [artists, setArtists] = useState<ApprovedArtistApi[]>([]);
  const [records, setRecords] = useState<RevenueRecordApi[]>([]);
  const [overview, setOverview] = useState<AdminOverviewApi | null>(null);
  const [silverPrice, setSilverPrice] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RevenueRecordApi | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState<RevenueGenerationInput>(() => ({
    artistId: "",
    ...defaultRevenuePeriod(),
    currency: "USD",
    perStreamCents: 2,
    perUniqueListenerCents: 5,
    platformFeePercent: 20
  }));

  const loadData = useCallback(async () => {
    if (currentUser?.role !== "admin") return;
    setLoading(true);
    setNotice("");
    try {
      const [planData, revenueData, overviewData, artistData] = await Promise.all([
        operationsApi.listSubscriptionPlans(),
        operationsApi.listRevenue(),
        operationsApi.adminOverview(),
        operationsApi.listApprovedArtists()
      ]);
      setPlans(planData);
      setRecords(revenueData.results);
      setOverview(overviewData);
      setArtists(artistData.results);
      setGeneration((current) => ({
        ...current,
        artistId: current.artistId || artistData.results[0]?.id || ""
      }));
      setSilverPrice(String(planData.find((plan) => plan.tier === "silver")?.monthlyPriceCents ?? ""));
      setGoldPrice(String(planData.find((plan) => plan.tier === "gold")?.monthlyPriceCents ?? ""));
    } catch (error) {
      setNotice(t(errorMessage(error)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updatePrices = async () => {
    const silver = Number(silverPrice);
    const gold = Number(goldPrice);
    if (!Number.isInteger(silver) || !Number.isInteger(gold) || silver <= 0 || gold <= 0 || silver > gold) {
      setNotice(t("Enter positive prices in cents and keep Gold at least as expensive as Silver."));
      return;
    }
    setBusy(true);
    try {
      await Promise.all([
        operationsApi.updateSubscriptionPrice("silver", silver),
        operationsApi.updateSubscriptionPrice("gold", gold)
      ]);
      setNotice(t("Subscription prices were updated for the whole system."));
      await loadData();
    } catch (error) {
      setNotice(t(errorMessage(error)));
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (!selectedRecord) return;
    setBusy(true);
    try {
      await operationsApi.settleRevenue(selectedRecord.id);
      setNotice(t("Artist payout marked as settled."));
      setSelectedRecord(null);
      await loadData();
    } catch (error) {
      setNotice(t(errorMessage(error)));
    } finally {
      setBusy(false);
    }
  };

  const generateRevenue = async () => {
    if (!generation.artistId || generation.periodEnd < generation.periodStart) {
      setNotice(t("Choose an artist and a valid accounting period."));
      return;
    }
    if (
      generation.perStreamCents < 0 ||
      generation.perUniqueListenerCents < 0 ||
      generation.platformFeePercent < 0 ||
      generation.platformFeePercent > 100
    ) {
      setNotice(t("Revenue rates must be non-negative and the platform fee must be between 0 and 100."));
      return;
    }
    setBusy(true);
    try {
      await operationsApi.generateRevenue(generation);
      setNotice(t("The monthly accounting record was generated from verified stream events."));
      await loadData();
    } catch (error) {
      setNotice(t(errorMessage(error)));
    } finally {
      setBusy(false);
    }
  };

  const planColumns = useMemo<TableColumn<SubscriptionPlanApi>[]>(() => [
    { key: "tier", header: t("Tier"), render: (row) => <span className="font-medium capitalize text-slate-50">{t(row.tier === "basic" ? "Basic" : row.tier === "silver" ? "Silver" : "Gold")}</span> },
    { key: "monthly", header: t("Monthly"), render: (row) => formatCurrencyFromCents(row.monthlyPriceCents, row.currency, locale) },
    { key: "three", header: t("3 months"), render: (row) => formatCurrencyFromCents(row.periodPrices["3"] ?? row.monthlyPriceCents * 3, row.currency, locale) },
    { key: "six", header: t("6 months"), render: (row) => formatCurrencyFromCents(row.periodPrices["6"] ?? row.monthlyPriceCents * 6, row.currency, locale) },
    { key: "twelve", header: t("12 months"), render: (row) => formatCurrencyFromCents(row.periodPrices["12"] ?? row.monthlyPriceCents * 12, row.currency, locale) },
    { key: "playlists", header: t("Playlist limit"), render: (row) => row.playlistLimit === null ? t("Unlimited") : formatNumber(row.playlistLimit, locale) }
  ], [locale, t]);

  const revenueColumns = useMemo<TableColumn<RevenueRecordApi>[]>(() => [
    { key: "artist", header: t("Artist"), render: (row) => <div><p className="font-medium text-slate-50">{row.artistName}</p><p className="text-xs text-slate-400">{row.artistId}</p></div> },
    { key: "period", header: t("Period"), render: (row) => `${formatDate(row.periodStart, locale)} - ${formatDate(row.periodEnd, locale)}` },
    { key: "listeners", header: t("Listeners"), render: (row) => formatNumber(row.uniqueListeners, locale) },
    { key: "streams", header: t("Streams"), render: (row) => formatNumber(row.streamCount, locale) },
    { key: "payout", header: t("Payout"), render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency, locale) },
    { key: "status", header: t("Status"), render: (row) => <Badge tone={row.paymentStatus === "settled" ? "success" : "warning"}>{t(row.paymentStatus)}</Badge> },
    { key: "action", header: t("Action"), render: (row) => <Button disabled={row.paymentStatus === "settled"} onClick={() => setSelectedRecord(row)} size="sm" variant="secondary">{t("Mark settled")}</Button> }
  ], [locale, t]);

  if (currentUser && currentUser.role !== "admin") {
    return (
      <DashboardLayout eyebrow={t("Administration")}>
        <PageHeader description={t("Only the system administrator can access this dashboard.")} title={t("Access denied")} />
      </DashboardLayout>
    );
  }

  const pricingPanel = (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Dynamic subscription prices")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("Prices are stored in the backend. Enter integer values in the smallest currency unit.")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label={t("Silver monthly price (cents)")} min={1} onChange={(event) => setSilverPrice(event.target.value)} type="number" value={silverPrice} />
          <Input label={t("Gold monthly price (cents)")} min={1} onChange={(event) => setGoldPrice(event.target.value)} type="number" value={goldPrice} />
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void updatePrices()}>{t("Update prices")}</Button>
      </Card>
      <Table columns={planColumns} emptyMessage={t(loading ? "Loading plans..." : "No plans found.")} getRowKey={(row) => row.tier} rows={plans} />
    </div>
  );

  const accountingPanel = (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Generate monthly artist accounting")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("Counts and unique listeners are aggregated from server-verified StreamEvent records.")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label={t("Artist")}
            onChange={(event) => setGeneration((value) => ({ ...value, artistId: event.target.value }))}
            options={artists.length ? artists.map((artist) => ({ value: artist.id, label: artist.stageName })) : [{ value: "", label: t("No approved artists") }]}
            value={generation.artistId}
          />
          <Input label={t("Period start")} onChange={(event) => setGeneration((value) => ({ ...value, periodStart: event.target.value }))} type="date" value={generation.periodStart} />
          <Input label={t("Period end")} onChange={(event) => setGeneration((value) => ({ ...value, periodEnd: event.target.value }))} type="date" value={generation.periodEnd} />
          <Select
            label={t("Currency")}
            onChange={(event) => setGeneration((value) => ({ ...value, currency: event.target.value as RevenueGenerationInput["currency"] }))}
            options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "IRR", label: "IRR" }]}
            value={generation.currency}
          />
          <Input label={t("Cents per stream")} min={0} onChange={(event) => setGeneration((value) => ({ ...value, perStreamCents: Number(event.target.value) }))} type="number" value={generation.perStreamCents} />
          <Input label={t("Cents per unique listener")} min={0} onChange={(event) => setGeneration((value) => ({ ...value, perUniqueListenerCents: Number(event.target.value) }))} type="number" value={generation.perUniqueListenerCents} />
          <Input label={t("Platform fee (%)")} max={100} min={0} onChange={(event) => setGeneration((value) => ({ ...value, platformFeePercent: Number(event.target.value) }))} type="number" value={generation.platformFeePercent} />
        </div>
        <Button className="mt-4" disabled={busy || !generation.artistId} onClick={() => void generateRevenue()}>{t("Generate record")}</Button>
      </Card>
      <Table columns={revenueColumns} emptyMessage={t(loading ? "Loading accounting records..." : "No accounting records found.")} getRowKey={(row) => row.id} rows={records} />
    </div>
  );

  const reportsPanel = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Approved artists")} value={formatNumber(overview?.artists.approved ?? 0, locale)} />
        <StatCard label={t("Pending artist applications")} value={formatNumber(overview?.artists.pendingApplications ?? 0, locale)} />
        <StatCard label={t("Streams in period")} value={formatNumber(overview?.accounting.streams ?? 0, locale)} />
        <StatCard label={t("Unique listeners")} value={formatNumber(overview?.accounting.uniqueListeners ?? 0, locale)} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Subscription distribution")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("Current active user accounts grouped by their effective subscription tier.")}</p>
        <div className="mt-5">
          <SubscriptionDistributionChart distribution={overview?.subscriptions.distribution ?? { basic: 0, silver: 0, gold: 0, total: 0 }} />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Subscription sales in period")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("Only successfully verified payment transactions are included.")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(overview?.subscriptions.sales.currencyBreakdown ?? []).map((row) => (
            <div className="rounded-md border border-surface-600 p-4" key={row.currency}>
              <p className="text-sm font-medium text-slate-100">{row.currency}</p>
              <p className="mt-2 text-xl font-semibold text-slate-50">{formatCurrencyFromCents(row.revenueCents, row.currency, locale)}</p>
              <p className="text-sm text-slate-400">{t("{count} successful sale(s)", { count: formatNumber(row.transactionCount, locale) })}</p>
            </div>
          ))}
          {overview && overview.subscriptions.sales.currencyBreakdown.length === 0 ? <p className="text-sm text-slate-400">{t("No successful subscription sales in this period.")}</p> : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Artist accounting by currency")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(overview?.accounting.currencyBreakdown ?? []).map((row) => (
            <div className="rounded-md border border-surface-600 p-4" key={row.currency}>
              <p className="text-sm font-medium text-slate-100">{row.currency}</p>
              <p className="mt-2 text-sm text-slate-400">{t("Gross: {amount}", { amount: formatCurrencyFromCents(row.grossRevenueCents, row.currency, locale) })}</p>
              <p className="text-sm text-slate-400">{t("Platform: {amount}", { amount: formatCurrencyFromCents(row.platformFeeCents, row.currency, locale) })}</p>
              <p className="text-sm text-slate-400">{t("Artist net: {amount}", { amount: formatCurrencyFromCents(row.artistPayoutCents, row.currency, locale) })}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">{t("Support workload")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("Open tickets")} value={formatNumber(overview?.support.tickets.open ?? 0, locale)} />
          <StatCard label={t("Waiting for user")} value={formatNumber(overview?.support.tickets.waiting_for_user ?? 0, locale)} />
          <StatCard label={t("Urgent open")} value={formatNumber(overview?.support.urgentOpenTickets ?? 0, locale)} />
          <StatCard label={t("Unassigned open")} value={formatNumber(overview?.support.unassignedOpenTickets ?? 0, locale)} />
        </div>
      </Card>
    </div>
  );

  return (
    <DashboardLayout eyebrow={t("Administration")}>
      <PageHeader actions={<Button disabled={loading} onClick={() => void loadData()} variant="secondary">{t("Refresh")}</Button>} description={t("Manage subscription pricing, artist payouts, and aggregated operational reports.")} title={t("Admin dashboard")} />
      {notice ? <p className="mt-4 rounded-md border border-surface-600 bg-surface-800 p-3 text-sm text-slate-200">{notice}</p> : null}
      <section className="mt-6">
        <Tabs tabs={[
          { id: "reports", label: t("Overview"), content: reportsPanel },
          { id: "accounting", label: t("Artist accounting"), content: accountingPanel },
          { id: "pricing", label: t("Subscription pricing"), content: pricingPanel }
        ]} />
      </section>
      <Modal onClose={() => setSelectedRecord(null)} open={Boolean(selectedRecord)} title={t("Confirm settlement")}>
        {selectedRecord ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{t("Mark {artist}'s payout of {amount} as settled?", { artist: selectedRecord.artistName, amount: formatCurrencyFromCents(selectedRecord.netRevenueCents, selectedRecord.currency, locale) })}</p>
            <div className="flex gap-2"><Button disabled={busy} onClick={() => void settle()}>{t("Confirm")}</Button><Button onClick={() => setSelectedRecord(null)} variant="ghost">{t("Cancel")}</Button></div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
