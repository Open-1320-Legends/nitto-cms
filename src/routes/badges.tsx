import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { badgesApi, ApiError, type BadgeAccount } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/badges")({
  head: () => ({
    meta: [
      { title: "Badges — 1320 Legends Console" },
      { name: "description", content: "Grant and revoke account badges." },
      { property: "og:title", content: "Badges — 1320 Legends Console" },
      { property: "og:description", content: "Grant and revoke account badges." },
    ],
  }),
  component: BadgesPage,
});

// Real data source: GET /admin/badges (the tooltip catalog, features/accounts/badges.mjs) +
// GET /admin/accounts?query=... (each row already carries `badges`/`manualBadges`) + POST
// /admin/accounts/:id/badges {grant,revoke} (accountAction's "badges" case). A badge earned
// through a live condition (role/location/stat) shows as earned but isn't revocable here -- only
// manually-granted ones are, since a condition-earned badge would just re-earn on the account's
// next getuser.
function BadgesPage() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BadgeAccount | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["badges-catalog"],
    queryFn: () => badgesApi.catalog(),
    enabled: status === "authenticated",
  });

  const accountsQuery = useQuery({
    queryKey: ["badges-accounts", search],
    queryFn: () => badgesApi.searchAccounts(search),
    enabled: status === "authenticated" && search.trim().length > 0,
  });

  if (catalogQuery.isError) {
    return (
      <SectionError breadcrumb="Badges" kicker="Operations" title="Badges" message="Could not load the badge catalog." />
    );
  }
  if (catalogQuery.isLoading || !catalogQuery.data) {
    return <SectionLoading breadcrumb="Badges" kicker="Operations" title="Badges" />;
  }

  const catalog = catalogQuery.data.badges;
  const accounts = accountsQuery.data?.accounts || [];

  const toggle = async (badgeId: number, currentlyOwned: boolean, isManual: boolean) => {
    if (!selected) return;
    if (currentlyOwned && !isManual) {
      toast.error("This badge is earned automatically (role/location/stats) -- it can't be revoked here.");
      return;
    }
    setPendingId(badgeId);
    try {
      const res = await badgesApi.saveBadges(selected.id, currentlyOwned ? { revoke: [badgeId] } : { grant: [badgeId] });
      setSelected(res.account);
      await queryClient.invalidateQueries({ queryKey: ["badges-accounts"] });
      toast.success(currentlyOwned ? "Badge revoked." : "Badge granted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setPendingId(null);
    }
  };

  const stats = [
    { label: "Catalog badges", value: String(catalog.length), note: "COMPUTABLE FROM REAL DATA" },
    { label: "Selected account", value: selected ? selected.username : "—", note: "CURRENT TARGET" },
    { label: "Owned (selected)", value: selected ? String(selected.badges.length) : "00", note: "INCLUDES MANUAL GRANTS" },
    { label: "Data source", value: "LIVE", note: "ACCOUNT BADGES", emphasis: true },
  ];

  return (
    <Shell breadcrumb="Badges">
      <PageTitle kicker="Operations" title="Badges" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <Panel title="Find Account" meta="GET /admin/accounts" delay={150} className="mb-8">
        <div className="border-b border-line px-6 py-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH BY USERNAME OR ACCOUNT ID"
            className="h-9 w-96 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
          />
        </div>
        {search.trim() && (
          <div className="max-h-[240px] overflow-y-auto">
            {accountsQuery.isLoading ? (
              <div className="p-6 font-mono text-[12px] text-dim">Searching...</div>
            ) : accounts.length === 0 ? (
              <div className="p-6 font-mono text-[12px] text-dim">No accounts matched.</div>
            ) : (
              <div className="divide-y divide-line">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={
                      "flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-raise " +
                      (selected?.id === a.id ? "bg-raise" : "")
                    }
                  >
                    <div className="text-[13px] font-bold">{a.username}</div>
                    <div className="font-mono text-[10px] tracking-tighter text-dim uppercase">
                      ID {a.id} // {a.badges.length} badge(s)
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {selected && (
        <Panel title={`Badges — ${selected.username}`} meta="WRITES kv.manualBadgeIds" delay={250}>
          <div className="divide-y divide-line">
            {catalog.map((b) => {
              const owned = selected.badges.includes(b.id);
              const isManual = selected.manualBadges.includes(b.id);
              const revocable = owned && isManual;
              const busy = pendingId === b.id;
              return (
                <div key={b.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <div className="text-[13px] font-bold">{b.name}</div>
                    <div className="mt-1 max-w-xl font-mono text-[10px] tracking-tighter text-dim uppercase">
                      ID {b.id} // {b.description}
                      {owned && !isManual ? " // earned (not revocable here)" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => void toggle(b.id, owned, isManual)}
                    disabled={busy || (owned && !revocable)}
                    className={
                      owned
                        ? "h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125 disabled:opacity-50"
                        : "h-9 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                    }
                  >
                    {busy ? "Saving..." : owned ? (revocable ? "Owned — revoke" : "Owned") : "Grant"}
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </Shell>
  );
}
