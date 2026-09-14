import { createFileRoute } from "@tanstack/react-router";
import { Field, PageTitle, Panel, Shell, Stat } from "@/components/cms/Shell";

// NOT WIRED -- mock data left in place intentionally. Real challenge config DOES exist
// server-side (src/features/challenges.mjs's CHALLENGE_CONFIG: daily/weekly/monthly cadences,
// targets and rewards), but it's a hardcoded in-memory object with no admin read/write route --
// editing it currently means a code change + deploy. Wiring this page for real would need a new
// /api/admin/challenges endpoint, which is a genuine backend gap worth flagging rather than
// building without sign-off (see task brief: don't add speculative new backend routes).
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
  component: Challenges,
});

const CADENCES = [
  {
    key: "Daily",
    meta: "RESETS 00:00 UTC",
    wording: "Win {n} races today",
    target: "3",
    targetLabel: "Target wins",
    cash: "5,000",
    points: "250",
    credit: "10",
  },
  {
    key: "Weekly",
    meta: "RESETS MONDAY",
    wording: "Win {n} tournaments this week",
    target: "2",
    targetLabel: "Target tournament wins",
    cash: "25,000",
    points: "1,200",
    credit: "50",
  },
  {
    key: "Monthly",
    meta: "RESETS 1ST",
    wording: "Win {n} races in the featured car",
    target: "25",
    targetLabel: "Target car wins",
    cash: "120,000",
    points: "6,000",
    credit: "250",
  },
];

function Challenges() {
  return (
    <Shell breadcrumb="Challenges">
      <PageTitle kicker="Progression" title="Win Challenges" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat label="Daily completion" value="82" unit="%" bar={82} delay={50} />
        <Stat label="Weekly completion" value="46" unit="%" bar={46} delay={100} />
        <Stat label="Monthly completion" value="19" unit="%" bar={19} delay={150} />
        <Stat
          label="Reward edits queued"
          value="01"
          note="AWAITING SIGN-OFF"
          emphasis
          delay={200}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {CADENCES.map((c, i) => (
          <Panel key={c.key} title={c.key} meta={c.meta} delay={250 + i * 50}>
            <div className="space-y-6 p-6">
              <Field label="Wording" value={c.wording} />
              <Field label={c.targetLabel} value={c.target} mono accent />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reward cash" value={c.cash} mono />
                <Field label="Reward points" value={c.points} mono />
              </div>
              <Field label="Street credit" value={c.credit} mono />
              <button className="h-12 w-full rounded bg-accent text-[12px] font-bold tracking-[0.2em] text-accent-foreground uppercase shadow-[var(--shadow-ember)] transition-all hover:brightness-125 active:scale-[0.98]">
                Commit {c.key} challenge
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}
