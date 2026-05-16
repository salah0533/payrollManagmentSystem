import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

export default function Forbidden() {
  const { homePath } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("forbidden.title")}</CardTitle>
          <CardDescription>
            {t("forbidden.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to={homePath}>{t("forbidden.returnHome")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">{t("forbidden.goToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
