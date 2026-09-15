import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cmsApi, ApiError } from "@/lib/api";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";

export const Route = createFileRoute("/oem-audit")({
  head: () => ({
    meta: [
      { title: "OEM Audit — 1320 Legends Console" },
      { name: "description", content: "Factory baseline verification for every chassis." },
      { property: "og:title", content: "OEM Audit — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Factory baseline verification for every chassis.",
      },
    ],
  }),
  component: OemAuditPage,
});

type OemPart = { i: number; pi: number; di: number; n: string; t: string; g: string };

function OemPartRow({
  part,
  onSave,
  saving,
}: {
  part: OemPart;
  onSave: (next: OemPart) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(part.n ?? "");
  const [category, setCategory] = useState(String(part.pi ?? ""));
  const [defaultIndex, setDefaultIndex] = useState(String(part.di ?? ""));
  const [type, setType] = useState(part.t ?? "");
  const [grade, setGrade] = useState(part.g ?? "");

  return (
    <div className="border-b border-line last:border-b-0">
      <div
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-raise"
      >
        <div>
          <div className="text-[13px] font-bold">{part.n || `Part ${part.i}`}</div>
          <div className="mt-1 font-mono text-[10px] text-dim uppercase">
            ID: {part.i} // CATEGORY: {part.pi} // DEFAULT INDEX: {part.di}
          </div>
        </div>
        <div className="font-mono text-[11px] text-mute">
          {part.t === "e" ? "ENGINE" : part.t?.toUpperCase() || "—"}{" "}
          {part.g ? `/ GRADE ${part.g}` : ""}
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-line bg-raise/10 px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Category (pi)
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Default index (di)
              </label>
              <input
                value={defaultIndex}
                onChange={(e) => setDefaultIndex(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Type
              </label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Grade
              </label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() =>
                onSave({
                  ...part,
                  n: name,
                  pi: Number(category) || 0,
                  di: Number(defaultIndex) || 0,
                  t: type,
                  g: grade,
                })
              }
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

// Real data source: /api/admin/cms/files (category "engines", seedKey "oem-baseline.json") --
// the set of parts installed by default on every stock car. Plain JSON (not XML), so edits just
// JSON.parse/stringify the whole {version, source, parts:[...]} object and PUT it back through
// the same raw-content CMS file API every other non-structured editor in this app uses.
function OemAuditPage() {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const list = useCmsFileList("engines");
  const meta = list.data?.find((f) => f.seedKey === "oem-baseline.json") ?? null;
  const file = useCmsFileById(meta?.id ?? null);

  const parsed = useMemo(() => {
    if (!file.data?.content) return null;
    try {
      return JSON.parse(file.data.content) as {
        version?: number;
        source?: string;
        parts: OemPart[];
      };
    } catch {
      return null;
    }
  }, [file.data]);

  const parts = parsed?.parts ?? [];

  const save = async (next: OemPart) => {
    if (!meta || !parsed) return;
    setSaving(true);
    try {
      const nextParts = parts.map((p) => (p.i === next.i ? next : p));
      const content = JSON.stringify({ ...parsed, parts: nextParts }, null, 1);
      await cmsApi.save(meta.id, content);
      await queryClient.invalidateQueries({ queryKey: ["cms-file", meta.id] });
      toast.success(`Saved ${next.n || `part ${next.i}`}.`);
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
        breadcrumb="OEM Audit"
        kicker="Stock Baseline"
        title="Chassis Audit"
        message="Could not load the OEM baseline data from the backend."
      />
    );
  }
  if (loading) {
    return <SectionLoading breadcrumb="OEM Audit" kicker="Stock Baseline" title="Chassis Audit" />;
  }

  const grades = new Set(parts.map((p) => p.g).filter(Boolean));

  return (
    <Shell breadcrumb="OEM Audit">
      <PageTitle kicker="Stock Baseline" title="Chassis Audit" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Baseline parts"
          value={String(parts.length).padStart(4, "0")}
          note="OEM-BASELINE.JSON"
          delay={50}
        />
        <Stat
          label="Grade tiers"
          value={String(grades.size)}
          note="DISTINCT GRADE CODES"
          delay={100}
        />
        <Stat
          label="Last synced"
          value={file.data?.updatedAt ? new Date(file.data.updatedAt).toLocaleDateString() : "—"}
          note="CATALOG FILE UPDATED_AT"
          delay={150}
        />
        <Stat label="Data source" value="LIVE" note="CLICK A ROW TO EDIT" emphasis delay={200} />
      </div>

      <Panel
        title="OEM Baseline Parts (oem-baseline.json)"
        meta={`${parts.length} RECORDS`}
        delay={250}
      >
        {parts.map((p) => (
          <OemPartRow key={p.i} part={p} onSave={(next) => void save(next)} saving={saving} />
        ))}
      </Panel>
    </Shell>
  );
}
