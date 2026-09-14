import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";

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
    const rows: SectionRow[] = cars.map((c, i) => {
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

    const stats: SectionStat[] = [
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
    <SectionPage
      breadcrumb="Cars"
      kicker="Dealer Roster"
      title="Car Catalog"
      tableTitle="Circuit Catalog (showroom-100.xml)"
      columns={["Unit designation", "Class", "Price", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
