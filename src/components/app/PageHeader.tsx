import { useTranslation } from "react-i18next";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-[0_18px_60px_-42px_hsl(var(--foreground)/0.8)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-accent/70 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary/70">{t("pageHeader.workspace")}</p>
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-description text-sm md:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
