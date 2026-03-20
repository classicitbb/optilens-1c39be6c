import { format } from "date-fns";
import { Clock, Package, ShoppingBag } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const MyOrdersSection = () => {
  const { orders, loading } = useOrders();
  const { canAccessFeature } = usePortalIdentity();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Order History</h2>
        <p className="text-sm text-muted-foreground">View your past orders and track their status.</p>
        {!canAccessFeature("private-orders") ? (
          <p className="text-sm text-muted-foreground">Private/manual sales orders unlock after your customer account is approved.</p>
        ) : null}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="py-12">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">No orders yet</h3>
            <p className="text-muted-foreground">When you complete a purchase, your orders will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order, index) => (
            <Card key={order.id} className="animate-fade-in opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(order.createdAt), "PPP 'at' p")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <span className="text-xl font-bold text-foreground">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="items" className="border-none">
                    <AccordionTrigger className="py-2 text-sm hover:no-underline">
                      View {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items?.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default MyOrdersSection;
