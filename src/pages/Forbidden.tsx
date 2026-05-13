import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

export default function Forbidden() {
  const { homePath } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">403 Forbidden</CardTitle>
          <CardDescription>
            This page is outside the permissions granted to your current account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to={homePath}>Return to your home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">Go to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
