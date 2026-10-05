import AtlasApp from "@/features/atlas/AtlasApp";
import { registerAtlasHostOnce } from "@/config/atlasHost";

// The host app tells Atlas its business-specific data once, before the first render.
registerAtlasHostOnce();

const AtlasRoute = () => <AtlasApp />;

export default AtlasRoute;
