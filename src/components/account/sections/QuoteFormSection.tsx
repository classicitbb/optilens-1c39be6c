import { FileSignature } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const QuoteFormSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <FileSignature className="h-5 w-5" />
        Quote Requests
      </CardTitle>
      <CardDescription>Submit and review quote requests from your account.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Quote request forms will be available here shortly.</p>
    </CardContent>
  </Card>
);

export default QuoteFormSection;
