import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat, StatusPill } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";
import { tuningApi, ApiError, type TuningCarItem, type TuningCarDetail } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/cars")({
  head: () => ({
    meta: [
      { title: "Cars — 1320 Legends Console" },
      { name: "description", content: "Dealer car roster, classes, elapsed times and status." },
      { property: "og:title", content: "Cars — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Dealer car roster, classes, elapsed times and status.",
      },
    ],
  }),
  component: CarsPage,
});

// ---- Catalog pricing editor (the REAL price the economy charges) ----
// economy.mjs's buycar reads carInfo(catalogId).moneyPrice/.pointPrice, which lives in
// data/catalog/car-race-data.json (features/garage/catalog-car.mjs), NOT the showroom-100.xml
// display price shown in the roster table below -- that's cosmetic dealer-front data only.
// Editable via GET/POST /api/admin/tuning/cars/:id (confirmed live: partial-body POST merges,
// missing fields keep their current value).
function CarPriceEditorRow({ item }: { item: TuningCarItem }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [moneyPrice, setMoneyPrice] = useState("");
  const [pointPrice, setPointPrice] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["tuning-car", item.id],
    queryFn: () => tuningApi.getCar(item.id),
    enabled: open,
  });

  const detail: TuningCarDetail | undefined = detailQuery.data?.car;

  // Seed the inputs once the detail query resolves (first open, or after a fresh refetch).
  useEffect(() => {
    if (detail) {
      setMoneyPrice(String(detail.moneyPrice ?? 0));
      setPointPrice(String(detail.pointPrice ?? 0));
    }
  }, [detail]);

  const save = async () => {
    if (!reason.trim()) {
      toast.error("A save reason is required (it's written to the audit log).");
      return;
    }
    setSaving(true);
    try {
      await tuningApi.saveCar(
        item.id,
        { moneyPrice: Number(moneyPrice) || 0, pointPrice: Number(pointPrice) || 0 },
        reason.trim(),
      );
      await queryClient.invalidateQueries({ queryKey: ["tuning-car", item.id] });
      await queryClient.invalidateQueries({ queryKey: ["tuning-cars-search"] });
      toast.success(`Saved price for ${item.name}.`);
      setReason("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-[13px] font-bold">{item.name}</div>
          <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
            CATALOG ID {item.id} // {item.engineFamily || "—"} // {item.horsepower} HP
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-8 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
        >
          {open ? "Close" : "Edit price"}
        </button>
      </div>
      {open ? (
        <div className="border-t border-line bg-raise/10 px-6 py-5">
          {detailQuery.isLoading ? (
            <div className="font-mono text-[11px] text-dim">Loading current price...</div>
          ) : detailQuery.isError ? (
            <div className="font-mono text-[11px] text-accent">
              Could not load this car's catalog entry.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                  Cash price
                </label>
                <input
                  type="number"
                  value={moneyPrice}
                  onChange={(e) => setMoneyPrice(e.target.value)}
                  className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                  Points price
                </label>
                <input
                  type="number"
                  value={pointPrice}
                  onChange={(e) => setPointPrice(e.target.value)}
                  className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                  Reason (required, audit-logged)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. balance pass"
                  className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
                />
              </div>
              <div className="col-span-3 flex justify-end">
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save price"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CarPriceEditor() {
  const { status } = useAuth();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["tuning-cars-search", search],
    queryFn: () => tuningApi.searchCars(search, 50),
    enabled: status === "authenticated",
  });

  return (
    <Panel
      title="Catalog Pricing Editor"
      meta="LIVE — data/catalog/car-race-data.json"
      delay={300}
      className="mt-8"
    >
      <div className="border-b border-line px-6 py-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH CATALOG CARS BY NAME OR ID"
          className="h-9 w-80 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
        />
      </div>
      {query.isLoading ? (
        <div className="p-6 font-mono text-[12px] text-mute">Loading catalog cars...</div>
      ) : query.isError ? (
        <div className="p-6 font-mono text-[12px] text-accent">
          Could not load the tuning catalog.
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          {query.data?.items.length ? (
            query.data.items.map((item) => <CarPriceEditorRow key={item.id} item={item} />)
          ) : (
            <div className="p-6 font-mono text-[12px] text-dim">No cars matched.</div>
          )}
        </div>
      )}
    </Panel>
  );
}

// Real data source: /api/admin/cms/files (category "cars"), seedKey "showroom-100.xml" -- the
// live dealer showroom XML the game client itself reads. <c> elements: n=name, p=price,
// ct=class, y=year, eo=engine option, l=level gate.
function CarsPage() {
  const file = useCmsFileBySeedKey("cars", "showroom-100.xml");
  const cars = useMemo(
    () => parseXmlElements(file.data?.content, "c").filter((c) => c.n),
    [file.data],
  );

  const { rows, stats } = useMemo(() => {
    const rows = cars.map((c, i) => {
      const price = Number(c.p || 0);
      return {
        id: c.id || c.i || String(i),
        primary: (c.n || "").toUpperCase(),
        secondary: `SERIAL: ${c.id || c.i}${c.y ? ` // YEAR: ${c.y}` : ""}${c.eo ? ` // ${c.eo}` : ""}`,
        cells: [
          c.ct && c.ct !== "0" ? c.ct.toUpperCase() : "—",
          price ? `$${price.toLocaleString()}` : "—",
        ],
        status: "deployed",
        owner: c.l && c.l !== "100" ? `LVL ${c.l}` : "UNLOCKED",
      };
    });

    const prices = cars.map((c) => Number(c.p || 0)).filter((p) => p > 0);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    const classes = new Set(cars.map((c) => c.ct).filter((c) => c && c !== "0"));

    const stats = [
      {
        label: "Cars on roster",
        value: String(cars.length).padStart(4, "0"),
        note: "SHOWROOM-100.XML",
      },
      {
        label: "Classes",
        value: String(classes.size).padStart(2, "0"),
        note: "DISTINCT CLASS TAGS",
      },
      {
        label: "Average price",
        value: avg ? `$${(avg / 1000).toFixed(1)}K` : "—",
        note: "IN-GAME CASH",
      },
      {
        label: "Highest price",
        value: max ? `$${(max / 1000).toFixed(1)}K` : "—",
        note: "TOP LISTING",
        emphasis: true,
      },
    ];

    return { rows, stats };
  }, [cars]);

  if (file.isError) {
    return (
      <SectionError
        breadcrumb="Cars"
        kicker="Dealer Roster"
        title="Car Catalog"
        message="Could not load the cars catalog from the backend."
      />
    );
  }
  if (file.isLoading) {
    return <SectionLoading breadcrumb="Cars" kicker="Dealer Roster" title="Car Catalog" />;
  }

  return (
    <Shell breadcrumb="Cars">
      <PageTitle kicker="Dealer Roster" title="Car Catalog" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <Panel
        title="Circuit Catalog (showroom-100.xml)"
        meta={`${rows.length} ACTIVE RECORDS`}
        delay={250}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-raise/10 text-left font-mono text-[10px] tracking-[0.2em] text-dim/70 uppercase">
                <th className="px-6 py-4 font-bold">Unit designation</th>
                <th className="px-4 py-4 font-bold">Class</th>
                <th className="px-4 py-4 font-bold">Price</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="group transition-all hover:bg-raise">
                  <td className="px-6 py-5">
                    <div className="text-[14px] font-bold transition-colors group-hover:text-accent">
                      {row.primary}
                    </div>
                    <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                      {row.secondary}
                    </div>
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-4 py-5 font-mono text-[11px] text-mute">
                      {cell}
                    </td>
                  ))}
                  <td className="px-4 py-5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-mute">{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <CarPriceEditor />
    </Shell>
  );
}
