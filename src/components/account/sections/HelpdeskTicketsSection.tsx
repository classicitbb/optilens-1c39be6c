import { LifeBuoy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HelpdeskTicketsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <LifeBuoy className="h-5 w-5" />
        Helpdesk Tickets
      </CardTitle>
      <CardDescription>Track support issues and follow ticket updates.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Your helpdesk ticket feed will appear here.</p>
    </CardContent>
  </Card>
);

export default HelpdeskTicketsSection;
