import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, UserCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { APP_LANGUAGES, APP_LANGUAGE_LABELS } from "@/lib/i18n";
import { employeeApi } from "@/services/employeeApi";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

export default function Profile() {
  const { currentUser, updateLanguagePreference } = useAuth();
  const { t } = useTranslation();
  const employeeId = currentUser?.employee_id;
  const [selectedLanguage, setSelectedLanguage] = useState(currentUser?.language || "en");
  const [savingLanguage, setSavingLanguage] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["employee-profile", "self"],
    queryFn: () => employeeApi.getMyProfile(),
    enabled: Boolean(employeeId),
  });

  useEffect(() => {
    setSelectedLanguage(currentUser?.language || "en");
  }, [currentUser?.language]);

  const profile = profileQuery.data;

  const handleLanguageSave = async () => {
    setSavingLanguage(true);
    try {
      await updateLanguagePreference(selectedLanguage);
      toast({
        title: t("profile.saveLanguageSuccess"),
        description: t("profile.saveLanguageSuccessDescription"),
      });
    } catch (error) {
      toast({
        title: t("profile.saveLanguageError"),
        description: getErrorMessage(error, t("profile.saveLanguageErrorDescription")),
        variant: "destructive",
      });
    } finally {
      setSavingLanguage(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />

      {profile ? (
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.identity")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile.position || t("common.employee")}</p>
                  <div className="mt-2">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("profile.employeeId")}</p>
                  <p className="font-medium">{profile.id}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("profile.hireDate")}</p>
                  <p className="font-medium">{formatDate(profile.hire_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.contactAndWorkDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.email")}</p>
                  <p className="font-medium">{profile.email || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.phone")}</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("profile.vacationDays")}</p>
                  <p className="font-medium">{profile.vacation_days}</p>
                </div>
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {t("profile.attendanceRules")}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("profile.saveLanguage")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="profileLanguage">{t("profile.saveLanguageDescription")}</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger id="profileLanguage">
                    <SelectValue placeholder={t("common.language")} />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language}>
                        {APP_LANGUAGE_LABELS[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void handleLanguageSave()} disabled={savingLanguage || selectedLanguage === currentUser?.language}>
                {savingLanguage ? t("common.saving") : t("common.save")}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title={profileQuery.isLoading ? t("profile.loadingProfile") : t("profile.noLinkedProfile")}
          description={t("profile.noLinkedProfileDescription")}
        />
      )}
    </div>
  );
}
