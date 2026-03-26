import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/contexts/CartContext";
import { useOrders } from "@/hooks/useOrders";
import { Separator } from "@/components/ui/separator";
import { CheckoutDialog, CheckoutFormData } from "@/components/CheckoutDialog";
import { Link } from "react-router-dom";
import { getStoreProductRoute, resolveStoreProductFromCartRef, useStoreProducts } from "@/hooks/useStoreProducts";

interface CartSheetProps {
  className?: string;
  triggerVariant?: "outline" | "hero" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export const CartSheet = ({
  className,
  triggerVariant = "outline",
  triggerSize = "icon",
  showLabel = false,
}: CartSheetProps) => {
  const { items, loading, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } =
    useCartContext();
  const { createOrder } = useOrders();
  const { data: storeProducts = [] } = useStoreProducts();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCheckout = async (details: CheckoutFormData): Promise<boolean> => {
    const order = await createOrder(items, totalPrice, details);
    if (order) {
      await clearCart();
      return true;
    }
    return false;
  };

  const handleCheckoutComplete = () => {
    setCheckoutOpen(false);
    setSheetOpen(false);
  };

  const resolveCartItemLink = (item: (typeof items)[number]) => {
    const linkedProduct = resolveStoreProductFromCartRef(storeProducts, {
      product_id: item.product_id,
      product_type: item.product_type,
    });

    return linkedProduct ? getStoreProductRoute(linkedProduct) : null;
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={cn("relative", showLabel && "gap-2 px-4", className)}
          aria-label={totalItems > 0 ? `Open cart with ${totalItems} item${totalItems === 1 ? "" : "s"}` : "Open cart"}
        >
          <ShoppingCart className="h-5 w-5" />
          {showLabel ? <span className="hidden sm:inline">Cart</span> : null}
          {totalItems > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCart className="h-12 w-12" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const itemLink = resolveCartItemLink(item);
                  return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border bg-card p-3"
                  >
                    <div className="flex-1">
                      {itemLink ? (
                        <h4 className="font-medium text-foreground">
                          <Link to={itemLink} className="hover:text-primary hover:underline" onClick={() => setSheetOpen(false)}>
                            {item.product_name}
                          </Link>
                        </h4>
                      ) : (
                        <h4 className="font-medium text-foreground">{item.product_name}</h4>
                      )}
                      <p className="text-sm text-muted-foreground">
                        ${item.product_price.toFixed(2)}{item.product_type === "supply" ? "/unit" : "/pair"} <span className="text-[10px] font-semibold uppercase">USD</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto border-t pt-4">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span>
                      ${(item.product_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)} <span className="text-[10px] font-semibold uppercase text-muted-foreground">USD</span></span>
              </div>
              <Button
                variant="hero"
                className="mt-4 w-full"
                onClick={() => setCheckoutOpen(true)}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            handleCheckoutComplete();
          }
        }}
        items={items}
        totalPrice={totalPrice}
        onCheckout={handleCheckout}
      />
    </>
  );
};
