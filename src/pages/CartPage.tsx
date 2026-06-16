import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingCart, FileText, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SaveDraftDialog from "@/components/cart/SaveDraftDialog";
import { getStoreProductRoute, resolveStoreProductFromCartRef, useStoreProducts } from "@/hooks/useStoreProducts";
import { cn } from "@/lib/utils";

const CartPage = () => {
  const { items, totalPrice, totalItems, updateQuantity, removeFromCart, loading } = useCartContext();
  const { data: storeProducts = [] } = useStoreProducts();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [poNumber, setPoNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [saveDraftOpen, setSaveDraftOpen] = useState(false);

  const shippingEstimate = 28;
  const grandTotal = totalPrice + shippingEstimate;

  const getItemRoute = (item: (typeof items)[number]) => {
    const linked = resolveStoreProductFromCartRef(storeProducts, {
      product_id: item.product_id,
      product_type: item.product_type,
    });
    return linked ? getStoreProductRoute(linked) : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex min-h-[50vh] items-center justify-center pt-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 pt-24 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="font-serif text-2xl text-foreground">Your cart is empty</h1>
          <p className="text-muted-foreground">Add some products and come back.</p>
          <Button variant="outline" asChild className="mt-2">
            <Link to="/store">Browse products</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pb-16 pt-24 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-2xl text-foreground">
            Shopping Cart
            <span className="ml-2 font-sans text-base font-normal text-muted-foreground">
              ({totalItems} {totalItems === 1 ? "item" : "items"})
            </span>
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Save draft
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Cart table ── */}
          <div className="flex-1 space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Unit price
                    </th>
                    <th className="px-4 py-3 text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      Subtotal
                    </th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const route = getItemRoute(item);
                    const lineTotal = item.product_price * item.quantity;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {route ? (
                              <Link
                                to={route}
                                className="hover:text-secondary hover:underline"
                              >
                                {item.product_name}
                              </Link>
                            ) : (
                              item.product_name
                            )}
                          </div>
                          {item.variant_label && (
                            <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                              <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                              {item.variant_label}
                            </div>
                          )}
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            {item.product_type === "supply" ? "per unit" : "per pair"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-foreground">
                            ${item.product_price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Decrease quantity of ${item.product_name}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center font-mono text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Increase quantity of ${item.product_name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            ${lineTotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Remove ${item.product_name} from cart`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PO # + notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="po-number" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  Purchase Order #
                </Label>
                <Input
                  id="po-number"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-XXXXX"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-notes" className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  Order notes
                </Label>
                <textarea
                  id="order-notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Delivery instructions, special requirements…"
                  rows={3}
                  className={cn(
                    "w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── Order summary sidebar ── */}
          <aside className="w-full space-y-4 rounded-lg border border-border bg-card p-5 lg:w-72 lg:sticky lg:top-28">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              Order summary
            </h2>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-foreground">
                    {item.product_name}
                    <span className="ml-1 text-muted-foreground">× {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-foreground">
                    ${(item.product_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-mono text-muted-foreground/70">TBD at checkout</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-foreground">Estimated total</span>
              <span className="font-mono text-lg font-bold text-foreground">
                ${totalPrice.toFixed(2)}
                <span className="ml-1 font-mono text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
                  USD
                </span>
              </span>
            </div>

            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => navigate("/checkout", { state: { poNumber, orderNotes } })}
            >
              Proceed to checkout
            </Button>

            <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" asChild>
              <Link to="/store">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Keep shopping
              </Link>
            </Button>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
