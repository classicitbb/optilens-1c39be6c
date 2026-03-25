import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "invalid" | "done" | "already" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("done");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Validating…</p>
            </div>
          )}
          {status === "valid" && (
            <>
              <p className="text-foreground">
                Click below to unsubscribe from transactional emails.
              </p>
              <Button onClick={handleUnsubscribe} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "done" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-10 w-10 text-success" />
              <p className="text-foreground font-medium">You've been unsubscribed.</p>
              <p className="text-sm text-muted-foreground">You won't receive further emails from us.</p>
            </div>
          )}
          {status === "already" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-foreground">You're already unsubscribed.</p>
            </div>
          )}
          {(status === "invalid" || status === "error") && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-foreground">
                {status === "invalid"
                  ? "This unsubscribe link is invalid or has expired."
                  : "Something went wrong. Please try again later."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
