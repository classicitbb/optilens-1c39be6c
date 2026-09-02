import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

/**
 * Legacy unsubscribe route. Unsubscribe handling is now managed for us: every
 * email carries its own hosted unsubscribe link in the footer, so this page
 * only explains where to find it for anyone landing on an old link.
 */
export default function Unsubscribe() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Mail className="h-8 w-8 text-muted-foreground" />
            <p className="text-foreground">
              To stop receiving emails from Classic Visions, use the unsubscribe link at the
              bottom of any email we&apos;ve sent you.
            </p>
            <p className="text-sm text-muted-foreground">
              Need help? Contact support @ classicvisions .net and we&apos;ll update your
              preferences for you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
