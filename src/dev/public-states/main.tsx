import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Button } from "@/components/ui/button";
import { PublicState } from "@/components/public-states/PublicState";
import { LoadingState } from "@/components/public-states/LoadingState";
import { RequestField } from "@/components/public-states/RequestField";
import PublicSearchPanel from "@/components/PublicSearchPanel";
import RetailerDirectory from "@/components/retailers/RetailerDirectory";
import { CompanionAssistantContext, type CompanionAssistantContextValue } from "@/features/assistant/CompanionAssistantContext.shared";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@/index.css";

const scenarios = ["Empty", "Loading", "Error", "No internet", "Slow network", "No search results", "Permission denied", "Session expired", "Form validation", "Success"];

function Gallery() {
  const [selected, setSelected] = useState("Empty");
  const [journey, setJourney] = useState("State examples");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dark, setDark] = useState(false);
  const demo = () => setMessage("Preview only. No request was sent and no account was changed.");
  const action = (label: string) => <Button type="button" className="min-h-11" onClick={demo}>{label}</Button>;
  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
            <span className="text-lg font-semibold">Classic Visions</span>
            <Button variant="outline" onClick={() => setDark(!dark)}>{dark ? "Light theme" : "Dark theme"}</Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">A clear next step, in every state.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Public website feedback for Classic Visions. Try the ten examples, search real page content, or filter the retailer directory.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Local design preview. Account, session and success examples are simulations; this page sends no requests to our team.</p>
          <div className="my-8 flex flex-wrap gap-2" aria-label="Preview surfaces">
            {["State examples", "Public search", "Retailer directory"].map((item) => <Button key={item} aria-pressed={journey === item} variant={journey === item ? "default" : "outline"} onClick={() => { setJourney(item); setMessage(""); }}>{item}</Button>)}
          </div>
          <CompanionAssistantContext.Provider value={{ openAssistant: demo } as unknown as CompanionAssistantContextValue}>
            {journey === "Public search" ? <div className="max-w-2xl"><PublicSearchPanel /></div> : journey === "Retailer directory" ? <RetailerDirectory /> : (
              <div className="grid items-start gap-6 md:grid-cols-[220px_1fr]">
                <nav aria-label="State examples" className="flex flex-wrap gap-2 md:flex-col">
                  {scenarios.map((scenario) => <Button key={scenario} className="justify-start" aria-pressed={selected === scenario} variant={selected === scenario ? "default" : "ghost"} onClick={() => { setSelected(scenario); setMessage(""); }}>{scenario}</Button>)}
                </nav>
                <div className="min-w-0 space-y-5">
                  <h2 className="text-xl font-semibold">{selected}</h2>
                  {selected === "Empty" ? <PublicState title="Your cart is ready for your first item" description="Browse stock lenses and supplies, then add the items you need.">{action("Browse supplies")}</PublicState> : null}
                  {selected === "Loading" ? <LoadingState label="Loading retailer listings" /> : null}
                  {selected === "Error" ? <PublicState tone="error" title="We couldn’t load your order status" description="Try again, or contact our team with your order reference.">{action("Try again")}{action("Contact our team")}</PublicState> : null}
                  {selected === "No internet" ? <PublicState tone="offline" title="You’re offline" description="You can still search the retailer listings already on this page. Reconnect to open websites or ask Iris.">{action("Browse loaded listings")}</PublicState> : null}
                  {selected === "Slow network" ? <LoadingState label="Waiting for page matches" slow /> : null}
                  {selected === "No search results" ? <PublicState tone="search" title="No matches for “varifcoal”" description="Try “progressive” or “coatings”, or browse the lens guide.">{action("Clear search")}{action("Explore lenses")}</PublicState> : null}
                  {selected === "Permission denied" ? <PublicState tone="permission" title="This page is for approved trade accounts" description="Sign in with your trade account. If you’re waiting for approval, our team can help.">{action("Sign in")}{action("Return to homepage")}</PublicState> : null}
                  {selected === "Session expired" ? <PublicState tone="permission" title="Sign in again to continue" description="After draft recovery is implemented and verified, this screen will explain which work was saved and restore your place. This example does not save a draft.">{action("Sign in to continue")}</PublicState> : null}
                  {selected === "Form validation" ? <form className="space-y-5 rounded-xl border border-border bg-card p-6" onSubmit={(event) => { event.preventDefault(); setSelected("Success"); }}>
                    <p className="text-sm leading-6 text-muted-foreground">Leave a field blank or enter an incomplete email, then try sending. This is a local demonstration.</p>
                    <RequestField label="Your name" value={name} autoComplete="name" onValueChange={setName} />
                    <RequestField label="Reply email" value={email} type="email" autoComplete="email" onValueChange={setEmail} />
                    <Button type="submit" className="min-h-11">Confirm & send example</Button>
                  </form> : null}
                  {selected === "Success" ? <PublicState tone="success" title="Example request received" description="This is a simulated confirmation. On the website, this state appears after the server confirms the request.">{action("Ask another question")}{action("Find a retailer")}</PublicState> : null}
                  <p className="text-sm leading-6 text-muted-foreground">Shared components use the website’s existing theme, field labels, keyboard focus and reduced-motion preference.</p>
                </div>
              </div>
            )}
          </CompanionAssistantContext.Provider>
          <p role="status" className="mt-6 text-sm text-muted-foreground">{message}</p>
        </main>
      </div>
    </div>
  );
}

if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<BrowserRouter><Gallery /></BrowserRouter>);
