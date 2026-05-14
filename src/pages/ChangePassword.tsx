import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword, currentUser, homePath, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser && !currentUser.must_change_password) {
      navigate(homePath, { replace: true });
    }
  }, [currentUser, homePath, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both new password fields match.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast({
        title: "Password changed",
        description: "You can now use the rest of the application.",
      });

      navigate(homePath, { replace: true });
    } catch (error) {
      toast({
        title: "Unable to change password",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4 md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,hsl(var(--accent)/0.9),transparent_24rem),radial-gradient(circle_at_82%_22%,hsl(var(--warning)/0.22),transparent_20rem),linear-gradient(135deg,hsl(42_67%_97%),hsl(var(--background)))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-card/55 shadow-[0_30px_110px_-55px_hsl(var(--foreground)/0.85)] backdrop-blur-2xl md:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-primary text-lg font-extrabold text-sidebar-primary-foreground">
              PP
            </div>
            <div className="mt-16">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-white/60">Security checkpoint</p>
              <h1 className="font-display text-5xl font-semibold leading-tight">A stronger password before the workday starts.</h1>
              <p className="mt-5 text-base leading-7 text-white/70">
                This protects payroll, attendance, employee records, and every role-aware workspace behind your account.
              </p>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <ShieldCheck className="mb-5 h-6 w-6 text-white/70" />
            <p className="font-display text-2xl font-semibold">Protected access</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Only authentication, password update, and logout actions are available until this is complete.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-xl bg-white/72">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-4xl">Change password</CardTitle>
                <CardDescription className="mt-3">
                  This account must update its password before accessing protected pages.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="rounded-2xl border-primary/20 bg-accent/45">
                <AlertTitle>Password update required</AlertTitle>
                <AlertDescription>
                  Until this is done, only auth/me, change-password, and logout-related actions are allowed.
                </AlertDescription>
              </Alert>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={visibleFields.current ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setVisibleFields((value) => ({ ...value, current: !value.current }))}
                      aria-label={visibleFields.current ? "Hide current password" : "Show current password"}
                    >
                      {visibleFields.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={visibleFields.next ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setVisibleFields((value) => ({ ...value, next: !value.next }))}
                      aria-label={visibleFields.next ? "Hide new password" : "Show new password"}
                    >
                      {visibleFields.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={visibleFields.confirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setVisibleFields((value) => ({ ...value, confirm: !value.confirm }))}
                      aria-label={visibleFields.confirm ? "Hide confirmation password" : "Show confirmation password"}
                    >
                      {visibleFields.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => logout()}>
                    Logout
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
