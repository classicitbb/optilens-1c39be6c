import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotNewMeetingPage() {
  const navigate = useNavigate();
  const { addMeeting } = useMoonshotStore();

  return (
    <Card>
      <CardHeader><CardTitle>New Meeting</CardTitle></CardHeader>
      <CardContent>
        <Button onClick={() => {
          addMeeting({ title: "New Meeting", owner: "Classic", date: format(new Date(), "yyyy-MM-dd"), status: "Draft", notes: "", frequency: "weekly", duration: 90, attendeeIds: ["u1", "u2"] });
          navigate("/admin/moonshot/meetings");
        }}>
          Create Draft Meeting
        </Button>
      </CardContent>
    </Card>
  );
}
