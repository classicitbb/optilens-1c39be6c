-- Feature Board flag for the homepage "Delivery to your island" section
-- (#shipping, <ShippingComparison /> in src/components/home/CustomerJourney.tsx).
-- Off by default: the section is hidden, and so are the links that point at it
-- (the "Shipping & total costs" quick-start shortcut and the "Plan costs &
-- delivery" card, which falls back to the freight & delivery policy page).

INSERT INTO public.website_features (key, label, description, enabled, notes) VALUES
  (
    'home_shipping_planner',
    'Homepage — delivery & total cost planner',
    'Shows the "Delivery to your island" section on the trade homepage (#shipping). It contains: (1) a destination field that pre-fills a pricing & shipping request in the assistant; (2) guidance on what to have ready and when an order will arrive (production, transit, customs and local delivery are separate steps); (3) a delivered-cost worksheet that compares a current supplier quote with a Classic Visions quote across products, freight, insurance, duties & taxes, and brokerage/local delivery, calculated in the browser only (nothing is sent or saved, no exchange rates or live shipping rates are used); and (4) FAQs on import charges, consolidation and delays. When on, the "Shipping & total costs" quick-start shortcut and the "Plan costs & delivery" card link to the section. When off, the section and that shortcut are hidden and the card links to the freight & delivery policy instead. Keep off until an approved country-by-country shipping schedule and wording are signed off.',
    false,
    NULL
  )
ON CONFLICT (key) DO NOTHING;
