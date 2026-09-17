import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { badgesApi, badgeCatalogApi, ApiError, type BadgeAccount, type BadgeCatalogEntry2 } from "@/lib/api";
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
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [catalogForm, setCatalogForm] = useState<{ name: string; description: string; connType: string; connValue: string }>({
    name: "",
    description: "",
    connType: "",
    connValue: "",
  });
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogBusyId, setCatalogBusyId] = useState<number | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["badges-catalog"],
    queryFn: () => badgesApi.catalog(),
    enabled: status === "authenticated",
  });

  const adminCatalogQuery = useQuery({
    queryKey: ["badge-admin-catalog"],
    queryFn: () => badgeCatalogApi.get(),
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

  const adminCatalog = adminCatalogQuery.data?.badges || [];
  const roleOptions = adminCatalogQuery.data?.roleConnectionOptions || [];
  const filteredAdminCatalog = catalogSearch.trim()
    ? adminCatalog.filter(
        (b) =>
          b.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          String(b.id).includes(catalogSearch.trim()),
      )
    : adminCatalog;

  const startEdit = (b: BadgeCatalogEntry2) => {
    setEditingCatalogId(b.id);
    setCatalogForm({
      name: b.name,
      description: b.description,
      connType: b.connection?.type === "special" ? "" : b.connection?.type || "",
      connValue: b.connection?.type === "special" ? "" : b.connection?.value || "",
    });
  };

  const saveCatalogEntry = async () => {
    if (editingCatalogId === null) return;
    setCatalogBusyId(editingCatalogId);
    try {
      const connection = catalogForm.connType
        ? { type: catalogForm.connType as "role" | "package" | "location", value: catalogForm.connValue }
        : null;
      await badgeCatalogApi.saveEntry(editingCatalogId, {
        name: catalogForm.name,
        description: catalogForm.description,
        connection,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["badge-admin-catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["badges-catalog"] }),
      ]);
      toast.success("Badge catalog entry saved.");
      setEditingCatalogId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setCatalogBusyId(null);
    }
  };

  const resetCatalogEntry = async (id: number) => {
    setCatalogBusyId(id);
    try {
      await badgeCatalogApi.resetEntry(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["badge-admin-catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["badges-catalog"] }),
      ]);
      toast.success("Reset to default.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Reset failed.");
    } finally {
      setCatalogBusyId(null);
    }
  };

  const moveCatalogEntry = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= adminCatalog.length) return;
    const order = adminCatalog.map((b) => b.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    setCatalogBusyId(adminCatalog[index].id);
    try {
      await badgeCatalogApi.saveOrder(order);
      await queryClient.invalidateQueries({ queryKey: ["badge-admin-catalog"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Reorder failed.");
    } finally {
      setCatalogBusyId(null);
    }
  };

  const stats = [
    { label: "Catalog badges", value: String(catalog.length), note: "REAL, NAMED CATALOG" },
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

      <Panel title="Badge Catalog" meta="rename / reorder / reconnect — GET/POST /admin/cms2/badges/catalog" delay={200} className="mb-8">
        <div className="border-b border-line px-6 py-4">
          <input
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="SEARCH THE CATALOG BY NAME OR ID"
            className="h-9 w-96 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
          />
        </div>
        {adminCatalogQuery.isLoading ? (
          <div className="p-6 font-mono text-[12px] text-dim">Loading catalog...</div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto divide-y divide-line">
            {filteredAdminCatalog.map((b) => {
              const realIndex = adminCatalog.findIndex((x) => x.id === b.id);
              const isEditing = editingCatalogId === b.id;
              const busy = catalogBusyId === b.id;
              const isSpecial = b.connection?.type === "special";
              return (
                <div key={b.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold">{b.name}</div>
                      <div className="mt-1 max-w-2xl font-mono text-[10px] tracking-tighter text-dim uppercase">
                        ID {b.id} //{" "}
                        {b.connection
                          ? b.connection.type === "special"
                            ? b.connection.value
                            : `connected: ${b.connection.type} = ${b.connection.value}`
                          : "no connection"}
                      </div>
                      <div className="mt-1 max-w-2xl text-[11px] text-mute">{b.description}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => void moveCatalogEntry(realIndex, -1)}
                        disabled={busy || realIndex === 0}
                        title="Move up"
                        className="h-8 w-8 rounded border border-line font-mono text-[11px] text-mute transition-colors hover:bg-raise hover:text-foreground disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => void moveCatalogEntry(realIndex, 1)}
                        disabled={busy || realIndex === adminCatalog.length - 1}
                        title="Move down"
                        className="h-8 w-8 rounded border border-line font-mono text-[11px] text-mute transition-colors hover:bg-raise hover:text-foreground disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => (isEditing ? setEditingCatalogId(null) : startEdit(b))}
                        disabled={busy}
                        className="h-9 rounded border border-line px-3 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      {!isSpecial && (
                        <button
                          onClick={() => void resetCatalogEntry(b.id)}
                          disabled={busy}
                          className="h-9 rounded border border-line px-3 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded border border-line bg-background/40 p-4">
                      <div className="col-span-2">
                        <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-dim uppercase">Name</label>
                        <input
                          value={catalogForm.name}
                          onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                          className="h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none focus:border-accent/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-dim uppercase">Description</label>
                        <input
                          value={catalogForm.description}
                          onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                          className="h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none focus:border-accent/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-dim uppercase">Connection type</label>
                        <select
                          value={catalogForm.connType}
                          onChange={(e) => setCatalogForm({ ...catalogForm, connType: e.target.value, connValue: "" })}
                          className="h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none focus:border-accent/50"
                        >
                          <option value="">None</option>
                          <option value="role">Role</option>
                          <option value="location">City (location id)</option>
                          <option value="package">Package (Stripe SKU)</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-dim uppercase">Value</label>
                        {catalogForm.connType === "role" ? (
                          <select
                            value={catalogForm.connValue}
                            onChange={(e) => setCatalogForm({ ...catalogForm, connValue: e.target.value })}
                            className="h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none focus:border-accent/50"
                          >
                            <option value="">Select a role</option>
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={catalogForm.connValue}
                            onChange={(e) => setCatalogForm({ ...catalogForm, connValue: e.target.value })}
                            disabled={!catalogForm.connType}
                            placeholder={catalogForm.connType === "location" ? "e.g. 100" : catalogForm.connType === "package" ? "e.g. black-fox" : ""}
                            className="h-9 w-full rounded border border-line bg-background px-3 text-[13px] outline-none focus:border-accent/50 disabled:opacity-40"
                          />
                        )}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => void saveCatalogEntry()}
                          disabled={busy}
                          className="h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125 disabled:opacity-50"
                        >
                          {busy ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
