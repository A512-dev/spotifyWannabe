import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader, StatCard, TrackCard } from "@/components/shared";
import { tracks } from "@/data/tracks";
import { formatNumber } from "@/lib/formatters";

export default function HomePage() {
  return (
    <MainAppLayout>
      <PageHeader
        description="Shared landing skeleton for recommendations, recently played tracks, and subscription-aware prompts."
        title="Home"
      />

      {/* Developer 2 can replace these cards with recommendation modules later. */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard helperText="Mock catalog value" label="Tracks available" value={formatNumber(tracks.length)} />
        <StatCard helperText="Placeholder metric" label="Daily mixes" value="6" />
        <StatCard helperText="Subscription-aware later" label="Offline mode" value="Gold" />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-50">Featured tracks</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {tracks.slice(0, 2).map((track) => (
            <TrackCard artistName="Lina Torres" key={track.id} track={track} />
          ))}
        </div>
      </section>
    </MainAppLayout>
  );
}
