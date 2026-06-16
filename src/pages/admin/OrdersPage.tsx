import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminOrders, type AdminOrderRow } from "@/hooks/useAdminOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Clock, Loader2, Package, Search } from "lucide-react";
import { format } from "date-fns";
import OrderDetailDialog from "@/components/admin/OrderDetailDialog";

// ── helpers ────────────────────────────────────────────────────────────────

const CHECKOUT_METHOD_LABELS: Record<string, string> = {
  on_account: "On Account",
  stripe_offline: "Stripe (offline)",
  firstpay_offline: "1stPay (offline)",
  bimpay_offline: "BimPay (offline)",
  saved_demo_card: "Demo Card",
  new_demo_card: "Demo Card",
  google_pay: "Google Pay",
  manual_review: "Manual Review",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  pending:         "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
  confirmed:       "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  processing:      "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  shipped:         "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400",
  completed:       "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
  cancelled:       "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
  draft:           "bg-muted text-muted-foreground",
};

const statusLabel = (status: string) =>
  status === "pending_payment"
    ? "Pending Payment"
    : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

const formatProvider = (method: string) => CHECKOUT_METHOD_LABELS[method] ?? method;

// ── OrdersTable ────────────────────────────────────────────────────────────

interface OrdersTableProps {
  orders: AdminOrderRow[];
  onApprove?: (order: AdminOrderRow) => void;
  onView?: (order: AdminOrderRow) => void;
  showApprove?: boolean;
}

const OrdersTable = ({ orders, onApprove, showApprove }: OrdersTableProps) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">No orders found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Date</TableHead>
          {showApprove && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-mono text-xs font-medium">
              #{order.id.slice(0, 8).toUpperCase()}
            </TableCell>
            <TableCell>
              <p className="font-medium text-foreground leading-tight">
                {order.customerName ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{order.contactEmail ?? ""}</p>
            </TableCell>
            <TableCell>
              <span className="text-sm">{formatProvider(order.checkoutMethod)}</span>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}
              >
                {statusLabel(order.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              ${order.totalAmount.toFixed(2)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {format(new Date(order.createdAt), "dd MMM yyyy")}
            </TableCell>
            {showApprove && (
              <TableCell>
                {order.status === "pending_payment" && onApprove && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/40 text-green-600 hover:bg-green-500/10 hover:text-green-600"
                    onClick={() => onApprove(order)}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Approve
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// ── OrdersPage ─────────────────────────────────────────────────────────────

const OrdersPage = () => {
  const { orders, loading, fetchOrders, approvePayment } = useAdminOrders();
  const [search, setSearch] = useState("");
  const [confirmOrder, setConfirmOrder] = useState<AdminOrderRow | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.contactEmail ?? "").toLowerCase().includes(q)
    );
  });

  const pendingPayment = filtered.filter((o) => o.status === "pending_payment");
  const active = filtered.filter((o) =>
    ["pending", "confirmed", "processing", "shipped"].includes(o.status),
  );
  const completed = filtered.filter((o) =>
    ["completed", "cancelled"].includes(o.status),
  );

  const handleApprove = async () => {
    if (!confirmOrder) return;
    setApproving(true);
    await approvePayment(confirmOrder.id);
    setApproving(false);
    setConfirmOrder(null);
  };

  return (
    <>
      <AdminPageHeader icon={Package} title="Orders" />

      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or order ID…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="pending_payment">
          <TabsList className="mb-4">
            <TabsTrigger value="pending_payment" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending Payment
              {pendingPayment.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px] bg-amber-500 text-white border-0">
                  {pendingPayment.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="pending_payment">
            <OrdersTable
              orders={pendingPayment}
              onApprove={setConfirmOrder}
              showApprove
            />
          </TabsContent>

          <TabsContent value="active">
            <OrdersTable orders={active} />
          </TabsContent>

          <TabsContent value="completed">
            <OrdersTable orders={completed} />
          </TabsContent>

          <TabsContent value="all">
            <OrdersTable orders={filtered} onApprove={setConfirmOrder} showApprove />
          </TabsContent>
        </Tabs>
      )}

      {/* Approve confirmation dialog */}
      <AlertDialog open={!!confirmOrder} onOpenChange={(open) => !open && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will confirm order{" "}
              <span className="font-mono font-semibold">
                #{confirmOrder?.id.slice(0, 8).toUpperCase()}
              </span>{" "}
              for{" "}
              <strong>{confirmOrder?.customerName ?? confirmOrder?.contactEmail ?? "this customer"}</strong>
              . The order status will move to <strong>Confirmed</strong> and the payment will be marked as settled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving…
                </>
              ) : (
                "Approve Payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrdersPage;
