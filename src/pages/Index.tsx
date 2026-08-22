import HomeVersionA from "@/components/home-prototypes/HomeVersionA";
import HomeVersionB from "@/components/home-prototypes/HomeVersionB";
import { useHomeVersion } from "@/components/home-prototypes/homeVersionStore";

/**
 * Homepage entry point.
 *
 * Defaults to Version A (the live homepage) for every visitor.
 * Admins can preview Version B from the account dropdown; the choice is
 * stored per-browser and never affects other users.
 */
const Index = () => {
  const version = useHomeVersion();


  return version === "b" ? <HomeVersionB /> : <HomeVersionA />;
};

export default Index;
