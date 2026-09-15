import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NAV_GROUPS } from "@/lib/cms-data";
import { useAuth } from "@/lib/useAuth";
import { LoginGate } from "./LoginGate";

const ROLE_LABEL: Record<number, string> = {
  1: "Admin",
  2: "Guide",
  6: "Member",
  8: "Mod",
  9: "Sr Mod",
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function Sidebar({ approvalsPending }: { approvalsPending: number }) {
  const { session, logout } = useAuth();
  const username = session?.username ?? "";
  const roleLabel = session?.isOwner ? "Owner" : ROLE_LABEL[session?.roleClass ?? 0] || "Staff";
  return (
    <aside className="sticky top-0 z-20 flex h-screen w-[260px] shrink-0 flex-col border-r border-line bg-panel/80 backdrop-blur-xl">
      <div className="relative flex h-16 items-center gap-3 overflow-hidden border-b border-line px-6">
        <div className="glow-spot absolute inset-0 opacity-50" />
        <img
          src="/brand/1320-legends-logo.png"
          alt="1320 Legends"
          className="relative z-10 h-8 w-auto shrink-0"
        />
        <div className="relative z-10 leading-tight">
          <div className="font-heading text-[15px] font-bold tracking-tight uppercase">
            1320 Legends
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-accent/80 uppercase">
            Private Admin
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6 text-[13px]">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-2 pt-6 pb-2 font-mono text-[10px] tracking-[0.2em] text-dim/60 uppercase first:pt-0">
              {group.title}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex items-center justify-between rounded-md px-3 py-2 text-mute transition-colors hover:bg-raise hover:text-foreground"
                activeProps={{
                  className:
                    "flex items-center justify-between rounded-md px-3 py-2 bg-accent/10 text-accent ring-1 ring-accent/20",
                }}
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <span
                        className={
                          isActive
                            ? "size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                            : "size-1.5 rounded-full bg-dim/40"
                        }
                      />
                      {item.label}
                    </span>
                    {item.label === "Approval Queue" ? (
                      approvalsPending > 0 && (
                        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] leading-none text-accent">
                          {approvalsPending}
                        </span>
                      )
                    ) : item.badge ? (
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] leading-none text-accent">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] opacity-60">{item.code}</span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line bg-background/50 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-raise/50 p-3">
          <div className="grid size-9 place-items-center rounded border border-line2 bg-accent/15 font-mono text-[11px] font-bold text-accent">
            {username ? initials(username) : "--"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] font-semibold">{username || "Not signed in"}</div>
            <div className="font-mono text-[10px] text-accent/70 uppercase">{roleLabel}</div>
          </div>
          <button
            onClick={() => void logout()}
            title="Sign out"
            className="rounded border border-line px-2 py-1 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
          >
            Out
          </button>
        </div>
      </div>
    </aside>
  );
}

function ShellChrome({ breadcrumb, children }: { breadcrumb: string; children: ReactNode }) {
  const { pendingCount } = useAuth();
  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <Sidebar approvalsPending={pendingCount} />

      <main className="relative min-w-0 flex-1">
        <div className="glow-spot pointer-events-none fixed top-0 right-0 -mt-48 -mr-48 h-[600px] w-[600px] opacity-20" />

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-background/80 px-10 backdrop-blur-md">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest text-dim">
            <span className="flex items-center gap-2 text-mute">
              <span className="size-1.5 animate-pulse rounded-full bg-[#9cff35]" />
              ADMIN CONSOLE
            </span>
            <span className="text-line2">/</span>
            <span className="text-foreground">{breadcrumb.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              placeholder="SEARCH"
              className="h-9 w-72 rounded border border-line bg-raise pr-3 pl-4 font-mono text-[11px] tracking-wider text-foreground uppercase transition-all outline-none placeholder:text-dim/50 focus:border-accent/40"
            />
            <button className="h-9 rounded border border-line px-5 font-mono text-[11px] tracking-widest text-mute transition-all hover:bg-raise hover:text-foreground">
              FILTERS
            </button>
            <button className="h-9 rounded bg-accent px-6 text-[11px] font-bold tracking-widest text-accent-foreground shadow-[var(--shadow-ember)] transition-all hover:brightness-125">
              NEW RECORD
            </button>
          </div>
        </header>

        <div className="relative z-10 max-w-[1400px] px-10 py-10">{children}</div>
      </main>
    </div>
  );
}

export function Shell({ breadcrumb, children }: { breadcrumb: string; children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
          Loading session...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginGate />;
  }

  return <ShellChrome breadcrumb={breadcrumb}>{children}</ShellChrome>;
}

export function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="rise mb-12 flex items-end justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px w-8 bg-accent" />
          <div className="font-mono text-[11px] font-bold tracking-[0.4em] text-accent uppercase">
            {kicker}
          </div>
        </div>
        <h1 className="font-heading text-[42px] leading-none font-extrabold tracking-tighter text-balance uppercase">
          {title}
        </h1>
      </div>
      <div className="rounded-lg border border-line bg-panel p-4 text-right">
        <div className="mb-1 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
          Session
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="text-[13px] font-bold">SESSION ACTIVE</span>
          <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
        </div>
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  note,
  bar,
  emphasis,
  delay = 0,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  bar?: number;
  emphasis?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={
        emphasis
          ? "rise rounded-xl border border-accent/20 bg-panel p-6 shadow-[0_0_30px_oklch(0.664_0.222_32/0.05)]"
          : "rise group rounded-xl border border-line bg-panel/50 p-6 shadow-[var(--shadow-panel)] transition-all hover:border-accent/30"
      }
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={
          emphasis
            ? "font-mono text-[10px] tracking-[0.2em] text-accent uppercase"
            : "font-mono text-[10px] tracking-[0.2em] text-dim uppercase"
        }
      >
        {label}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span
          className={
            emphasis
              ? "text-[40px] leading-none font-extrabold tracking-tighter text-accent"
              : "text-[40px] leading-none font-extrabold tracking-tighter transition-colors group-hover:text-accent"
          }
        >
          {value}
        </span>
        {unit ? <span className="font-mono text-[12px] text-mute">{unit}</span> : null}
      </div>
      {bar !== undefined ? (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent shadow-[0_0_8px_var(--accent)]"
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : null}
      {note ? <div className="mt-4 font-mono text-[11px] text-mute">{note}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`rise overflow-hidden rounded-xl border border-line bg-panel/40 backdrop-blur-sm ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between border-b border-line bg-raise/30 px-6 py-5">
        <div className="flex items-center gap-4">
          <h2 className="font-heading text-[16px] font-bold tracking-tight uppercase">{title}</h2>
          {meta ? (
            <>
              <div className="h-4 w-px bg-line" />
              <span className="font-mono text-[11px] tracking-widest text-dim">{meta}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-mute">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          AUTO-REFRESH ENABLED
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const live = status.toLowerCase() === "deployed" || status.toLowerCase() === "live";
  return (
    <span
      className={
        live
          ? "inline-flex items-center gap-2 rounded-full border border-line bg-raise2/50 px-3 py-1 text-[10px] font-bold tracking-widest text-mute uppercase"
          : "inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-widest text-accent uppercase"
      }
    >
      <span className={live ? "size-1 rounded-full bg-dim" : "size-1 rounded-full bg-accent"} />
      {status}
    </span>
  );
}

export function Field({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
        {label}
      </label>
      <input
        defaultValue={value}
        className={`h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50 ${
          mono ? "font-mono" : "font-bold"
        } ${accent ? "text-accent" : ""}`}
      />
    </div>
  );
}
