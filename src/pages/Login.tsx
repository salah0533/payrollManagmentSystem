import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Clock3, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { getRoleHomePath } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = await login({ identifier, password });

      toast({
        title: "Signed in",
        description: "Your account is ready.",
      });

      if (user.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }

      navigate(from || getRoleHomePath(user), { replace: true });
    } catch (error) {
      toast({
        title: "Login failed",
        description: getErrorMessage(error, "Unable to sign in with those credentials."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))] p-4 text-foreground md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,hsl(var(--accent)/0.9),transparent_24rem),radial-gradient(circle_at_85%_18%,hsl(var(--warning)/0.24),transparent_20rem),linear-gradient(135deg,hsl(42_67%_97%),hsl(var(--background)))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-card/55 shadow-[0_30px_110px_-55px_hsl(var(--foreground)/0.85)] backdrop-blur-2xl md:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--sidebar-primary)/0.42),transparent_20rem),radial-gradient(circle_at_72%_72%,hsl(var(--warning)/0.28),transparent_18rem)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Payroll and workforce command center
            </div>
            <div className="mt-16 max-w-xl">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-white/60">PayRollPro</p>
              <h1 className="font-display text-6xl font-semibold leading-[0.98] tracking-tight">
                Run people, payroll, and time with calm precision.
              </h1>
              <p className="mt-6 text-lg leading-8 text-white/72">
                A role-aware workspace for admins, HR teams, and employees to keep operations visible, auditable, and moving.
              </p>
            </div>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-3">
            {[
              { label: "Secure roles", value: "3", icon: ShieldCheck },
              { label: "Live attendance", value: "24/7", icon: Clock3 },
              { label: "Payroll clarity", value: "100%", icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <item.icon className="mb-5 h-5 w-5 text-white/70" />
                <p className="font-display text-3xl font-semibold">{item.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
                PP
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary/70">PayRollPro</p>
              <h1 className="mt-3 font-display text-4xl font-semibold">Welcome back</h1>
            </div>

            <div className="rounded-[1.7rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_-46px_hsl(var(--foreground)/0.85)] backdrop-blur-xl md:p-8">
              <div className="mb-8">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary/70">Secure sign in</p>
                <h2 className="mt-3 font-display text-4xl font-semibold">Enter your workspace</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Access the admin, HR, or employee self-service interface using your backend account.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Username or email</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button className="h-12 w-full text-base" type="submit" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
