import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckoutDialog, type CheckoutFormData } from "@/components/CheckoutDialog";
import { useCartContext } from "@/contexts/CartContext";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartContext();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const [checkoutOpen, setCheckoutOpen] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=%2Fcheckout", { replace: true });
      return;
    }

    // Don't redirect after a successful order — let the dialog show confirmation
    if (!orderPlaced && items.length === 0) {
      navigate("/store", { replace: true });
    }
  }, [items.length, navigate, user, orderPlaced]);

  const handleCheckout = async (details: CheckoutFormData): Promise<boolean> => {
    const order = await createOrder(items, totalPrice, details);
    if (order) {
      await clearCart();
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 pb-16 pt-28">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          <p className="text-muted-foreground">
            Complete your order details on this dedicated checkout route. If the checkout form closes,
            you can reopen it below without losing cart context.
          </p>
          <Button variant="outline" onClick={() => setCheckoutOpen(true)}>
            Open Checkout
          </Button>
        </div>
      </main>
      <Footer />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            navigate("/store");
          }
        }}
        items={items}
        totalPrice={totalPrice}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default CheckoutPage;
