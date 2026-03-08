import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useCreateHelpdeskTicketType, useUpdateHelpdeskTicketType, useDeleteHelpdeskTicketType,
  useCreateHelpdeskTicketTag, useDeleteHelpdeskTicketTag,
} from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";

interface TicketType { id: string; name: string; is_active: boolean; created_at: string; }
interface TicketTag { id: string; name: string; color: string; created_at: string; }

const HelpdeskConfigPage = () => {
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewConfig = canView("helpdesk");
  const canEditConfig = canEditFeature("helpdesk");

  const [typeName, setTypeName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");

  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ["helpdesk", "ticket-types"],
    enabled: canViewConfig,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name,is_active,created_at").order("name");
      if (error) throw error;
      return (data ?? []) as TicketType[];
    },
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["helpdesk", "ticket-tags"],
    enabled: canViewConfig,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_tags").select("id,name,color,created_at").order("name");
      if (error) throw error;
      return (data ?? []) as TicketTag[];
    },
  });

  const createType = useCreateHelpdeskTicketType();
  const updateType = useUpdateHelpdeskTicketType();
  const deleteType = useDeleteHelpdeskTicketType();
  const createTag = useCreateHelpdeskTicketTag();
  const deleteTag = useDeleteHelpdeskTicketTag();

  if (!canViewConfig) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk config.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Helpdesk Configuration" icon={Settings2} />

      {/* ── Ticket Types ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Types <Badge variant="outline">{types.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canEditConfig && (
            <div className="flex gap-2 items-end">
              <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Type name" className="h-8 text-xs w-64" />
              <Button size="sm" className="h-8 text-xs" disabled={createType.isPending || !typeName.trim()} onClick={() => { createType.mutate({ name: typeName.trim() }); setTypeName(""); }}>Add Type</Button>
            </div>
          )}
          {typesLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!typesLoading && types.length === 0 && <p className="text-xs text-muted-foreground">No ticket types configured.</p>}
          {!typesLoading && types.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Active</TableHead>
                  {isAdmin && <TableHead className="w-24">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>
                      {canEditConfig ? (
                        <Switch checked={t.is_active} onCheckedChange={(v) => updateType.mutate({ id: t.id, is_active: v })} />
                      ) : (t.is_active ? "Yes" : "No")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete type "{t.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteType.mutate(t.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Tags ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Tags <Badge variant="outline">{tags.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canEditConfig && (
            <div className="flex gap-2 items-end">
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name" className="h-8 text-xs w-52" />
              <input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer" />
              <Button size="sm" className="h-8 text-xs" disabled={createTag.isPending || !tagName.trim()} onClick={() => { createTag.mutate({ name: tagName.trim(), color: tagColor }); setTagName(""); }}>Add Tag</Button>
            </div>
          )}
          {tagsLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!tagsLoading && tags.length === 0 && <p className="text-xs text-muted-foreground">No ticket tags configured.</p>}
          {!tagsLoading && tags.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  {isAdmin && <TableHead className="w-24">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full inline-block" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs text-muted-foreground">{tag.color}</span>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete tag "{tag.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTag.mutate(tag.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskConfigPage;
