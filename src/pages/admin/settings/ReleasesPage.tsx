import { getCurrentRelease } from "@/config/releaseManifest";
import releaseNotesRaw from "../../../../docs/release-notes.md?raw";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const IMPACT_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
};

const WHAT_CHANGED_SECTIONS = [
  {
    id: "what-changed-pricing",
    title: "Pricing",
    route: "/admin/pricing/catalog",
    note: "Catalog, compare tooling, and matrix/rules behavior updates.",
  },
  {
    id: "what-changed-quotes",
    title: "Quotes",
    route: "/admin/sales/quotations",
    note: "Quote lifecycle, pricing/GP calculations, print/export changes.",
  },
  {
    id: "what-changed-store-orders",
    title: "Store & Orders",
    route: "/admin/website/store",
    note: "Website product visibility, media, inventory/order surface updates.",
  },
  {
    id: "what-changed-permissions",
    title: "Permissions",
    route: "/admin/settings/roles",
    note: "Role boundaries, module access defaults, authorization hardening.",
  },
] as const;

const getLatestReleaseNotes = () => {
  const lines = releaseNotesRaw.split("\n");
  const startIndex = lines.findIndex((line) => line.startsWith("## "));
  if (startIndex < 0) return [] as string[];

  const bullets: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) bullets.push(line.slice(2).trim());
  }

  return bullets;
};

const getBugFixSummaries = (releaseNotes: string[]) => {
  const summaries = releaseNotes.filter((entry) => /fix|bug|regression|hardening|fallback|error/i.test(entry));
  return summaries.length > 0 ? summaries : ["No explicit bug-fix summary bullets were tagged in the latest release notes entry."];
};

export default function ReleasesPage() {
  const release = getCurrentRelease();
  const latestReleaseNotes = getLatestReleaseNotes();
  const bugFixSummaries = getBugFixSummaries(latestReleaseNotes);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">System Releases</h1>
        <p className="text-sm text-muted-foreground">
          Operational release dashboard sourced from canonical manifest metadata and the latest release ledger entry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Current release v{release.semanticVersion}
            <Badge variant="outline">{release.environment}</Badge>
            {release.hasBreakingChanges ? <Badge variant="destructive">Breaking change</Badge> : <Badge variant="secondary">No breaking change</Badge>}
          </CardTitle>
          <CardDescription>
            Released at {new Date(release.releaseDateTimeUtc).toLocaleString()} ({release.releaseDateTimeUtc})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h2 className="font-medium mb-2">Environment & build metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Badge variant="outline">Environment: {release.environment}</Badge>
              <Badge variant="outline">Version: {release.semanticVersion}</Badge>
              <Badge variant="outline">Release UTC: {release.releaseDateTimeUtc}</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="font-medium mb-2">Release summary</h2>
            <ul className="list-disc ml-5 space-y-1">
              {release.releaseSummary.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h2 className="font-medium mb-2">Migration</h2>
            <div className="space-y-2">
              {release.migrationNotes.map((note) => (
                <div key={note} className="rounded border p-2 bg-muted/30">{note}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Module impact</CardTitle>
            <CardDescription>Impact chips by module in the current release manifest.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {release.moduleImpact.map((entry) => (
              <div key={`${entry.module}-${entry.notes}`} className="rounded border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs">{entry.module}</code>
                  <Badge variant={IMPACT_TONE[entry.impact]}>{entry.impact} impact</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{entry.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest release notes</CardTitle>
            <CardDescription>Most recent "Release Notes" bullets from the release ledger feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-disc ml-5 space-y-1">
              {latestReleaseNotes.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">Bug-fix summary</h3>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                {bugFixSummaries.map((entry) => <li key={entry}>{entry}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What changed?</CardTitle>
          <CardDescription>Context links for high-impact admin modules.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {WHAT_CHANGED_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">{section.note}</p>
                </div>
                <Link to={section.route} className="text-xs underline underline-offset-2">Open module</Link>
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
