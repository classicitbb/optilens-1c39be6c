import HomePage from "@/components/home/HomePage";

/**
 * Homepage entry point.
 *
 * One page, two audiences: optical professionals see the full trade story by
 * default; patients and visitors switch to a focused view from the hero
 * (or arrive via `/?for=patients`). See `src/components/home/useHomeAudience.ts`.
 */
const Index = () => <HomePage />;

export default Index;
