import { BookUser } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AddressBookSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <BookUser className="h-5 w-5" />
        Address Book
      </CardTitle>
      <CardDescription>Manage shipping and billing addresses for quick checkout.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Address management tools are coming soon.</p>
    </CardContent>
  </Card>
);

export default AddressBookSection;
