import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotAuthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(210 20% 97%)" }}>
      <div className="text-center space-y-4">
        <ShieldX className="mx-auto h-16 w-16" style={{ color: "hsl(0 72% 51%)" }} />
        <h1 className="text-xl font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Not Authorized</h1>
        <p className="text-sm" style={{ color: "hsl(215 15% 50%)" }}>
          You don't have permission to access the pricing tool.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotAuthorized;
