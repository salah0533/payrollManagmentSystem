export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-primary/25 bg-card/55 px-6 py-10 text-center shadow-inner shadow-white/50">
      <div className="mx-auto mb-4 h-2 w-16 rounded-full bg-gradient-to-r from-primary via-accent to-warning" />
      <p className="font-display text-lg font-semibold">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
