import { BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AssignedPricelistsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <BadgeDollarSign className="h-5 w-5" />
        Assigned Pricelists
      </CardTitle>
      <CardDescription>Review the pricelists assigned to your account.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Assigned pricelist details will be shown here soon.</p>
    </CardContent>
  </Card>
);

export default AssignedPricelistsSection;
