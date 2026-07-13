import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Glasses, Loader2, Save, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { recommendLenses, useSaveRxDraft } from "@/features/lens-assistant/api";
import type { EyePrescription, LensRecommendationInput, LensRecommendationResult } from "@/features/lens-assistant/types";
import { validateLensRecommendationInput } from "@/features/lens-assistant/validation";
import { useToast } from "@/hooks/use-toast";

const emptyEye = (): EyePrescription => ({ sphere: null, cylinder: null, axis: null, add: null, prism: null, prismBase: "" });

const numberOrNull = (value: string) => value === "" ? null : Number(value);

const SelectField = ({ id, label, value, onChange, options, error }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
      <option value="">Choose…</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
  </div>
);

const EyeFields = ({ label, prefix, eye, onChange, errors }: {
  label: string;
  prefix: "right" | "left";
  eye: EyePrescription;
  onChange: (patch: Partial<EyePrescription>) => void;
  errors: Record<string, string>;
}) => (
  <Card>
    <CardHeader className="pb-3"><CardTitle className="text-lg">{label}</CardTitle></CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-3">
      {[
        ["sphere", "Sphere", eye.sphere, "0.00"],
        ["cylinder", "Cylinder", eye.cylinder, "0.00"],
        ["axis", "Axis", eye.axis, "1–180"],
        ["add", "Add", eye.add, "Optional"],
        ["prism", "Prism", eye.prism, "Optional"],
      ].map(([key, fieldLabel, value, placeholder]) => (
        <div className="space-y-2" key={String(key)}>
          <Label htmlFor={`${prefix}-${key}`}>{fieldLabel}</Label>
          <Input
            id={`${prefix}-${key}`}
            inputMode="decimal"
            type="number"
            step={key === "axis" ? 1 : 0.25}
            value={value ?? ""}
            placeholder={String(placeholder)}
            onChange={(event) => onChange({ [String(key)]: numberOrNull(event.target.value) })}
          />
          {errors[`${prefix}.${key}`] ? <p className="text-xs text-destructive">{errors[`${prefix}.${key}`]}</p> : null}
        </div>
      ))}
      <SelectField
        id={`${prefix}-prism-base`}
        label="Prism base"
        value={eye.prismBase}
        onChange={(value) => onChange({ prismBase: value as EyePrescription["prismBase"] })}
        error={errors[`${prefix}.prismBase`]}
        options={[{ value: "up", label: "Up" }, { value: "down", label: "Down" }, { value: "in", label: "In" }, { value: "out", label: "Out" }]}
      />
    </CardContent>
  </Card>
);

const LensAssistantPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialAudience = searchParams.get("audience") === "patient" ? "patient" : "professional";
  const [input, setInput] = useState<LensRecommendationInput>({
    audience: initialAudience,
    patientReference: "",
    ageBand: "",
    occupation: "",
    primaryUse: "",
    visualPriority: "",
    frameType: "",
    frameA: null,
    frameB: null,
    frameDbl: null,
    priceLevel: "",
    lightPreference: "",
    adaptationIssues: false,
    right: emptyEye(),
    left: emptyEye(),
  });
  const [result, setResult] = useState<LensRecommendationResult | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const saveDraft = useSaveRxDraft();
  const validation = useMemo(() => validateLensRecommendationInput(input), [input]);

  const update = <K extends keyof LensRecommendationInput>(key: K, value: LensRecommendationInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setResult(null);
  };

  const runRecommendation = async () => {
    setShowValidation(true);
    if (!validation.isValid) {
      toast({ title: "Check the highlighted fields", description: "The assistant needs complete, internally consistent information.", variant: "destructive" });
      return;
    }
    setIsRecommending(true);
    try {
      setResult(await recommendLenses(input));
    } catch (error: any) {
      toast({ title: "Recommendation unavailable", description: error?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setIsRecommending(false);
    }
  };

  const saveAndOpen = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }
    if (!result || result.status !== "ok") return;
    const draft = await saveDraft.mutateAsync({
      name: input.patientReference.trim() ? `Rx — ${input.patientReference.trim()}` : `Rx draft — ${new Date().toLocaleDateString()}`,
      status: "ready_for_lablink",
      input,
      recommendation: result,
    });
    navigate(`/rx-order?draft=${draft.id}`);
  };

  const fieldErrors = showValidation ? validation.errors : {};

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Controlled Lens Selection Assistant | Classic Visions" description="Enter prescription, frame and lifestyle details to see approved Classic Visions catalogue options." canonicalPath="/lens-assistant" />
      <Header />
      <main id="main-content" className="pt-[68px] sm:pt-[72px]">
        <section className="border-b bg-[linear-gradient(135deg,#0b1e35,#0d5363)] text-white">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Controlled recommendations</Badge>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Find a suitable lens without guessing.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">
              Product eligibility, prescription ranges and prices come from approved Classic Visions data. AI does not invent them.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{input.audience === "patient" ? "Educational guidance only" : "Final lab review still applies"}</AlertTitle>
            <AlertDescription>
              {input.audience === "patient"
                ? "This tool explains lens choices and helps you find a retailer. It does not diagnose eye disease or replace an eye examination."
                : "The result is a controlled ordering aid. Prism, unusual powers and frame constraints still require confirmation by the lab."}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader><CardTitle>About the wearer and frame</CardTitle><CardDescription>These answers help rank only products that remain eligible for the prescription.</CardDescription></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField id="audience" label="Journey" value={input.audience} onChange={(value) => update("audience", value as LensRecommendationInput["audience"])} options={[{ value: "professional", label: "Optical professional" }, { value: "patient", label: "Patient / visitor" }]} />
              <div className="space-y-2"><Label htmlFor="patient-reference">Patient or draft reference</Label><Input id="patient-reference" value={input.patientReference} onChange={(event) => update("patientReference", event.target.value)} placeholder="Optional internal reference" /></div>
              <SelectField id="age-band" label="Age range" value={input.ageBand} onChange={(value) => update("ageBand", value as LensRecommendationInput["ageBand"])} error={fieldErrors.ageBand} options={[{ value: "under-18", label: "Under 18" }, { value: "18-39", label: "18–39" }, { value: "40-59", label: "40–59" }, { value: "60-plus", label: "60+" }]} />
              <div className="space-y-2"><Label htmlFor="occupation">Occupation</Label><Input id="occupation" value={input.occupation} onChange={(event) => update("occupation", event.target.value)} placeholder="e.g. driver, teacher, office work" /></div>
              <SelectField id="primary-use" label="Main visual use" value={input.primaryUse} onChange={(value) => update("primaryUse", value as LensRecommendationInput["primaryUse"])} error={fieldErrors.primaryUse} options={[{ value: "general", label: "General wear" }, { value: "driving", label: "Driving" }, { value: "computer", label: "Computer / desk" }, { value: "outdoor", label: "Outdoor" }, { value: "reading", label: "Reading / near" }]} />
              <div className="space-y-2"><Label htmlFor="visual-priority">Main visual problem or priority</Label><Input id="visual-priority" value={input.visualPriority} onChange={(event) => update("visualPriority", event.target.value)} placeholder="Comfort, adaptation, glare…" /></div>
              <SelectField id="frame-type" label="Frame type" value={input.frameType} onChange={(value) => update("frameType", value as LensRecommendationInput["frameType"])} error={fieldErrors.frameType} options={[{ value: "full-rim", label: "Full rim" }, { value: "semi-rimless", label: "Semi-rimless" }, { value: "rimless", label: "Rimless" }, { value: "sports", label: "Sports / wrap" }]} />
              <SelectField id="price-level" label="Preferred price level" value={input.priceLevel} onChange={(value) => update("priceLevel", value as LensRecommendationInput["priceLevel"])} error={fieldErrors.priceLevel} options={[{ value: "good", label: "Good" }, { value: "better", label: "Better" }, { value: "best", label: "Best" }]} />
              <SelectField id="light" label="Light / tint preference" value={input.lightPreference} onChange={(value) => update("lightPreference", value as LensRecommendationInput["lightPreference"])} error={fieldErrors.lightPreference} options={[{ value: "clear", label: "Clear" }, { value: "photochromic", label: "Photochromic" }, { value: "polarized", label: "Polarized" }, { value: "tinted", label: "Tinted" }]} />
              {[["frameA", "Frame A (mm)", input.frameA], ["frameB", "Frame B (mm)", input.frameB], ["frameDbl", "DBL (mm)", input.frameDbl]].map(([key, label, value]) => <div key={String(key)} className="space-y-2"><Label htmlFor={String(key)}>{label}</Label><Input id={String(key)} type="number" inputMode="decimal" value={value ?? ""} onChange={(event) => update(key as "frameA", numberOrNull(event.target.value))} />{fieldErrors[String(key)] ? <p className="text-xs text-destructive">{fieldErrors[String(key)]}</p> : null}</div>)}
              <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={input.adaptationIssues} onChange={(event) => update("adaptationIssues", event.target.checked)} /> Previous progressive adaptation difficulty</label>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <EyeFields label="Right eye (OD)" prefix="right" eye={input.right} errors={fieldErrors} onChange={(patch) => update("right", { ...input.right, ...patch })} />
            <EyeFields label="Left eye (OS)" prefix="left" eye={input.left} errors={fieldErrors} onChange={(patch) => update("left", { ...input.left, ...patch })} />
          </div>

          {validation.warnings.length ? <Alert className="border-amber-300 bg-amber-50/70"><TriangleAlert className="h-4 w-4 text-amber-700" /><AlertTitle>Confirm before ordering</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-5">{validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></AlertDescription></Alert> : null}

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => void runRecommendation()} disabled={isRecommending}>
              {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Find approved options
            </Button>
            <Button size="lg" variant="outline" asChild><Link to={input.audience === "patient" ? "/find-a-retailer" : "/rx-order"}>Skip to {input.audience === "patient" ? "retailer finder" : "LabLink"}</Link></Button>
          </div>

          {result ? (
            <section aria-live="polite" className="space-y-5">
              <div><h2 className="text-2xl font-bold">Recommendation result</h2><p className="mt-1 text-muted-foreground">{result.message}</p></div>
              {result.status !== "ok" ? <Alert><ShieldAlert className="h-4 w-4" /><AlertTitle>No automatic recommendation was produced</AlertTitle><AlertDescription>{result.status === "rules_unavailable" ? "Recommendations stay disabled until Classic Visions reviews and publishes the controlled rule set." : "Use technical support for a manual review. The assistant will not force an unsuitable match."}</AlertDescription></Alert> : null}
              <div className="grid gap-5 lg:grid-cols-3">
                {result.recommendations.map((option) => (
                  <Card key={`${option.tier}-${option.productId}`} className={option.tier === "best" ? "border-primary shadow-medium" : undefined}>
                    <CardHeader><Badge className="w-fit capitalize">{option.tier}</Badge><CardTitle>{option.productName}</CardTitle><CardDescription>{[option.lensType, option.material, option.index ? `Index ${option.index}` : null].filter(Boolean).join(" · ")}</CardDescription></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div><span className="text-muted-foreground">Coating / treatment</span><p className="font-medium">{option.coating || "Confirm with the lab"}</p></div>
                      <div><span className="text-muted-foreground">Account price</span><p className="text-xl font-bold">{option.priceBbd != null ? `BBD $${Number(option.priceBbd).toFixed(2)}` : option.priceStatus === "sign_in_required" ? "Sign in to view" : "Not assigned"}</p></div>
                      <div><span className="text-muted-foreground">Turnaround</span><p className="font-medium">{option.turnaround}</p></div>
                      <ul className="space-y-2">{option.reasons.map((reason) => <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{reason}</li>)}</ul>
                      {option.warnings.length ? <ul className="space-y-2 text-amber-800">{option.warnings.map((warning) => <li key={warning} className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{warning}</li>)}</ul> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {result.status === "ok" && input.audience === "professional" ? (
                <Button size="lg" onClick={() => void saveAndOpen()} disabled={saveDraft.isPending}>
                  {saveDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {user ? "Save draft and open LabLink" : "Sign in to save this Rx"}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LensAssistantPage;
