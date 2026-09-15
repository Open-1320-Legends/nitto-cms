import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { tuningApi, cmsApi, ApiError, type TuningCarItem, type TuningCarDetail } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";

export const Route = createFileRoute("/engines")({
  head: () => ({
    meta: [
      { title: "Engines — 1320 Legends Console" },
      {
        name: "description",
        content: "Full engine spec editor: redline, torque curve, gears, boost.",
      },
      { property: "og:title", content: "Engines — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Full engine spec editor: redline, torque curve, gears, boost.",
      },
    ],
  }),
  component: EnginesPage,
});

// Real data source: GET/POST /api/admin/tuning/cars/:id (features/cms/tuning-catalog.mjs ->
// data/catalog/car-race-data.json). backend-v2 has no separate "engine block" table -- each car
// model carries its own full spec (weight/redLine/hp/torqueCurve/gears/drivetrain/layout/year/
// defaultPaint/moneyPrice/pointPrice), and EDITABLE_RACE_FIELDS (catalog-car.mjs) covers all of
// it. torqueCurve (100 points, confirmed live) and gears ({f,g,h,i,j,k,l} ratio keys, confirmed
// live) are edited as raw JSON here rather than one field per array index/ratio -- the values
// have no independent meaning outside the curve/set as a whole, and 100 separate number inputs
// would be worse to use than one JSON blob for anyone who actually needs to touch this.
function CarSpecEditor({ item, onDone }: { item: TuningCarItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState("");
  const [redLine, setRedLine] = useState("");
  const [hp, setHp] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [layout, setLayout] = useState("");
  const [year, setYear] = useState("");
  const [defaultPaint, setDefaultPaint] = useState("");
  const [moneyPrice, setMoneyPrice] = useState("");
  const [pointPrice, setPointPrice] = useState("");
  const [gearsText, setGearsText] = useState("");
  const [torqueCurveText, setTorqueCurveText] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["tuning-car-full", item.id],
    queryFn: () => tuningApi.getCar(item.id),
  });
  const detail: TuningCarDetail | undefined = detailQuery.data?.car;

  useEffect(() => {
    if (!detail) return;
    setWeight(String(detail.weight ?? 0));
    setRedLine(String(detail.redLine ?? 0));
    setHp(String(detail.hp ?? 0));
    setDrivetrain(detail.drivetrain ?? "");
    setLayout(detail.layout ?? "");
    setYear(String(detail.year ?? ""));
    setDefaultPaint(detail.defaultPaint ?? "");
    setMoneyPrice(String(detail.moneyPrice ?? 0));
    setPointPrice(String(detail.pointPrice ?? 0));
    setGearsText(JSON.stringify(detail.gears ?? {}, null, 1));
    setTorqueCurveText(JSON.stringify(detail.torqueCurve ?? []));
  }, [detail]);

  const save = async () => {
    if (!reason.trim()) {
      toast.error("A save reason is required (it's written to the audit log).");
      return;
    }
    let gears: Record<string, number>;
    let torqueCurve: number[];
    try {
      gears = JSON.parse(gearsText);
    } catch {
      toast.error("Gears is not valid JSON.");
      return;
    }
    try {
      torqueCurve = JSON.parse(torqueCurveText);
      if (!Array.isArray(torqueCurve)) throw new Error("not an array");
    } catch {
      toast.error("Torque curve must be a valid JSON array of numbers.");
      return;
    }
    setSaving(true);
    try {
      await tuningApi.saveCar(
        item.id,
        {
          weight: Number(weight) || 0,
          redLine: Number(redLine) || 0,
          hp: Number(hp) || 0,
          drivetrain,
          layout,
          year: Number(year) || year,
          defaultPaint,
          moneyPrice: Number(moneyPrice) || 0,
          pointPrice: Number(pointPrice) || 0,
          gears,
          torqueCurve,
        },
        reason.trim(),
      );
      await queryClient.invalidateQueries({ queryKey: ["tuning-car-full", item.id] });
      await queryClient.invalidateQueries({ queryKey: ["tuning-cars-full"] });
      toast.success(`Saved ${item.name}.`);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-line bg-raise/10 px-6 py-5">
      {detailQuery.isLoading ? (
        <div className="font-mono text-[11px] text-dim">Loading full spec...</div>
      ) : detailQuery.isError ? (
        <div className="font-mono text-[11px] text-accent">
          Could not load this car's catalog entry.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Weight (lb)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Redline (rpm)
              </label>
              <input
                type="number"
                value={redLine}
                onChange={(e) => setRedLine(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] text-accent outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Horsepower
              </label>
              <input
                type="number"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Drivetrain
              </label>
              <input
                value={drivetrain}
                onChange={(e) => setDrivetrain(e.target.value)}
                placeholder="FWD / RWD / AWD"
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Layout
              </label>
              <input
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Year
              </label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Default paint (hex)
              </label>
              <input
                value={defaultPaint}
                onChange={(e) => setDefaultPaint(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Cash / points price
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={moneyPrice}
                  onChange={(e) => setMoneyPrice(e.target.value)}
                  className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
                />
                <input
                  type="number"
                  value={pointPrice}
                  onChange={(e) => setPointPrice(e.target.value)}
                  className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label
                title="Gear ratios keyed f/g/h/i/j/k/l (final drive + gears 1-5 + one more, confirmed live) -- edit as JSON."
                className="mb-2 block cursor-help font-mono text-[10px] tracking-[0.2em] text-dim uppercase underline decoration-dotted decoration-dim/50 underline-offset-2"
              >
                Gears (JSON)
              </label>
              <textarea
                value={gearsText}
                onChange={(e) => setGearsText(e.target.value)}
                spellCheck={false}
                className="h-32 w-full resize-y rounded border border-line bg-background p-3 font-mono text-[11px] leading-relaxed outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label
                title="100-point torque curve sampled across the rev range (confirmed live). Edit as a JSON array of numbers."
                className="mb-2 block cursor-help font-mono text-[10px] tracking-[0.2em] text-dim uppercase underline decoration-dotted decoration-dim/50 underline-offset-2"
              >
                Torque curve (JSON array)
              </label>
              <textarea
                value={torqueCurveText}
                onChange={(e) => setTorqueCurveText(e.target.value)}
                spellCheck={false}
                className="h-32 w-full resize-y rounded border border-line bg-background p-3 font-mono text-[11px] leading-relaxed outline-none transition-all focus:border-accent/50"
              />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="w-96">
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Reason (required, audit-logged)
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. rebalance redline / boost pass"
                className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDone}
                className="h-9 rounded border border-line px-5 font-mono text-[11px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save spec"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Boost profiles: STOCK per-car boost psi (data/catalog/boost-profiles.json) ----
// Real, but with a real limitation: catalog-car.mjs loads this file once at process start via a
// plain readFileSync (NOT through the live-reloading catalog-store.mjs system every other CMS
// file uses), so a save here updates the CMS database row but does NOT take effect until the
// backend process restarts. Editable via the existing raw-content CMS file API for consistency
// with the rest of this app, but the limitation is surfaced plainly rather than hidden.
function BoostProfilesEditor() {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const list = useCmsFileList("engines");
  const meta = list.data?.find((f) => f.seedKey === "boost-profiles.json") ?? null;
  const file = useCmsFileById(meta?.id ?? null);

  useEffect(() => {
    if (file.data) setDraft(file.data.content);
  }, [file.data]);

  const save = async () => {
    if (!meta) return;
    try {
      JSON.parse(draft);
    } catch {
      toast.error("Not valid JSON.");
      return;
    }
    setSaving(true);
    try {
      await cmsApi.save(meta.id, draft);
      await queryClient.invalidateQueries({ queryKey: ["cms-file", meta.id] });
      toast.success("Saved boost-profiles.json. Takes effect on the next backend restart.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Boost Profiles"
      meta="RAW FILE — boost-profiles.json"
      delay={350}
      className="mt-8"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="font-mono text-[11px] text-accent">
          Loaded once at process start (not live-reloaded like other catalog files) -- a save here
          only takes effect after the next backend restart.
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="h-8 shrink-0 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
        >
          {expanded ? "Close" : "Open editor"}
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-line bg-raise/10 px-6 py-5">
          {list.isLoading || (meta && file.isLoading) ? (
            <div className="font-mono text-[11px] text-dim">Loading boost-profiles.json...</div>
          ) : list.isError || file.isError ? (
            <div className="font-mono text-[11px] text-accent">
              Could not load boost-profiles.json.
            </div>
          ) : !meta ? (
            <div className="font-mono text-[11px] text-accent">
              boost-profiles.json is not seeded in the CMS catalog files table yet.
            </div>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="h-64 w-full resize-y rounded border border-line bg-background p-4 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-accent/50"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save boost-profiles.json"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

// Real data source: /api/admin/tuning?type=cars for the list, then GET/POST
// /api/admin/tuning/cars/:id per row for the full spec editor. backend-v2 has no separate
// "engine block" table -- each car model carries its own full engine spec, so that's the closest
// real 1:1 to "engines".
function EnginesPage() {
  const { status } = useAuth();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["tuning-cars-full", search],
    queryFn: () => tuningApi.searchCars(search, 200),
    enabled: status === "authenticated",
  });

  if (query.isError) {
    return (
      <div className="p-10 font-mono text-[12px] text-accent">
        Could not load the tuning catalog from the backend.
      </div>
    );
  }

  const items = query.data?.items ?? [];
  const peak = items.reduce((max, c) => Math.max(max, c.horsepower), 0);
  const avgHp = items.length
    ? Math.round(items.reduce((a, c) => a + c.horsepower, 0) / items.length)
    : 0;

  return (
    <Shell breadcrumb="Engines">
      <PageTitle kicker="Propulsion" title="Engines & Swaps" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Blocks listed"
          value={String(items.length).padStart(4, "0")}
          note="LIVE RACE CATALOG"
          delay={50}
        />
        <Stat label="Average output" value={String(avgHp)} unit="HP" delay={100} />
        <Stat label="Peak output" value={String(peak)} unit="HP" bar={100} delay={150} />
        <Stat
          label="Data source"
          value="TUNING API"
          note="REDLINE, TQ CURVE, GEARS"
          emphasis
          delay={200}
        />
      </div>

      <Panel
        title="Block Registry (live race catalog)"
        meta={`${items.length} RECORDS`}
        delay={250}
      >
        <div className="border-b border-line px-6 py-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cars by name or catalog id..."
            className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
          />
        </div>
        {query.isLoading ? (
          <div className="p-6 font-mono text-[12px] text-mute">Loading catalog cars...</div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((c) => (
              <div key={c.id}>
                <div
                  onClick={() => setEditingId((id) => (id === c.id ? null : c.id))}
                  className="flex cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-raise"
                >
                  <div>
                    <div className="text-[14px] font-bold">{c.name}</div>
                    <div className="mt-1 font-mono text-[10px] text-dim uppercase">
                      MODEL: {c.id}
                      {c.modelYear ? ` // YEAR: ${c.modelYear}` : ""}
                      {c.engineFamily ? ` // ${c.engineFamily}` : ""}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-mute">
                    {c.horsepower} HP / {c.torque} LB-FT / {c.weight} LB
                  </div>
                </div>
                {editingId === c.id ? (
                  <CarSpecEditor item={c} onDone={() => setEditingId(null)} />
                ) : null}
              </div>
            ))}
            {!items.length ? (
              <div className="p-6 font-mono text-[12px] text-dim">No cars matched.</div>
            ) : null}
          </div>
        )}
      </Panel>

      <BoostProfilesEditor />
    </Shell>
  );
}
