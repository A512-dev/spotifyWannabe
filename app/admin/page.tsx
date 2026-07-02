"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Table, Tabs, type TableColumn } from "@/components/ui";
import { artistApprovalRequests } from "@/data/artist-approval-requests";
import { artists } from "@/data/artists";
import { artistRevenueRecords } from "@/data/financial-records";
import { subscriptionPrices as initialSubscriptionPrices } from "@/data/subscription-prices";
import { users } from "@/data/users";
import { formatCurrencyFromCents, formatDate, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { ArtistRevenueRecord, SubscriptionPrice, SubscriptionTier } from "@/types/domain";

type PaymentStatus = "pending" | "settled";

interface SettlementState {
  status: PaymentStatus;
  settledAt?: string;
  settledByUserId?: string;
}

interface SubscriptionDistributionRow {
  tier: SubscriptionTier;
  userCount: number;
  percentage: number;
}

interface AccountingRow extends ArtistRevenueRecord {
  artistName: string;
  uniqueListeners: number;
  paymentStatus: PaymentStatus;
  settledAt?: string;
}

const tierLabels: Record<SubscriptionTier, string> = {
  basic: "Basic",
  silver: "Silver",
  gold: "Gold"
};

const billingPeriods = [1, 3, 6, 12];

function calculateSubscriptionDistribution(): SubscriptionDistributionRow[] {
  const totalUsers = users.length || 1;

  return (["basic", "silver", "gold"] as SubscriptionTier[]).map((tier) => {
    const userCount = users.filter((user) => user.subscriptionTier === tier).length;

    return {
      tier,
      userCount,
      percentage: Math.round((userCount / totalUsers) * 100)
    };
  });
}

function getArtistName(artistId: string) {
  return artists.find((artist) => artist.id === artistId)?.stageName ?? "Unknown artist";
}

function getArtistMonthlyListeners(artistId: string) {
  return artists.find((artist) => artist.id === artistId)?.monthlyListeners ?? 0;
}

function parseDollarInput(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

function formatDollarsFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [subscriptionPrices, setSubscriptionPrices] = useState<SubscriptionPrice[]>(initialSubscriptionPrices);
  const [silverMonthlyInput, setSilverMonthlyInput] = useState(() =>
    formatDollarsFromCents(initialSubscriptionPrices.find((price) => price.tier === "silver")?.monthlyPriceCents ?? 0)
  );
  const [goldMonthlyInput, setGoldMonthlyInput] = useState(() =>
    formatDollarsFromCents(initialSubscriptionPrices.find((price) => price.tier === "gold")?.monthlyPriceCents ?? 0)
  );
  const [pricingMessage, setPricingMessage] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settlements, setSettlements] = useState<Record<string, SettlementState>>({});
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);

  const subscriptionDistribution = useMemo(() => calculateSubscriptionDistribution(), []);
  const pendingApprovalsCount = artistApprovalRequests.filter((item) => item.status === "pending").length;
  const supportUsersCount = users.filter((user) => user.role === "support").length;
  const artistUsersCount = users.filter((user) => user.role === "artist").length;
  const listenerUsersCount = users.filter((user) => user.role === "listener").length;

  const monthlySubscriptionRevenueCents = users.reduce((sum, user) => {
    const price = subscriptionPrices.find((item) => item.tier === user.subscriptionTier);

    return sum + (price?.monthlyPriceCents ?? 0);
  }, 0);

  const totalArtistPayoutCents = artistRevenueRecords.reduce((sum, record) => sum + record.netRevenueCents, 0);

  const estimatedPlatformNetCents =
    artistRevenueRecords.reduce((sum, record) => sum + record.platformFeeCents, 0) + monthlySubscriptionRevenueCents;

  const accountingRows = useMemo<AccountingRow[]>(
    () =>
      artistRevenueRecords.map((record) => ({
        ...record,
        artistName: getArtistName(record.artistId),
        uniqueListeners: getArtistMonthlyListeners(record.artistId),
        paymentStatus: settlements[record.id]?.status ?? "pending",
        settledAt: settlements[record.id]?.settledAt
      })),
    [settlements]
  );

  const selectedSettlementRow = useMemo(
    () => accountingRows.find((row) => row.id === selectedSettlementId) ?? null,
    [accountingRows, selectedSettlementId]
  );

  const pieGradient = useMemo(() => {
    const basic = subscriptionDistribution.find((row) => row.tier === "basic")?.percentage ?? 0;
    const silver = subscriptionDistribution.find((row) => row.tier === "silver")?.percentage ?? 0;
    const basicEnd = basic;
    const silverEnd = basic + silver;

    return `conic-gradient(#64748b 0% ${basicEnd}%, #94a3b8 ${basicEnd}% ${silverEnd}%, #22c55e ${silverEnd}% 100%)`;
  }, [subscriptionDistribution]);

  const updateSubscriptionPrices = () => {
    const silverMonthlyCents = parseDollarInput(silverMonthlyInput);
    const goldMonthlyCents = parseDollarInput(goldMonthlyInput);

    if (silverMonthlyCents === null || goldMonthlyCents === null) {
      setPricingMessage("Please enter valid non-negative prices for Silver and Gold plans.");
      return;
    }

    if (silverMonthlyCents > goldMonthlyCents) {
      setPricingMessage("Silver should not be more expensive than Gold.");
      return;
    }

    setSubscriptionPrices((currentPrices) =>
      currentPrices.map((price) => {
        if (price.tier === "silver") {
          return {
            ...price,
            monthlyPriceCents: silverMonthlyCents,
            annualPriceCents: silverMonthlyCents * 10
          };
        }

        if (price.tier === "gold") {
          return {
            ...price,
            monthlyPriceCents: goldMonthlyCents,
            annualPriceCents: goldMonthlyCents * 10
          };
        }

        return price;
      })
    );

    setPricingMessage("Subscription prices were updated locally for Phase 1.");
  };

  const confirmSettlement = () => {
    if (!selectedSettlementRow) {
      return;
    }

    setSettlements((currentSettlements) => ({
      ...currentSettlements,
      [selectedSettlementRow.id]: {
        status: "settled",
        settledAt: new Date().toISOString(),
        settledByUserId: currentUser?.id
      }
    }));

    setSelectedSettlementId(null);
  };

  const priceColumns: TableColumn<SubscriptionPrice>[] = [
    {
      key: "tier",
      header: "Tier",
      render: (row) => <span className="font-medium text-slate-50">{tierLabels[row.tier]}</span>
    },
    {
      key: "monthly",
      header: "Monthly price",
      render: (row) => formatCurrencyFromCents(row.monthlyPriceCents, row.currency)
    },
    {
      key: "annual",
      header: "Annual price",
      render: (row) => formatCurrencyFromCents(row.annualPriceCents, row.currency)
    },
    {
      key: "playlistLimit",
      header: "Playlist limit",
      render: (row) => (row.playlistLimit >= 100 ? "Unlimited" : String(row.playlistLimit))
    },
    {
      key: "features",
      header: "Features",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.supportsOfflineMode ? <Badge tone="success">Download</Badge> : <Badge>Streaming only</Badge>}
          {row.supportsAdvancedStats ? <Badge tone="info">Advanced stats</Badge> : null}
        </div>
      )
    }
  ];

  const billingColumns: TableColumn<SubscriptionPrice>[] = [
    {
      key: "tier",
      header: "Tier",
      render: (row) => <span className="font-medium text-slate-50">{tierLabels[row.tier]}</span>
    },
    ...billingPeriods.map<TableColumn<SubscriptionPrice>>((period) => ({
      key: `${period}-months`,
      header: `${period} month${period > 1 ? "s" : ""}`,
      render: (row) => formatCurrencyFromCents(row.monthlyPriceCents * period, row.currency)
    }))
  ];

  const accountingColumns: TableColumn<AccountingRow>[] = [
    {
      key: "artist",
      header: "Artist",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-50">{row.artistName}</p>
          <p className="text-xs text-slate-400">{row.artistId}</p>
        </div>
      )
    },
    {
      key: "period",
      header: "Period",
      render: (row) => `${formatDate(row.periodStart)} - ${formatDate(row.periodEnd)}`
    },
    {
      key: "listeners",
      header: "Unique listeners",
      render: (row) => formatNumber(row.uniqueListeners)
    },
    {
      key: "streams",
      header: "Streams",
      render: (row) => formatNumber(row.streamCount)
    },
    {
      key: "payout",
      header: "Artist payout",
      render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency)
    },
    {
      key: "status",
      header: "Payment status",
      render: (row) => (
        <div className="space-y-1">
          <Badge tone={row.paymentStatus === "settled" ? "success" : "warning"}>{row.paymentStatus}</Badge>
          {row.settledAt ? <p className="text-xs text-slate-500">{formatDate(row.settledAt)}</p> : null}
        </div>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button
          disabled={row.paymentStatus === "settled"}
          onClick={() => setSelectedSettlementId(row.id)}
          size="sm"
          variant="secondary"
        >
          Mark settled
        </Button>
      )
    }
  ];

  const userColumns: TableColumn<(typeof users)[number]>[] = [
    {
      key: "user",
      header: "User",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-50">{row.displayName}</p>
          <p className="text-xs text-slate-400">{row.email}</p>
        </div>
      )
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge tone={row.role === "admin" ? "danger" : row.role === "support" ? "info" : "neutral"}>{row.role}</Badge>
      )
    },
    {
      key: "subscription",
      header: "Subscription",
      render: (row) => (
        <Badge tone={row.subscriptionTier === "gold" ? "success" : row.subscriptionTier === "silver" ? "info" : "neutral"}>
          {row.subscriptionTier}
        </Badge>
      )
    },
    {
      key: "verified",
      header: "Email",
      render: (row) => <Badge tone={row.isEmailVerified ? "success" : "warning"}>{row.isEmailVerified ? "Verified" : "Unverified"}</Badge>
    },
    {
      key: "lastActive",
      header: "Last active",
      render: (row) => formatDate(row.lastActiveAt)
    }
  ];

  const pricingTab = (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Subscription price control</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Admins can change Silver and Gold prices without changing code. This Phase 1 version keeps the update in local component state.
        </p>

        <div className="mt-5 space-y-4">
          <Input disabled label="Basic monthly price" name="basicPrice" value="0.00" />

          <Input
            label="Silver monthly price"
            name="silverPrice"
            onChange={(event) => setSilverMonthlyInput(event.target.value)}
            step="0.01"
            type="number"
            value={silverMonthlyInput}
          />

          <Input
            label="Gold monthly price"
            name="goldPrice"
            onChange={(event) => setGoldMonthlyInput(event.target.value)}
            step="0.01"
            type="number"
            value={goldMonthlyInput}
          />

          {pricingMessage ? <p className="text-sm text-brand-500">{pricingMessage}</p> : null}

          <Button onClick={updateSubscriptionPrices}>Update prices</Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-50">Current subscription configuration</h2>
          <Table columns={priceColumns} getRowKey={(row) => row.tier} rows={subscriptionPrices} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-50">Billing period preview</h2>
          <Table columns={billingColumns} getRowKey={(row) => row.tier} rows={subscriptionPrices} />
        </Card>
      </div>
    </div>
  );

  const analyticsTab = (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Subscription distribution</h2>
        <p className="mt-2 text-sm text-slate-400">A simple Phase 1 pie visualization based on mock users.</p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
          <div
            aria-label="Subscription distribution chart"
            className="h-40 w-40 rounded-full border border-surface-600"
            style={{ background: pieGradient }}
          />

          <div className="w-full space-y-3">
            {subscriptionDistribution.map((row) => (
              <div className="rounded-md border border-surface-600 bg-surface-900 p-3" key={row.tier}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-50">{tierLabels[row.tier]}</span>
                  <span className="text-sm text-slate-400">{row.percentage}%</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatNumber(row.userCount)} users</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Platform revenue overview</h2>
        <p className="mt-2 text-sm text-slate-400">Aggregated values are shown as backend-ready mock analytics.</p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-300">Subscription revenue</span>
              <span className="text-slate-400">{formatCurrencyFromCents(monthlySubscriptionRevenueCents)}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-700">
              <div className="h-3 rounded-full bg-brand-500" style={{ width: "68%" }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-300">Platform fees</span>
              <span className="text-slate-400">
                {formatCurrencyFromCents(artistRevenueRecords.reduce((sum, record) => sum + record.platformFeeCents, 0))}
              </span>
            </div>
            <div className="h-3 rounded-full bg-surface-700">
              <div className="h-3 rounded-full bg-brand-500" style={{ width: "42%" }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-300">Artist payouts</span>
              <span className="text-slate-400">{formatCurrencyFromCents(totalArtistPayoutCents)}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-700">
              <div className="h-3 rounded-full bg-brand-500" style={{ width: "84%" }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const accountingTab = (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Monthly artist accounting</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            The admin can review monthly listener counts, streams, calculated payouts, and payment settlement status.
          </p>
        </div>
        <Badge tone="warning">{accountingRows.filter((row) => row.paymentStatus === "pending").length} pending payments</Badge>
      </div>

      <div className="mt-5">
        <Table
          columns={accountingColumns}
          emptyMessage="No accounting records are available."
          getRowKey={(row) => row.id}
          rows={accountingRows}
        />
      </div>
    </Card>
  );

  const accessTab = (
    <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <h2 className="text-lg font-semibold text-slate-50">Advanced settings</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          These controls represent admin-only operational settings. Phase 2 should persist them in the backend.
        </p>

        <div className="mt-5 rounded-lg border border-surface-600 bg-surface-900 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-50">Maintenance mode</p>
              <p className="mt-1 text-sm text-slate-400">Show that the platform can be temporarily disabled by admin.</p>
            </div>
            <Button
              onClick={() => setMaintenanceMode((currentValue) => !currentValue)}
              variant={maintenanceMode ? "danger" : "secondary"}
            >
              {maintenanceMode ? "Turn off" : "Turn on"}
            </Button>
          </div>

          <div className="mt-4">
            <Badge tone={maintenanceMode ? "danger" : "success"}>{maintenanceMode ? "Maintenance on" : "Maintenance off"}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-50">User and access overview</h2>
        <Table columns={userColumns} getRowKey={(row) => row.id} rows={users} />
      </Card>
    </div>
  );

  return (
    <DashboardLayout eyebrow="Admin workspace">
      <PageHeader
        description="Manage subscription pricing, platform analytics, artist accounting, and admin-only operational settings."
        title="Admin"
      />

      {currentUser && currentUser.role !== "admin" ? (
        <Card className="mt-6 border-red-500/30 bg-red-500/10">
          <h2 className="text-lg font-semibold text-red-100">Admin-only workspace</h2>
          <p className="mt-2 text-sm text-red-100/80">This page is designed for the single system admin role.</p>
        </Card>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Monthly subscription revenue" value={formatCurrencyFromCents(monthlySubscriptionRevenueCents)} />
        <StatCard label="Estimated platform net" value={formatCurrencyFromCents(estimatedPlatformNetCents)} />
        <StatCard label="Pending approvals" value={String(pendingApprovalsCount)} />
        <StatCard label="Artist payouts" value={formatCurrencyFromCents(totalArtistPayoutCents)} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard helperText={`${listenerUsersCount} listeners in mock data`} label="Listener users" value={String(listenerUsersCount)} />
        <StatCard helperText={`${artistUsersCount} artist accounts in mock data`} label="Artist users" value={String(artistUsersCount)} />
        <StatCard helperText={`${supportUsersCount} support users in mock data`} label="Support users" value={String(supportUsersCount)} />
      </section>

      <section className="mt-6">
        <Tabs
          defaultTabId="pricing"
          tabs={[
            {
              id: "pricing",
              label: "Pricing",
              content: pricingTab
            },
            {
              id: "analytics",
              label: "Analytics",
              content: analyticsTab
            },
            {
              id: "accounting",
              label: "Accounting",
              content: accountingTab
            },
            {
              id: "settings",
              label: "Access and settings",
              content: accessTab
            }
          ]}
        />
      </section>

      <Modal open={Boolean(selectedSettlementRow)} title="Confirm artist settlement" onClose={() => setSelectedSettlementId(null)}>
        {selectedSettlementRow ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-300">
              Confirm that the monthly payout for{" "}
              <span className="font-semibold text-slate-50">{selectedSettlementRow.artistName}</span> has been settled.
            </p>

            <div className="rounded-md border border-surface-600 bg-surface-900 p-3 text-sm text-slate-300">
              <div className="flex justify-between gap-4">
                <span>Period</span>
                <span>
                  {formatDate(selectedSettlementRow.periodStart)} - {formatDate(selectedSettlementRow.periodEnd)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span>Artist payout</span>
                <span>{formatCurrencyFromCents(selectedSettlementRow.netRevenueCents, selectedSettlementRow.currency)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setSelectedSettlementId(null)} variant="ghost">
                Cancel
              </Button>
              <Button onClick={confirmSettlement}>Confirm settlement</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}