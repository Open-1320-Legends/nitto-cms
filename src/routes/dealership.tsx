import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat, StatusPill } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cmsApi, ApiError } from "@/lib/api";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";
import { parseXmlElements, updateXmlElementAttrs } from "@/lib/parseXmlElements";

export const Route = createFileRoute("/dealership")({
  head: () => ({
    meta: [
      { title: "Dealership — 1320 Legends Console" },
      { name: "description", content: "Showroom pricing, access tiers and unlock gating." },
      { property: "og:title", content: "Dealership — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Showroom pricing, access tiers and unlock gating.",
      },
    ],
  }),
  component: DealershipPage,
});

// Same real showroom-100.xml source as /cars (where the full per-field editor lives, covering
// every raw attribute including limited-edition flags), trimmed here to the fields that actually
// matter for a "pricing/access" view: cash/points price and the level+location access gate.
// updateXmlElementAttrs (not the flat serializer) since each <c> nests <p cd='..'/> paint-color
// children that a flat reserialize would drop.
const DEAL_ID_KEY = "i";

function DealRow({
  car,
  fileId,
  fileContent,
  onSaved,
}: {
  car: Record<string, string>;
  fileId: number;
  fileContent: string;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [price, setPrice] = useState(car.p ?? "0");
  const [pointPrice, setPointPrice] = useState(car.pp ?? "0");
  const [level, setLevel] = useState(car.l ?? "100");
  const [location, setLocation] = useState(car.lid ?? "100");
  const [saving, setSaving] = useState(false);

  const level100 = Number(car.l || 100);

  const save = async () => {
    setSaving(true);
    try {
      const next = {
        ...car,
        p: price,
        pr: price,
        cp: price,
        pp: pointPrice,
        l: level,
        lid: location,
        cid: location,
      };
      const nextXml = updateXmlElementAttrs(fileContent, "c", DEAL_ID_KEY, car[DEAL_ID_KEY], next);
      if (nextXml === fileContent) {
        toast.error("Could not find this car to patch.");
        return;
      }
      await cmsApi.save(fileId, nextXml);
      await queryClient.invalidateQueries({ queryKey: ["cms-file", fileId] });
      toast.success(`Saved ${car.n || `car ${car[DEAL_ID_KEY]}`}.`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-line last:border-b-0">
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-raise"
      >
        <div>
          <div className="text-[14px] font-bold">{car.n}</div>
          <div className="mt-1 font-mono text-[10px] text-dim uppercase">
            SERIAL: {car.id || car.i} // POINTS: {car.pp || "0"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-mute">
            {car.ct && car.ct !== "0" ? car.ct.toUpperCase() : "—"} / $
            {Number(car.p || 0).toLocaleString()}
          </span>
          <StatusPill status={level100 > 100 ? "queued" : "deployed"} />
          <span className="font-mono text-[10px] text-dim uppercase">
            {level100 > 100 ? `LEVEL ${level100}` : "OPEN"}
          </span>
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-line bg-raise/10 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Cash price
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Points price
              </label>
              <input
                value={pointPrice}
                onChange={(e) => setPointPrice(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label
                title="Level gate: minimum account level required to buy this car. 100 = no gate."
                className="mb-2 block cursor-help font-mono text-[10px] tracking-[0.2em] text-dim uppercase underline decoration-dotted decoration-dim/50 underline-offset-2"
              >
                Level gate
              </label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] text-accent outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label
                title="Dealership location ID: 100=Toreno, 200=Newburge, 300=Creek Side, 400=Vista Heights, 500=Diamond Point."
                className="mb-2 block cursor-help font-mono text-[10px] tracking-[0.2em] text-dim uppercase underline decoration-dotted decoration-dim/50 underline-offset-2"
              >
                Location ID
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DealershipPage() {
  const list = useCmsFileList("cars");
  const meta = list.data?.find((f) => f.seedKey === "showroom-100.xml") ?? null;
  const file = useCmsFileById(meta?.id ?? null);

  const cars = useMemo(
    () => parseXmlElements(file.data?.content, "c").filter((c) => c.n),
    [file.data],
  );

  const { stats } = useMemo(() => {
    const prices = cars.map((c) => Number(c.p || 0)).filter((p) => p > 0);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const locked = cars.filter((c) => Number(c.l || 100) > 100).length;

    return {
      stats: [
        {
          label: "Listed units",
          value: String(cars.length).padStart(4, "0"),
          note: "SHOWROOM-100.XML",
        },
        {
          label: "Average price",
          value: avg ? `$${Math.round(avg / 1000)}K` : "—",
          note: "IN-GAME CASH",
        },
        { label: "Locked units", value: String(locked), note: "LEVEL GATED" },
        { label: "Data source", value: "LIVE", note: "CLICK A ROW TO EDIT", emphasis: true },
      ],
    };
  }, [cars]);

  const loading = list.isLoading || (!!meta && file.isLoading);
  const errored = list.isError || file.isError;

  if (errored) {
    return (
      <SectionError
        breadcrumb="Dealership"
        kicker="Showroom"
        title="Prices & Access"
        message="Could not load the dealership catalog from the backend."
      />
    );
  }
  if (loading) {
    return <SectionLoading breadcrumb="Dealership" kicker="Showroom" title="Prices & Access" />;
  }

  return (
    <Shell breadcrumb="Dealership">
      <PageTitle kicker="Showroom" title="Prices & Access" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <Panel
        title="Showroom Pricing (showroom-100.xml)"
        meta={`${cars.length} RECORDS`}
        delay={250}
      >
        {meta && file.data
          ? cars.map((c, i) => (
              <DealRow
                key={c.id || c.i || i}
                car={c}
                fileId={meta.id}
                fileContent={file.data!.content}
                onSaved={() => {}}
              />
            ))
          : null}
      </Panel>
    </Shell>
  );
}
