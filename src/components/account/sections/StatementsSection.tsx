import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StatementsSection = () => {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Statements</h2>
        <p className="text-sm text-muted-foreground">View and download your account statements.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is currently in development. You will be able to view and download your statements here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check back soon for access to your account statements.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

export default StatementsSection;
