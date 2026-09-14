import { PageTitle, Panel, Shell } from "./Shell";

/** Loading / error placeholder shown inside the Shell while a page's real backend data is
 *  in flight or failed -- keeps the dark/glow visual language instead of a blank screen. */
export function SectionLoading({
  breadcrumb,
  kicker,
  title,
}: {
  breadcrumb: string;
  kicker: string;
  title: string;
}) {
  return (
    <Shell breadcrumb={breadcrumb}>
      <PageTitle kicker={kicker} title={title} />
      <Panel title="Loading" meta="FETCHING FROM BACKEND">
        <div className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded bg-raise/60"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </Panel>
    </Shell>
  );
}

export function SectionError({
  breadcrumb,
  kicker,
  title,
  message,
}: {
  breadcrumb: string;
  kicker: string;
  title: string;
  message?: string;
}) {
  return (
    <Shell breadcrumb={breadcrumb}>
      <PageTitle kicker={kicker} title={title} />
      <Panel title="Failed to load" meta="BACKEND ERROR">
        <div className="p-6 font-mono text-[12px] text-accent">
          {message ||
            "Could not reach the admin API. Check that the backend is running and reachable."}
        </div>
      </Panel>
    </Shell>
  );
}
