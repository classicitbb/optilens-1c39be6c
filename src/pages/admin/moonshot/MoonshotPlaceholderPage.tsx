export default function MoonshotPlaceholderPage({ title = "Coming soon" }: { title?: string }) {
  return <div className="rounded-lg border bg-card p-6 text-muted-foreground">{title}.</div>;
}
