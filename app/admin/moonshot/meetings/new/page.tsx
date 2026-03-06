"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "../../lib/store";

export default function NewMeetingPage() {
  const router = useRouter();
  const { addMeeting } = useMoonshotStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            addMeeting({ title: "New Meeting", owner: "Classic", date: format(new Date(), "yyyy-MM-dd"), status: "Draft", notes: "", frequency: "weekly", duration: 90, attendeeIds: ["u1", "u2"] });
            router.push("/admin/moonshot/meetings");
          }}
        >
          Create Draft Meeting
        </Button>
      </CardContent>
    </Card>
  );
}
