import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageTitle, Panel, Shell, Stat, StatusPill } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";
import { approvalsApi } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — 1320 Legends Console" },
      {
        name: "description",
        content: "Live operations board for the 1320 Legends catalog: cars, tunes and approvals.",
      },
      { property: "og:title", content: "Dashboard — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Live operations board for the 1320 Legends catalog: cars, tunes and approvals.",
      },
    ],
  }),
  component: Dashboard,
});

// Real data: cars from /api/admin/cms/files (cars/showroom-100.xml) and the pending count from
// /api/admin/action-approvals. The right-hand "Unit Calibration" edit panel has no dedicated
// single-record backend endpoint (it's a demo form in the mock, not tied to any one action) so
// it stays presentational -- but it now reflects the first real car from the live catalog.
function Dashboard() {
  const { status: authStatus } = useAuth();
  const file = useCmsFileBySeedKey("cars", "showroom-100.xml");
  const approvals = useQuery({
    queryKey: ["action-approvals"],
    queryFn: () => approvalsApi.list(),
    enabled: authStatus === "authenticated",
  });

  const cars = useMemo(
    () =>
      parseXmlElements(file.data?.content, "c")
        .filter((c) => c.n)
        .slice(0, 8),
    [file.data],
  );
  const selected = cars[0];

  if (file.isError || approvals.isError) {
    return (
      <SectionError
        breadcrumb="Dashboard"
        kicker="Live Operations"
        title="Control Manifest"
        message="Could not load live data from the backend."
      />
    );
  }
  if (file.isLoading || approvals.isLoading || !approvals.data) {
    return (
      <SectionLoading breadcrumb="Dashboard" kicker="Live Operations" title="Control Manifest" />
    );
  }

  const pendingCount = approvals.data.pendingCount;

  return (
    <Shell breadcrumb="Dashboard">
      <PageTitle kicker="Live Operations" title="Control Manifest" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Cars in showroom"
          value={String(cars.length ? "8+" : "0")}
          note="TOP OF SHOWROOM-100.XML"
          delay={50}
        />
        <Stat
          label="Approval queue"
          value={String(pendingCount).padStart(2, "0")}
          note={pendingCount ? "AWAITING SIGN-OFF" : "NOTHING WAITING"}
          emphasis
          delay={100}
        />
        <Stat
          label="Catalog file"
          value="LIVE"
          note={
            file.data?.updatedAt
              ? `SYNCED ${new Date(file.data.updatedAt).toLocaleDateString()}`
              : "SYNCED"
          }
          delay={150}
        />
        <Stat label="Session" value="ADMIN" note="COOKIE-AUTHENTICATED" delay={200} />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <Panel
          title="Circuit Catalog"
          meta="LIVE SHOWROOM-100.XML"
          className="col-span-8"
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
                  <th className="px-6 py-4 text-right font-bold">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cars.map((car, i) => (
                  <tr
                    key={car.id || car.i || i}
                    className={
                      i === 0
                        ? "group border-l-2 border-l-accent bg-accent/5"
                        : "group transition-all hover:bg-raise"
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="text-[14px] font-bold uppercase transition-colors group-hover:text-accent">
                        {car.n}
                      </div>
                      <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                        SERIAL: {car.id || car.i}
                      </div>
                    </td>
                    <td className="px-4 py-5 font-mono text-[11px] text-mute uppercase">
                      {car.ct && car.ct !== "0" ? car.ct : "—"}
                    </td>
                    <td className="px-4 py-5 font-mono text-foreground">
                      {car.p ? `$${Number(car.p).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-5">
                      <StatusPill status="deployed" />
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-mute uppercase">
                      {car.l && car.l !== "100" ? `LVL ${car.l}` : "OPEN"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <aside
          className="rise sticky top-[88px] col-span-4 self-start overflow-hidden rounded-xl border border-line bg-panel p-6 shadow-[var(--shadow-panel)]"
          style={{ animationDelay: "300ms" }}
        >
          <div className="glow-spot absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 opacity-10" />
          <div className="relative z-10 mb-8 flex items-center justify-between">
            <div className="text-[14px] font-bold tracking-tight uppercase">Unit Calibration</div>
            <span className="rounded border border-accent/30 bg-accent/5 px-2 py-0.5 font-mono text-[10px] text-accent">
              REF: {selected?.id || selected?.i || "—"}
            </span>
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                Vehicle designation
              </label>
              <div className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] font-bold leading-10">
                {(selected?.n || "—").toUpperCase()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                  Class
                </label>
                <div className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] leading-10">
                  {selected?.ct && selected.ct !== "0" ? selected.ct.toUpperCase() : "—"}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
                  Price
                </label>
                <div className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] text-accent leading-10">
                  {selected?.p ? `$${Number(selected.p).toLocaleString()}` : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded border border-accent/10 bg-accent/5 p-4">
            <div className="font-mono text-[10px] leading-relaxed tracking-tighter text-accent/80 uppercase">
              {pendingCount > 0 ? (
                <>
                  Notice: staff edits queue for owner sign-off.{" "}
                  <Link to="/approvals" className="underline">
                    {pendingCount} item{pendingCount === 1 ? "" : "s"} waiting
                  </Link>
                  .
                </>
              ) : (
                "No staff edits are currently queued for approval."
              )}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
