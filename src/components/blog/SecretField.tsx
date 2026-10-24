import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const SECRET_MASK = "••••••••";

/** Reader view of a `secret` inline node. The value is not in the DOM until it is revealed. */
const SecretField = ({ value }: { value: string }) => {
  const [shown, setShown] = useState(false);
  return (
    <span className="ws-secret">
      <span className="ws-secret-value">{shown ? value : SECRET_MASK}</span>
      <button
        type="button"
        className="ws-secret-eye"
        aria-label={shown ? "Hide secret" : "Show secret"}
        aria-pressed={shown}
        onClick={() => setShown((current) => !current)}
      >
        {shown ? <EyeOff width={14} height={14} aria-hidden /> : <Eye width={14} height={14} aria-hidden />}
      </button>
    </span>
  );
};

export default SecretField;
