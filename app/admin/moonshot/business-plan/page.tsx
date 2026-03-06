"use client";

import { Printer } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "../lib/store";
import { BusinessPlan } from "../lib/types";

export default function BusinessPlanPage() {
  const { businessPlan, updateBusinessPlan } = useMoonshotStore();
  const dirtyRef = useRef(false);

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
    const coreValues = values.futureFocus.coreValues.map((cv, idx) => `<li>${idx + 1}. ${cv}</li>`).join("");
    return `
      <html>
      <head><title>Moonshot Business Plan</title><style>body{font-family:Arial;padding:24px}h1,h2{margin:0 0 12px}section{margin-bottom:20px}ul{padding-left:16px}</style></head>
      <body>
        <h1>Moonshot Business Plan</h1>
        <section><h2>Future Focus</h2>
          <h3>Core Values</h3><ul>${coreValues}</ul>
          <h3>BHAG</h3><p>${values.futureFocus.bhag}</p>
          <h3>3-Year Vision</h3><p>Revenue: ${values.futureFocus.threeYearVision.revenue} · MRR: ${values.futureFocus.threeYearVision.mrr} · NRR: ${values.futureFocus.threeYearVision.nrr} · Gross Margin: ${values.futureFocus.threeYearVision.grossMargin} · Customers: ${values.futureFocus.threeYearVision.customers}</p>
          <h3>Marketing Strategy</h3><p><strong>Target Market:</strong> ${values.futureFocus.marketingStrategy.targetMarket}</p><p><strong>Differentiators:</strong> ${values.futureFocus.marketingStrategy.differentiators}</p>
          <p><strong>Core Focus:</strong> ${values.futureFocus.coreFocus}</p>
          <p><strong>Coaches:</strong> ${values.futureFocus.coachesAndAdvisors}</p>
        </section>
        <section><h2>Short-term Focus</h2>
          <p><strong>1-Year Plan:</strong> ${values.shortTermFocus.oneYearPlan}</p>
          <p><strong>Quarterly Goals:</strong> ${values.shortTermFocus.quarterlyGoals}</p>
          <p><strong>Key Initiatives:</strong> ${values.shortTermFocus.keyInitiatives}</p>
          <p><strong>Obstacles:</strong> ${values.shortTermFocus.obstacles}</p>
          <p><strong>Rocks Summary:</strong> ${values.shortTermFocus.rocksSummary}</p>
          <p><strong>Notes:</strong> ${values.shortTermFocus.notes}</p>
        </section>
      </body>
      </html>`;
  }, [values]);

  const openPrint = () => {
    const win = window.open("", "_blank", "width=980,height=800");
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Card className="rounded-xl border bg-white">
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
                <div
                  className="min-h-32 rounded-md border p-3 prose prose-sm max-w-none"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => form.setValue("futureFocus.richNotes", (e.target as HTMLDivElement).innerHTML)}
                  dangerouslySetInnerHTML={{ __html: values.futureFocus.richNotes }}
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
