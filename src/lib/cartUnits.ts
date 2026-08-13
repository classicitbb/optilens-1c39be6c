export type CartProductType = "lens" | "supply" | "addon";
export type CartPriceUnit = "each" | "pair" | "job" | "service" | "unit";

type CartMetadata = Record<string, unknown> | null | undefined;

export interface CartAddition {
  price: number;
  quantity?: number;
  productType: CartProductType;
  priceUnit?: CartPriceUnit;
  variantMetadata?: Record<string, unknown>;
}

const toWholeQuantity = (value: number | undefined) => Math.max(1, Math.floor(value ?? 1));
const toMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * Store lens prices are maintained as pair prices, but a cart line represents
 * individual lenses. Keeping the conversion at the cart boundary makes the
 * displayed unit price, quantity, subtotal, and checkout payload agree.
 */
export const normalizeCartAddition = <T extends CartAddition>(item: T) => {
  const quantity = toWholeQuantity(item.quantity);
  const metadata = { ...(item.variantMetadata ?? {}) };

  if (item.priceUnit === "pair") {
    return {
      ...item,
      price: toMoney(item.price / 2),
      quantity: quantity * 2,
      variantMetadata: { ...metadata, cart_unit: "each", source_price_unit: "pair" },
    };
  }

  if (item.priceUnit) {
    return {
      ...item,
      quantity,
      variantMetadata: { ...metadata, cart_unit: item.priceUnit },
    };
  }

  return { ...item, quantity, variantMetadata: metadata };
};

export const getCartItemUnit = (productType: CartProductType, metadata: CartMetadata): CartPriceUnit => {
  const storedUnit = metadata?.cart_unit;
  if (storedUnit === "each" || storedUnit === "pair" || storedUnit === "job" || storedUnit === "service" || storedUnit === "unit") {
    return storedUnit;
  }

  if (productType === "supply") return "unit";
  if (productType === "addon") return "service";
  return "pair";
};
