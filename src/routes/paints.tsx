import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cmsApi, ApiError } from "@/lib/api";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";
import { parseXmlElements, serializeXmlChildren } from "@/lib/parseXmlElements";

export const Route = createFileRoute("/paints")({
  head: () => ({
    meta: [
      { title: "OEM Paints — 1320 Legends Console" },
      { name: "description", content: "Factory color library and paint code audit." },
      { property: "og:title", content: "OEM Paints — 1320 Legends Console" },
      { property: "og:description", content: "Factory color library and paint code audit." },
    ],
  }),
  component: PaintsPage,
});

// Real data source: /api/admin/cms/files (category "paints", seedKey "paints.xml"), the live
// swatch list the client's paint picker reads: `<n id='getpaints'><p l='..' c='HEX'/>...</n>` --
// root tag "n", child tag "p" (different tags, unlike wheels-500.xml's `<p><p.../></p>`), and
// records carry only level (l) + hex (c), no id attribute at all. Edited/matched by array index
// (serializeXmlChildren reserializes the whole list) since there's no stable per-record key to
// match on otherwise.
function PaintSwatchRow({
  index,
  swatch,
  onSave,
  saving,
}: {
  index: number;
  swatch: Record<string, string>;
  onSave: (index: number, next: Record<string, string>) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [level, setLevel] = useState(swatch.l ?? "100");
  const [hex, setHex] = useState(swatch.c ?? "");

  return (
    <div className="border-b border-line last:border-b-0">
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-raise"
      >
        <div className="flex items-center gap-3">
          <span
            className="size-6 shrink-0 rounded border border-line"
            style={{ backgroundColor: `#${swatch.c ?? "000000"}` }}
          />
          <div>
            <div className="text-[13px] font-bold">#{(swatch.c ?? "").toUpperCase()}</div>
            <div className="mt-1 font-mono text-[10px] text-dim uppercase">
              Swatch #{index + 1} // Level {swatch.l ?? "100"}
            </div>
          </div>
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-line bg-raise/10 px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Hex
              </label>
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] uppercase outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Unlock level
              </label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => onSave(index, { ...swatch, l: level, c: hex })}
                disabled={saving}
                className="h-10 w-full rounded bg-accent font-mono text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaintsPage() {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const list = useCmsFileList("paints");
  const meta = list.data?.find((f) => f.seedKey === "paints.xml") ?? null;
  const file = useCmsFileById(meta?.id ?? null);

  const swatches = useMemo(
    () => parseXmlElements(file.data?.content, "p").filter((p) => p.c),
    [file.data],
  );

  const save = async (index: number, next: Record<string, string>) => {
    if (!meta) return;
    setSaving(true);
    try {
      const nextSwatches = swatches.map((s, i) => (i === index ? next : s));
      const xml = serializeXmlChildren(nextSwatches, "n", "p", { id: "getpaints" });
      await cmsApi.save(meta.id, xml);
      await queryClient.invalidateQueries({ queryKey: ["cms-file", meta.id] });
      toast.success(`Saved swatch #${index + 1}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const loading = list.isLoading || (!!meta && file.isLoading);
  const errored = list.isError || file.isError;

  if (errored) {
    return (
      <SectionError
        breadcrumb="OEM Paints"
        kicker="Factory Colors"
        title="OEM Paint Library"
        message="Could not load the paint catalog from the backend."
      />
    );
  }
  if (loading) {
    return (
      <SectionLoading breadcrumb="OEM Paints" kicker="Factory Colors" title="OEM Paint Library" />
    );
  }

  const levels = new Set(swatches.map((p) => p.l || "100"));

  return (
    <Shell breadcrumb="OEM Paints">
      <PageTitle kicker="Factory Colors" title="OEM Paint Library" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Colors listed"
          value={String(swatches.length).padStart(4, "0")}
          note="PAINTS.XML"
          delay={50}
        />
        <Stat
          label="Unlock tiers"
          value={String(levels.size)}
          note="DISTINCT LEVEL GATES"
          delay={100}
        />
        <Stat
          label="Unique hex codes"
          value={String(new Set(swatches.map((p) => p.c)).size)}
          delay={150}
        />
        <Stat label="Data source" value="LIVE" note="CLICK A SWATCH TO EDIT" emphasis delay={200} />
      </div>

      <Panel title="Color Registry (paints.xml)" meta={`${swatches.length} RECORDS`} delay={250}>
        {swatches.map((s, i) => (
          <PaintSwatchRow
            key={i}
            index={i}
            swatch={s}
            onSave={(idx, next) => void save(idx, next)}
            saving={saving}
          />
        ))}
      </Panel>
    </Shell>
  );
}
