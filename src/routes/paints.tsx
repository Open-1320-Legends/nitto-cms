import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";

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
// swatch list the client's paint picker reads. <p> elements only carry level (l) and hex (c) --
// there's no name/year-range field in this data, so those columns show the real hex and level
// instead of the mock's invented names/year ranges.
function PaintsPage() {
  const file = useCmsFileBySeedKey("paints", "paints.xml");
  const swatches = useMemo(
    () => parseXmlElements(file.data?.content, "p").filter((p) => p.c),
    [file.data],
  );

  const { rows, stats } = useMemo(() => {
    const rows: SectionRow[] = swatches.map((p, i) => ({
      id: `${p.c}-${i}`,
      primary: `#${p.c.toUpperCase()}`,
      secondary: `SWATCH #${i + 1}`,
      cells: [`#${p.c.toUpperCase()}`, p.l && p.l !== "100" ? `LEVEL ${p.l}` : "LEVEL 1"],
      status: "deployed",
      owner: "PAINTS.XML",
    }));

    const levels = new Set(swatches.map((p) => p.l || "100"));

    const stats: SectionStat[] = [
      {
        label: "Colors listed",
        value: String(swatches.length).padStart(4, "0"),
        note: "PAINTS.XML",
      },
      { label: "Unlock tiers", value: String(levels.size), note: "DISTINCT LEVEL GATES" },
      { label: "Data source", value: "LIVE", note: "CMS CATALOG FILE" },
      {
        label: "Unique hex codes",
        value: String(new Set(swatches.map((p) => p.c)).size),
        emphasis: true,
      },
    ];

    return { rows, stats };
  }, [swatches]);

  if (file.isError) {
    return (
      <SectionError
        breadcrumb="OEM Paints"
        kicker="Factory Colors"
        title="OEM Paint Library"
        message="Could not load the paint catalog from the backend."
      />
    );
  }
  if (file.isLoading) {
    return (
      <SectionLoading breadcrumb="OEM Paints" kicker="Factory Colors" title="OEM Paint Library" />
    );
  }

  return (
    <SectionPage
      breadcrumb="OEM Paints"
      kicker="Factory Colors"
      title="OEM Paint Library"
      tableTitle="Color Registry (paints.xml)"
      columns={["Swatch", "Hex", "Unlock tier", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
