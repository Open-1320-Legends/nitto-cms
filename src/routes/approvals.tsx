import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle, Panel, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { approvalsApi, type ApprovalEntry } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — 1320 Legends Console" },
      { name: "description", content: "Staff edits waiting on owner sign-off before going live." },
      { property: "og:title", content: "Approval Queue — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Staff edits waiting on owner sign-off before going live.",
      },
    ],
  }),
  component: Approvals,
});

function ageFrom(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

// Real data source: /api/admin/action-approvals -- the queue a non-owner staff mutation lands in
// (see admin-api.mjs's isAdminApprovalSurface gate). Owners see everyone's queue; approve/deny
// replay or discard the original stored request.
function Approvals() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["action-approvals"],
    queryFn: () => approvalsApi.list(),
    refetchInterval: 15000,
  });

  const act = async (id: string, kind: "approve" | "deny") => {
    setActingId(id);
    try {
      await (kind === "approve" ? approvalsApi.approve(id) : approvalsApi.deny(id));
      await queryClient.invalidateQueries({ queryKey: ["action-approvals"] });
    } finally {
      setActingId(null);
    }
  };

  if (query.isError) {
    return (
      <SectionError
        breadcrumb="Approval Queue"
        kicker="Governance"
        title="Approval Queue"
        message="Could not load the approval queue from the backend."
      />
    );
  }
  if (query.isLoading || !query.data) {
    return (
      <SectionLoading breadcrumb="Approval Queue" kicker="Governance" title="Approval Queue" />
    );
  }

  const pending = query.data.pending;
  const decided = query.data.decided;
  const approvedThisWeek = decided.filter((a) => a.status === "approved").length;
  const rejectedThisWeek = decided.filter((a) => a.status === "denied").length;
  const oldest = pending.length
    ? pending.reduce((o, a) => (new Date(a.createdAt) < new Date(o.createdAt) ? a : o))
    : null;

  return (
    <Shell breadcrumb="Approval Queue">
      <PageTitle kicker="Governance" title="Approval Queue" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Pending"
          value={String(query.data.pendingCount).padStart(2, "0")}
          note="AWAITING SIGN-OFF"
          emphasis
          delay={50}
        />
        <Stat
          label="Oldest item"
          value={oldest ? ageFrom(oldest.createdAt) : "—"}
          note={oldest ? `${oldest.method} ${oldest.path}` : "NOTHING PENDING"}
          delay={100}
        />
        <Stat
          label="Approved (loaded)"
          value={String(approvedThisWeek)}
          note="IN THIS LIST"
          delay={150}
        />
        <Stat
          label="Denied (loaded)"
          value={String(rejectedThisWeek)}
          note="IN THIS LIST"
          delay={200}
        />
      </div>

      <Panel title="Waiting on owner" meta={`${pending.length} QUEUED WRITES`} delay={250}>
        {pending.length === 0 ? (
          <div className="p-6 font-mono text-[12px] text-mute">Nothing waiting on approval.</div>
        ) : (
          <div className="divide-y divide-line">
            {pending.map((a: ApprovalEntry) => (
              <div key={a.id} className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <span className="rounded border border-accent/20 bg-accent/5 px-2 py-1 font-mono text-[10px] tracking-widest text-accent uppercase">
                    {a.method}
                  </span>
                  <div>
                    <div className="text-[14px] font-bold">{a.path}</div>
                    <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                      {a.id} // BY {a.requestedBy} ({a.requestedRole}) // {ageFrom(a.createdAt)}
                      {a.reason ? ` // ${a.reason}` : ""}
                    </div>
                  </div>
                </div>
                {session?.isOwner ? (
                  <div className="flex gap-2">
                    <button
                      disabled={actingId === a.id}
                      onClick={() => void act(a.id, "approve")}
                      className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actingId === a.id}
                      onClick={() => void act(a.id, "deny")}
                      className="h-9 rounded border border-line px-5 font-mono text-[11px] tracking-widest text-mute uppercase transition-all hover:bg-raise hover:text-foreground disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-[10px] tracking-widest text-dim uppercase">
                    Owner only
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </Shell>
  );
}
