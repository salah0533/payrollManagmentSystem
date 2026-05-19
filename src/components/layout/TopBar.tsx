import { Check, LogOut, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NavigationItem } from "@/components/layout/navigation";
import { MobileNav } from "./MobileNav";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { APP_LANGUAGES, APP_LANGUAGE_LABELS, normalizeAppLanguage } from "@/lib/i18n";
import { getPrimaryRole, getRoleLabelKey } from "@/lib/roles";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TopBarProps {
  sidebarCollapsed: boolean;
  items: NavigationItem[];
  brandLabel: string;
}

function firstLetter(label: string) {
  return label.trim().charAt(0).toUpperCase() || "U";
}

export function TopBar({ sidebarCollapsed, items, brandLabel }: TopBarProps) {
  const isMobile = useIsMobile();
  const { currentUser, homePath, logout, updateLanguagePreference } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const primaryRole = getPrimaryRole(currentUser);
  const displayName = currentUser?.employee?.full_name || currentUser?.username || "User";
  const activeLanguage = normalizeAppLanguage(currentUser?.language || i18n.resolvedLanguage);

  return (
    <header
      className={cn(
        "fixed top-0 z-30 flex h-16 items-center justify-between border-b border-white/60 bg-card/70 px-4 shadow-[0_18px_60px_-52px_hsl(var(--foreground)/0.8)] backdrop-blur-xl md:px-7",
        isMobile ? "left-0 right-0" : isRtl ? (sidebarCollapsed ? "right-16 left-0" : "right-64 left-0") : sidebarCollapsed ? "left-16 right-0" : "left-64 right-0",
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav items={items} brandLabel={brandLabel} />
        <div className="hidden sm:block">
          <p className="font-display text-base font-semibold text-foreground">{brandLabel}</p>
          <p className="text-xs font-medium text-muted-foreground">{t("layout.topbar.roleAware")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/50 p-1"
              aria-label={t("layout.topbar.myAccount")}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">{firstLetter(displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            dir={isRtl ? "rtl" : "ltr"}
            className={cn("w-64", isRtl ? "text-right" : "text-left")}
          >
            <DropdownMenuLabel className={cn(isRtl ? "text-right" : "text-left")}>
              <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                    {firstLetter(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{t(getRoleLabelKey(primaryRole))}</p>
                  {currentUser?.username && currentUser.username !== displayName ? (
                    <p className="truncate text-xs text-muted-foreground">@{currentUser.username}</p>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/change-password" className={cn("flex w-full items-center", isRtl ? "flex-row-reverse justify-end gap-2 text-right" : "gap-2")}>
                <KeyRound className="h-4 w-4" />
                {t("layout.topbar.changePassword")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={currentUser?.employee_id ? "/employee/profile" : homePath}
                className={cn("flex w-full items-center", isRtl ? "flex-row-reverse justify-end gap-2 text-right" : "gap-2")}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center text-xs font-semibold">
                  @
                </span>
                {currentUser?.employee_id ? t("layout.topbar.myProfile") : t("common.home")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className={cn(isRtl ? "text-right" : "text-left")}>{t("common.language")}</DropdownMenuLabel>
            {APP_LANGUAGES.map((language) => (
              <DropdownMenuItem
                key={language}
                className={cn(isRtl ? "flex-row-reverse justify-end gap-2 text-right" : "gap-2")}
                onClick={async () => {
                  try {
                    await updateLanguagePreference(language);
                    toast({
                      title: t("layout.topbar.languageUpdated"),
                      description: t("layout.topbar.languageUpdatedDescription"),
                    });
                  } catch (error) {
                    toast({
                      title: t("layout.topbar.languageUpdateError"),
                      description: getErrorMessage(error, t("layout.topbar.languageUpdateErrorDescription")),
                      variant: "destructive",
                    });
                  }
                }}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  {activeLanguage === language ? <Check className="h-4 w-4" /> : null}
                </span>
                {APP_LANGUAGE_LABELS[language]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={cn("text-destructive", isRtl ? "flex-row-reverse justify-end gap-2 text-right" : "gap-2")}
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
