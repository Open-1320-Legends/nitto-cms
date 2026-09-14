import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";

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

// Same real showroom-100.xml source as /cars, presented for pricing/access-tier review instead
// of the roster view.
function DealershipPage() {
  const file = useCmsFileBySeedKey("cars", "showroom-100.xml");
  const cars = useMemo(
    () => parseXmlElements(file.data?.content, "c").filter((c) => c.n),
    [file.data],
  );

  const { rows, stats } = useMemo(() => {
    const rows: SectionRow[] = cars.map((c, i) => {
      const price = Number(c.p || 0);
      const level = Number(c.l || 100);
      return {
        id: c.id || c.i || String(i),
        primary: (c.n || "").toUpperCase(),
        secondary: `SERIAL: ${c.id || c.i} // POINTS: ${c.pp || "0"}`,
        cells: [
          c.ct && c.ct !== "0" ? c.ct.toUpperCase() : "—",
          price ? `$${price.toLocaleString()}` : "—",
        ],
        status: level > 1 ? "queued" : "deployed",
        owner: level > 1 ? `LEVEL ${level}` : "OPEN",
      };
    });

    const prices = cars.map((c) => Number(c.p || 0)).filter((p) => p > 0);
    const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const locked = cars.filter((c) => Number(c.l || 100) > 1).length;

    const stats: SectionStat[] = [
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
      { label: "Data source", value: "LIVE", note: "CMS CATALOG FILE", emphasis: true },
    ];

    return { rows, stats };
  }, [cars]);

  if (file.isError) {
    return (
      <SectionError
        breadcrumb="Dealership"
        kicker="Showroom"
        title="Prices & Access"
        message="Could not load the dealership catalog from the backend."
      />
    );
  }
  if (file.isLoading) {
    return <SectionLoading breadcrumb="Dealership" kicker="Showroom" title="Prices & Access" />;
  }

  return (
    <SectionPage
      breadcrumb="Dealership"
      kicker="Showroom"
      title="Prices & Access"
      tableTitle="Showroom Pricing (showroom-100.xml)"
      columns={["Unit designation", "Tier", "Sticker price", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
