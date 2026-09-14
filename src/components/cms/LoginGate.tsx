import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/useAuth";

export function LoginGate() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      // error is surfaced via useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="glow-spot pointer-events-none fixed top-0 right-0 -mt-48 -mr-48 h-[600px] w-[600px] opacity-20" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-xl border border-line bg-panel/60 p-8 shadow-[var(--shadow-panel)] backdrop-blur-sm"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded bg-accent font-mono text-[13px] leading-none font-bold text-accent-foreground shadow-[var(--shadow-ember)]">
            1320
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-bold tracking-tight">1320 LEGENDS</div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-accent/80 uppercase">
              Stage II Console
            </div>
          </div>
        </div>

        <div className="mb-4 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
          Staff Sign-In
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Username
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] font-bold outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] font-bold outline-none transition-all focus:border-accent/50"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-accent/30 bg-accent/10 px-4 py-3 font-mono text-[11px] text-accent">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="mt-6 h-11 w-full rounded bg-accent text-[12px] font-bold tracking-[0.2em] text-accent-foreground uppercase shadow-[var(--shadow-ember)] transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-6 font-mono text-[10px] leading-relaxed tracking-tighter text-dim/70 uppercase">
          Staff and owner accounts only. Access is gated by the game's account roles.
        </div>
      </form>
    </div>
  );
}
