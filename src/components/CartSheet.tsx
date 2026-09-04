import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, Tag, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/contexts/CartContext";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router";
import { getStoreProductRoute, resolveStoreProductFromCartRef, useStoreProducts } from "@/hooks/useStoreProducts";
import QuantityInput from "@/components/cart/QuantityInput";
import StorageImage from "@/components/StorageImage";
import { getCartItemUnit } from "@/lib/cartUnits";

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
  const { items, loading, totalItems, totalPrice, updateQuantity, removeFromCart } =
    useCartContext();
  const { data: storeProducts = [] } = useStoreProducts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  const resolveCartItemProduct = (item: (typeof items)[number]) => {
    return resolveStoreProductFromCartRef(storeProducts, {
      product_id: item.product_id,
      product_type: item.product_type,
    });
  };

  const resolveCartItemLink = (item: (typeof items)[number]) => {
    const linkedProduct = resolveCartItemProduct(item);
    return linkedProduct ? getStoreProductRoute(linkedProduct) : null;
  };

  // When the cart is empty, the button navigates to the store instead of opening an empty sheet.
  const emptyCartButton = (
    <Button
      variant={triggerVariant}
      size={triggerSize}
      className={cn("gap-1.5", showLabel && "px-4", className)}
      aria-label="Go to shop"
      asChild
    >
      <Link to="/store">
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {showLabel ? <span className="hidden sm:inline">Shop</span> : <span className="sr-only">Shop</span>}
      </Link>
    </Button>
  );

  return (
    <>
      {totalItems === 0 && !loading ? (
        emptyCartButton
      ) : (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant={triggerVariant}
              size={triggerSize}
              className={cn("gap-1.5 px-2", showLabel && "px-4", className)}
              aria-label={`Open cart with ${totalItems} item${totalItems === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {showLabel ? <span className="hidden sm:inline">Cart</span> : <span className="sr-only">Open cart</span>}
              {totalItems > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold leading-none text-accent-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col sm:max-w-lg">
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="flex items-center gap-2 text-foreground font-semibold">
                <ShoppingCart className="h-5 w-5 text-secondary" />
                Shopping Cart
                <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </SheetTitle>
            </SheetHeader>

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 stroke-[1.5] text-muted-foreground/50" />
                <p className="font-medium text-foreground">Your cart is empty</p>
                <Button variant="outline" size="sm" asChild onClick={() => setSheetOpen(false)}>
                  <Link to="/store">Explore products</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-3">
                    {items.map((item) => {
                      const linkedProduct = resolveCartItemProduct(item);
                      const itemLink = linkedProduct ? getStoreProductRoute(linkedProduct) : null;
                      const unit = getCartItemUnit(item.product_type, item.variant_metadata);

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-soft transition-colors hover:border-border"
                        >
                          {/* Thumbnail */}
                          <div className="h-14 w-14 shrink-0 rounded-md border border-border bg-muted/20 overflow-hidden flex items-center justify-center">
                            {linkedProduct?.image_url ? (
                              <StorageImage
                                src={linkedProduct.image_url}
                                alt={item.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            {itemLink ? (
                              <h4 className="font-medium text-sm text-foreground truncate">
                                <Link
                                  to={itemLink}
                                  className="hover:text-secondary transition-colors"
                                  onClick={() => setSheetOpen(false)}
                                >
                                  {item.product_name}
                                </Link>
                              </h4>
                            ) : (
                              <h4 className="font-medium text-sm text-foreground truncate">{item.product_name}</h4>
                            )}

                            {item.variant_label && (
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-mono text-muted-foreground truncate">
                                <Tag className="h-3 w-3 shrink-0 text-secondary" aria-hidden="true" />
                                <span className="truncate">{item.variant_label}</span>
                              </div>
                            )}

                            <p className="mt-1 text-xs text-muted-foreground font-mono">
                              ${item.product_price.toFixed(2)}
                              <span className="text-[10px] text-muted-foreground/70"> / {unit}</span>
                            </p>

                            {/* Quantity and Actions bar */}
                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  aria-label={`Decrease quantity of ${item.product_name}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <QuantityInput
                                  quantity={item.quantity}
                                  onCommit={(q) => updateQuantity(item.id, q)}
                                  className="font-medium text-xs h-7 w-10 text-center"
                                  aria-label={`Quantity for ${item.product_name}`}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  aria-label={`Increase quantity of ${item.product_name}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-foreground font-mono">
                                  ${(item.product_price * item.quantity).toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeFromCart(item.id)}
                                  aria-label={`Remove ${item.product_name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto border-t border-border/80 pt-3 space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium text-foreground">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated shipping</span>
                      <span className="font-mono text-muted-foreground/70">Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-foreground text-sm">Estimated Total</span>
                    <span className="text-lg font-bold text-foreground font-mono">
                      ${totalPrice.toFixed(2)}{" "}
                      <span className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                        USD
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full shadow-medium"
                      onClick={() => {
                        setSheetOpen(false);
                        navigate("/checkout");
                      }}
                    >
                      Proceed to Checkout
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link to="/cart" onClick={() => setSheetOpen(false)}>
                        View full cart &amp; add PO #
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

