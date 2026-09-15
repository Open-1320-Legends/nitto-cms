import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { challengesApi, ApiError, type ChallengeCadence, type ChallengeConfig } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — 1320 Legends Console" },
      { name: "description", content: "Daily, weekly and monthly win challenges and rewards." },
      { property: "og:title", content: "Challenges — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Daily, weekly and monthly win challenges and rewards.",
      },
    ],
  }),
  component: ChallengesPage,
});

// Real data source: GET/PUT /api/admin/challenges (features/challenges.mjs's CHALLENGE_CONFIG,
// confirmed live). Each cadence's target field has a different real key name -- no generic
// "target" across all three -- so this drives the form off that key per cadence rather than a
// shared shape.
const CADENCES: {
  key: keyof ChallengeConfig;
  label: string;
  meta: string;
  targetField: keyof ChallengeCadence;
  targetLabel: string;
}[] = [
  {
    key: "daily",
    label: "Daily",
    meta: "RESETS 00:00 UTC",
    targetField: "targetWins",
    targetLabel: "Target wins",
  },
  {
    key: "weekly",
    label: "Weekly",
    meta: "RESETS MONDAY",
    targetField: "targetTournamentWins",
    targetLabel: "Target tournament wins",
  },
  {
    key: "monthly",
    label: "Monthly",
    meta: "RESETS 1ST",
    targetField: "targetCarWins",
    targetLabel: "Target car wins",
  },
];

function CadenceCard({
  cadenceKey,
  label,
  meta,
  targetField,
  targetLabel,
  cadence,
  delay,
}: {
  cadenceKey: keyof ChallengeConfig;
  label: string;
  meta: string;
  targetField: keyof ChallengeCadence;
  targetLabel: string;
  cadence: ChallengeCadence;
  delay: number;
}) {
  const queryClient = useQueryClient();
  const [wording, setWording] = useState(cadence.wording);
  const [target, setTarget] = useState(String(cadence[targetField] ?? 0));
  const [rewardCash, setRewardCash] = useState(String(cadence.rewardCash));
  const [rewardPoints, setRewardPoints] = useState(String(cadence.rewardPoints));
  const [rewardStreetCredit, setRewardStreetCredit] = useState(String(cadence.rewardStreetCredit));
  const [saving, setSaving] = useState(false);

  // Re-seed the form if the server value changes underneath us (another admin's save, or our own
  // refetch after saving) -- otherwise a stale local draft would silently overwrite a concurrent edit.
  useEffect(() => {
    setWording(cadence.wording);
    setTarget(String(cadence[targetField] ?? 0));
    setRewardCash(String(cadence.rewardCash));
    setRewardPoints(String(cadence.rewardPoints));
    setRewardStreetCredit(String(cadence.rewardStreetCredit));
  }, [cadence, targetField]);

  const save = async () => {
    setSaving(true);
    try {
      await challengesApi.save(cadenceKey, {
        wording,
        [targetField]: Number(target) || 0,
        rewardCash: Number(rewardCash) || 0,
        rewardPoints: Number(rewardPoints) || 0,
        rewardStreetCredit: Number(rewardStreetCredit) || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success(`Saved ${label} challenge.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={label} meta={meta} delay={delay}>
      <div className="space-y-6 p-6">
        <div>
          <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            Wording
          </label>
          <input
            value={wording}
            onChange={(e) => setWording(e.target.value)}
            className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
          />
        </div>
        <div>
          <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            {targetLabel}
          </label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] text-accent outline-none transition-all focus:border-accent/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Reward cash
            </label>
            <input
              type="number"
              value={rewardCash}
              onChange={(e) => setRewardCash(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Reward points
            </label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            Street credit
          </label>
          <input
            type="number"
            value={rewardStreetCredit}
            onChange={(e) => setRewardStreetCredit(e.target.value)}
            className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
          />
        </div>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="h-12 w-full rounded bg-accent text-[12px] font-bold tracking-[0.2em] text-accent-foreground uppercase shadow-[var(--shadow-ember)] transition-all hover:brightness-125 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving..." : `Save ${label} challenge`}
        </button>
      </div>
    </Panel>
  );
}

function ChallengesPage() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: () => challengesApi.get(),
    enabled: status === "authenticated",
  });

  if (query.isError) {
    return (
      <SectionError
        breadcrumb="Challenges"
        kicker="Progression"
        title="Win Challenges"
        message="Could not load the challenge config from the backend."
      />
    );
  }
  if (query.isLoading || !query.data) {
    return <SectionLoading breadcrumb="Challenges" kicker="Progression" title="Win Challenges" />;
  }

  const config = query.data.config;

  return (
    <Shell breadcrumb="Challenges">
      <PageTitle kicker="Progression" title="Win Challenges" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Daily target"
          value={String(config.daily.targetWins ?? 0)}
          note="WINS"
          delay={50}
        />
        <Stat
          label="Weekly target"
          value={String(config.weekly.targetTournamentWins ?? 0)}
          note="TOURNAMENT WINS"
          delay={100}
        />
        <Stat
          label="Monthly target"
          value={String(config.monthly.targetCarWins ?? 0)}
          note="CAR WINS"
          delay={150}
        />
        <Stat
          label="Data source"
          value="LIVE"
          note="CHALLENGE_CONFIG, NO RESTART NEEDED"
          emphasis
          delay={200}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {CADENCES.map((c, i) => (
          <CadenceCard
            key={c.key}
            cadenceKey={c.key}
            label={c.label}
            meta={c.meta}
            targetField={c.targetField}
            targetLabel={c.targetLabel}
            cadence={config[c.key]}
            delay={250 + i * 50}
          />
        ))}
      </div>
    </Shell>
  );
}
