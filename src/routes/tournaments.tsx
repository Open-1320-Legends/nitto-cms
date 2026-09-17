import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api, ApiError, type Tournament, type TournamentPatch } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — 1320 Legends Console" },
      { name: "description", content: "Create and manage live tournaments with special conditions." },
      { property: "og:title", content: "Tournaments — 1320 Legends Console" },
      { property: "og:description", content: "Create and manage live tournaments with special conditions." },
    ],
  }),
  component: TournamentsPage,
});

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EMPTY_FORM: TournamentPatch = {
  title: "",
  alwaysOpen: false,
  dow: 0,
  utcHour: 0,
  qualifyMinutes: 45,
  entryMoney: 0,
  entryPoints: -1,
  bracketDialIn: false,
  firstPrize: 0,
  secondPrize: 0,
  roundPrize: 0,
  requirement: "",
  description: "",
  naturallyAspirated: false,
  requiredLocation: "",
  carNames: [],
};

// Real data source: GET/POST/DELETE /api/admin/cms2/tournaments (features/cms/live-tournaments-
// store.mjs). Built-in scheduled events (id < 10000) are start/stop/cancel-only; admin-created
// ones (id >= 10000, `custom: true`) are fully editable/deletable here.
function TournamentsPage() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TournamentPatch | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const tournamentsQuery = useQuery({
    queryKey: ["cms2-tournaments"],
    queryFn: () => cms2Api.getTournaments(),
    enabled: status === "authenticated",
  });

  if (tournamentsQuery.isError) {
    return (
      <SectionError
        breadcrumb="Tournaments"
        kicker="Operations"
        title="Live Tournaments"
        message="Could not load tournament data from the backend."
      />
    );
  }
  if (tournamentsQuery.isLoading || !tournamentsQuery.data) {
    return <SectionLoading breadcrumb="Tournaments" kicker="Operations" title="Live Tournaments" />;
  }

  const tournaments = tournamentsQuery.data.tournaments;
  const custom = tournaments.filter((t) => t.custom);
  const live = tournaments.filter((t) => t.status === "qualifying").length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cms2-tournaments"] });

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast.error("A title is required.");
      return;
    }
    setBusyId(editing.id ?? -1);
    try {
      await cms2Api.saveTournament(editing);
      await refresh();
      toast.success(editing.id ? "Tournament updated." : "Tournament created.");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: Tournament) => {
    if (!confirm(`Delete "${t.title}"? This can't be undone.`)) return;
    setBusyId(t.id);
    try {
      await cms2Api.deleteTournament(t.id);
      await refresh();
      toast.success("Tournament deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doVerb = async (t: Tournament, verb: "start" | "stop" | "cancel") => {
    setBusyId(t.id);
    try {
      await cms2Api.tournamentAction(t.id, verb);
      await refresh();
      toast.success(`Tournament ${verb === "start" ? "reopened" : verb === "stop" ? "stopped" : "cancelled"}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const stats = [
    { label: "Scheduled events", value: String(tournaments.length).padStart(2, "0"), note: "TOTAL" },
    { label: "Live now", value: String(live).padStart(2, "0"), note: "QUALIFYING" },
    { label: "Custom events", value: String(custom.length).padStart(2, "0"), note: "ADMIN-CREATED" },
    { label: "Data source", value: "LIVE", note: "CMS2 TOURNAMENTS", emphasis: true },
  ];

  const inputCls =
    "h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50";
  const labelCls = "mb-1 block font-mono text-[10px] tracking-[0.15em] text-dim uppercase";

  return (
    <Shell breadcrumb="Tournaments">
      <PageTitle kicker="Operations" title="Live Tournaments" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <div className="rise mb-6 flex justify-end" style={{ animationDelay: "150ms" }}>
        <button
          onClick={() => setEditing({ ...EMPTY_FORM })}
          className="h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125"
        >
          New Tournament
        </button>
      </div>

      {editing && (
        <Panel title={editing.id ? "Edit Tournament" : "New Tournament"} meta="WRITES live-tournaments.json" delay={150} className="mb-8">
          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="col-span-2">
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Schedule</label>
              <label className="flex h-9 items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!editing.alwaysOpen}
                  onChange={(e) => setEditing({ ...editing, alwaysOpen: e.target.checked })}
                />
                Always open (no fixed slot)
              </label>
            </div>
            {!editing.alwaysOpen && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Day (UTC)</label>
                  <select className={inputCls} value={editing.dow} onChange={(e) => setEditing({ ...editing, dow: Number(e.target.value) })}>
                    {DOW.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Hour (UTC)</label>
                  <input type="number" min={0} max={23} className={inputCls} value={editing.utcHour} onChange={(e) => setEditing({ ...editing, utcHour: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Qualify (min)</label>
                  <input type="number" min={0} className={inputCls} value={editing.qualifyMinutes} onChange={(e) => setEditing({ ...editing, qualifyMinutes: Number(e.target.value) })} />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Entry money ($, -1 disables)</label>
              <input type="number" className={inputCls} value={editing.entryMoney} onChange={(e) => setEditing({ ...editing, entryMoney: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Entry points (-1 disables)</label>
              <input type="number" className={inputCls} value={editing.entryPoints} onChange={(e) => setEditing({ ...editing, entryPoints: Number(e.target.value) })} />
            </div>

            <div>
              <label className={labelCls}>First prize ($)</label>
              <input type="number" className={inputCls} value={editing.firstPrize} onChange={(e) => setEditing({ ...editing, firstPrize: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Second prize ($)</label>
              <input type="number" className={inputCls} value={editing.secondPrize} onChange={(e) => setEditing({ ...editing, secondPrize: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Round prize ($)</label>
              <input type="number" className={inputCls} value={editing.roundPrize} onChange={(e) => setEditing({ ...editing, roundPrize: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Bracket type</label>
              <label className="flex h-9 items-center gap-2 text-[13px]">
                <input type="checkbox" checked={!!editing.bracketDialIn} onChange={(e) => setEditing({ ...editing, bracketDialIn: e.target.checked })} />
                Dial-in bracket (unchecked = heads-up)
              </label>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Special condition — car lock (comma-separated names, blank = any car)</label>
                <input
                  className={inputCls}
                  value={(editing.carNames || []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, carNames: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div>
                <label className={labelCls}>Special condition — required home city (blank = any)</label>
                <input className={inputCls} value={editing.requiredLocation} onChange={(e) => setEditing({ ...editing, requiredLocation: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="flex h-9 items-center gap-2 text-[13px]">
                <input type="checkbox" checked={!!editing.naturallyAspirated} onChange={(e) => setEditing({ ...editing, naturallyAspirated: e.target.checked })} />
                Naturally aspirated only
              </label>
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Requirement text (shown on the entry screen)</label>
              <input className={inputCls} value={editing.requirement} onChange={(e) => setEditing({ ...editing, requirement: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
            <button
              onClick={() => setEditing(null)}
              className="h-9 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={busyId !== null}
              className="h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125 disabled:opacity-50"
            >
              {busyId !== null ? "Saving..." : "Save"}
            </button>
          </div>
        </Panel>
      )}

      <Panel title="Scheduled Tournaments" meta="live-tournaments.json + built-in schedule" delay={250}>
        <div className="divide-y divide-line">
          {tournaments.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-[13px] font-bold">
                  {t.title}{" "}
                  <span className="ml-2 font-mono text-[10px] tracking-widest text-dim uppercase">
                    {t.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                  ID {t.id} // {t.custom ? "custom" : "built-in"} // ${t.firstPrize.toLocaleString()} first prize
                  {t.naturallyAspirated ? " // NA only" : ""}
                  {t.requiredLocation ? ` // ${t.requiredLocation} only` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.overridable && (
                  <>
                    <button
                      onClick={() => void doVerb(t, t.status === "closed" ? "start" : "stop")}
                      disabled={busyId === t.id}
                      className="h-9 rounded border border-line px-3 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                    >
                      {t.status === "closed" ? "Reopen" : "Stop"}
                    </button>
                    <button
                      onClick={() => void doVerb(t, "cancel")}
                      disabled={busyId === t.id}
                      className="h-9 rounded border border-line px-3 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {t.custom && (
                  <>
                    <button
                      onClick={() => setEditing(t)}
                      disabled={busyId === t.id}
                      className="h-9 rounded border border-line px-3 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void remove(t)}
                      disabled={busyId === t.id}
                      className="h-9 rounded border border-destructive/40 bg-destructive/10 px-3 font-mono text-[10px] tracking-widest text-destructive uppercase transition-colors hover:brightness-125 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Shell>
  );
}
