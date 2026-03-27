import { Printer } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { BusinessPlan } from "@/features/admin/moonshot/lib/types";
import { sanitizeBusinessPlanRichNotes } from "@/lib/sanitizeRichTextHtml";

const escapeHtml = (value: string | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMultilineText = (value: string | undefined | null) =>
  escapeHtml(value).replaceAll("\n", "<br />");

export default function MoonshotBusinessPlanPage() {
  const { businessPlan, updateBusinessPlan } = useMoonshotStore();
  const dirtyRef = useRef(false);
  const richNotesRef = useRef<HTMLDivElement>(null);

  const form = useForm<BusinessPlan>({ defaultValues: businessPlan });
  const values = form.watch();

  useEffect(() => {
    form.reset(businessPlan);
  }, [businessPlan, form]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [values]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!dirtyRef.current) return;
      updateBusinessPlan(values);
      dirtyRef.current = false;
    }, 2000);
    return () => clearInterval(interval);
  }, [updateBusinessPlan, values]);

  const printHtml = useMemo(() => {
    const ff = values?.futureFocus;
    const st = values?.shortTermFocus;
    if (!ff || !st) return "";
    const coreValues = (ff.coreValues ?? []).map((cv, idx) => `<li>${idx + 1}. ${escapeHtml(cv)}</li>`).join("");
    return `
      <html>
      <head><title>Moonshot Business Plan</title><style>body{font-family:Arial;padding:24px}h1,h2{margin:0 0 12px}section{margin-bottom:20px}ul{padding-left:16px}</style></head>
      <body>
        <h1>Moonshot Business Plan</h1>
        <section><h2>Future Focus</h2>
          <h3>Core Values</h3><ul>${coreValues}</ul>
          <h3>BHAG</h3><p>${formatMultilineText(ff.bhag)}</p>
          <h3>3-Year Vision</h3><p>Revenue: ${escapeHtml(ff.threeYearVision?.revenue)} · MRR: ${escapeHtml(ff.threeYearVision?.mrr)} · NRR: ${escapeHtml(ff.threeYearVision?.nrr)} · Gross Margin: ${escapeHtml(ff.threeYearVision?.grossMargin)} · Customers: ${escapeHtml(ff.threeYearVision?.customers)}</p>
          <h3>Marketing Strategy</h3><p><strong>Target Market:</strong> ${formatMultilineText(ff.marketingStrategy?.targetMarket)}</p><p><strong>Differentiators:</strong> ${formatMultilineText(ff.marketingStrategy?.differentiators)}</p>
          <p><strong>Guarantee:</strong> ${formatMultilineText(ff.marketingStrategy?.guarantee)}</p>
          <p><strong>Process:</strong> ${formatMultilineText(ff.marketingStrategy?.process)}</p>
          <p><strong>Core Focus:</strong> ${formatMultilineText(ff.coreFocus)}</p>
          <p><strong>Coaches:</strong> ${formatMultilineText(ff.coachesAndAdvisors)}</p>
          <p><strong>Rich Notes:</strong> ${formatMultilineText(ff.richNotes)}</p>
        </section>
        <section><h2>Short-term Focus</h2>
          <p><strong>1-Year Plan:</strong> ${formatMultilineText(st.oneYearPlan)}</p>
          <p><strong>Quarterly Goals:</strong> ${formatMultilineText(st.quarterlyGoals)}</p>
          <p><strong>Key Initiatives:</strong> ${formatMultilineText(st.keyInitiatives)}</p>
          <p><strong>Obstacles:</strong> ${formatMultilineText(st.obstacles)}</p>
          <p><strong>Rocks Summary:</strong> ${formatMultilineText(st.rocksSummary)}</p>
          <p><strong>Notes:</strong> ${formatMultilineText(st.notes)}</p>
        </section>
      </body>
      </html>`;
  }, [values]);

  const safeRichNotes = useMemo(
    () => sanitizeBusinessPlanRichNotes(values.futureFocus?.richNotes ?? ""),
    [values.futureFocus?.richNotes],
  );

  useEffect(() => {
    if (!richNotesRef.current || richNotesRef.current.innerHTML === safeRichNotes) {
      return;
    }
    richNotesRef.current.innerHTML = safeRichNotes;
  }, [safeRichNotes]);

  const openPrint = () => {
    const win = window.open("", "_blank", "width=980,height=800");
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    win.print();
  };

  if (!values?.futureFocus || !values?.shortTermFocus) {
    return <Card className="rounded-xl border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Loading business plan…</CardContent></Card>;
  }

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Business Plan Editor</CardTitle>
        <Button variant="outline" onClick={openPrint}><Printer className="h-4 w-4 mr-2" />Printable Version</Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <Tabs defaultValue="future" className="space-y-4">
            <TabsList>
              <TabsTrigger value="future">Future Focus</TabsTrigger>
              <TabsTrigger value="short">Short-term Focus</TabsTrigger>
            </TabsList>

            <TabsContent value="future" className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold text-lg">Core Values</h3>
                {[0, 1, 2, 3].map((idx) => (
                  <FormField key={idx} control={form.control} name={`futureFocus.coreValues.${idx}`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{idx + 1}.</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </section>

              <FormField control={form.control} name="futureFocus.bhag" render={({ field }) => (
                <FormItem><FormLabel>BHAG</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>
              )} />

              <section className="space-y-3">
                <h3 className="font-semibold text-lg">3-Year Vision</h3>
                <div className="grid gap-3 md:grid-cols-5">
                  <FormField control={form.control} name="futureFocus.threeYearVision.revenue" render={({ field }) => (<FormItem><FormLabel>Revenue</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="futureFocus.threeYearVision.mrr" render={({ field }) => (<FormItem><FormLabel>MRR</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="futureFocus.threeYearVision.nrr" render={({ field }) => (<FormItem><FormLabel>NRR</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="futureFocus.threeYearVision.grossMargin" render={({ field }) => (<FormItem><FormLabel>Gross Margin</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="futureFocus.threeYearVision.customers" render={({ field }) => (<FormItem><FormLabel>Customers</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-lg">Marketing Strategy</h3>
                <FormField control={form.control} name="futureFocus.marketingStrategy.targetMarket" render={({ field }) => (<FormItem><FormLabel>Target Market</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="futureFocus.marketingStrategy.differentiators" render={({ field }) => (<FormItem><FormLabel>Differentiators</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="futureFocus.marketingStrategy.guarantee" render={({ field }) => (<FormItem><FormLabel>Guarantee</FormLabel><FormControl><Textarea {...field} className="min-h-16" /></FormControl></FormItem>)} />
                <FormField control={form.control} name="futureFocus.marketingStrategy.process" render={({ field }) => (<FormItem><FormLabel>Process</FormLabel><FormControl><Textarea {...field} className="min-h-16" /></FormControl></FormItem>)} />
              </section>

              <FormField control={form.control} name="futureFocus.coreFocus" render={({ field }) => (<FormItem><FormLabel>Core Focus</FormLabel><FormControl><Textarea {...field} className="min-h-16" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="futureFocus.coachesAndAdvisors" render={({ field }) => (<FormItem><FormLabel>Coaches & Advisors</FormLabel><FormControl><Textarea {...field} className="min-h-16" /></FormControl></FormItem>)} />

              <section className="space-y-2">
                <FormLabel>Rich Notes</FormLabel>
                <FormField
                  control={form.control}
                  name="futureFocus.richNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          className="min-h-32"
                          placeholder="Add notes in plain text."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </section>
            </TabsContent>

            <TabsContent value="short" className="space-y-3">
              <FormField control={form.control} name="shortTermFocus.oneYearPlan" render={({ field }) => (<FormItem><FormLabel>1-Year Plan</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="shortTermFocus.quarterlyGoals" render={({ field }) => (<FormItem><FormLabel>Quarterly Goals</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="shortTermFocus.keyInitiatives" render={({ field }) => (<FormItem><FormLabel>Key Initiatives</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="shortTermFocus.obstacles" render={({ field }) => (<FormItem><FormLabel>Obstacles</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="shortTermFocus.rocksSummary" render={({ field }) => (<FormItem><FormLabel>Rocks Summary</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
              <FormField control={form.control} name="shortTermFocus.notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} className="min-h-20" /></FormControl></FormItem>)} />
            </TabsContent>
          </Tabs>
        </Form>
      </CardContent>
    </Card>
  );
}
