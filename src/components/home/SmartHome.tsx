import { FormEvent, useCallback, useState } from "react";
import { ArrowRight, Clock3, Glasses, MapPin, Sparkles, Store, UserRound } from "lucide-react";
import { Link } from "react-router";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import {
  getSmartHomeActions,
  HOME_AUDIENCE_STORAGE_KEY,
  type HomeAudience,
  type SmartHomeAction,
} from "@/features/home/smartHomeActions";
import { cn } from "@/lib/utils";

const readAudiencePreference = (): HomeAudience => {
  if (typeof window === "undefined") return "professional";
  return window.localStorage.getItem(HOME_AUDIENCE_STORAGE_KEY) === "patient" ? "patient" : "professional";
};

const actionDestination = (action: SmartHomeAction, signedIn: boolean) => {
  if (!action.href) return null;
  if (action.requiresSignIn && !signedIn) {
    return `/auth?redirect=${encodeURIComponent(action.href)}`;
  }
  return action.href;
};

const SmartHome = () => {
  const { user } = useAuth();
  const { openAssistant } = useCompanionAssistant();
  const [audience, setAudience] = useState<HomeAudience>(readAudiencePreference);
  const [question, setQuestion] = useState("");
  const actions = getSmartHomeActions(audience);

  const selectAudience = useCallback((next: HomeAudience) => {
    setAudience(next);
    window.localStorage.setItem(HOME_AUDIENCE_STORAGE_KEY, next);
  }, []);

  const askClassic = (event: FormEvent) => {
    event.preventDefault();
    const query = question.trim();
    openAssistant({
      query: query || (audience === "professional" ? "Help me with my next Classic Visions task." : "Help me understand my lens choices."),
      autoSubmit: true,
      profile: audience === "patient" ? "customer_support" : "general_search",
    });
    setQuestion("");
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#0b2b52]">
      <Header />
      <div className="border-b border-white/10 bg-[linear-gradient(105deg,#0b2b52_0%,#193a54_45%,#e7a21d_100%)] pt-[68px] text-white sm:pt-[72px]">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3 text-sm sm:text-base">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12"><UserRound className="h-5 w-5" /></span>
            <span>Order, track, learn and get help—all in one place.</span>
          </div>
          <Button asChild className="shrink-0 bg-[#0ea5b7] text-white hover:bg-[#0b8fa0]">
            <Link to={user ? "/profile" : "/auth?redirect=/profile"}>Customer Portal</Link>
          </Button>
        </div>
      </div>

      <main id="main-content" className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_33%_42%,rgba(231,162,29,0.12),transparent_34%),radial-gradient(circle_at_78%_68%,rgba(14,165,183,0.09),transparent_28%)]" />
        <section className="relative mx-auto grid max-w-[1420px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.96fr_1.04fr] lg:gap-16 lg:py-16 xl:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-[#c68517]">Welcome to Classic Visions</p>
            <h1 className="max-w-2xl text-[clamp(2.8rem,6vw,5.25rem)] font-extrabold leading-[1.02] tracking-[-0.055em] text-[#0b2b52]">
              What would you like to do today?
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#48627e] sm:text-xl">
              {audience === "professional"
                ? "Order lenses, check a job, find the right product, or get expert help."
                : "Understand your lens options and connect with a participating optical retailer."}
            </p>

            <form onSubmit={askClassic} className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_20px_55px_rgba(11,43,82,0.10)]">
              <Sparkles className="ml-2 h-6 w-6 shrink-0 text-[#d99517]" aria-hidden="true" />
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                aria-label="Ask Classic anything"
                placeholder="Ask Classic anything…"
                className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="icon" aria-label="Ask Classic" className="h-12 w-12 shrink-0 rounded-full bg-[#0b2b52] text-white hover:bg-[#123c6c]">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-sm font-semibold">I am:</span>
              <div className="inline-flex w-fit rounded-xl border border-slate-300 bg-white p-1" role="group" aria-label="Choose your website journey">
                <button
                  type="button"
                  aria-pressed={audience === "professional"}
                  onClick={() => selectAudience("professional")}
                  className={cn("inline-flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition", audience === "professional" ? "bg-[#0b2b52] text-white shadow" : "text-[#274563] hover:bg-slate-50")}
                >
                  <Glasses className="h-5 w-5" /> Optical professional
                </button>
                <button
                  type="button"
                  aria-pressed={audience === "patient"}
                  onClick={() => selectAudience("patient")}
                  className={cn("inline-flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition", audience === "patient" ? "bg-[#0b2b52] text-white shadow" : "text-[#274563] hover:bg-slate-50")}
                >
                  <UserRound className="h-5 w-5" /> Patient or visitor
                </button>
              </div>
            </div>
          </div>

          <div className="grid content-center gap-4 sm:grid-cols-2">
            {actions.slice(0, 6).map((action) => {
              const Icon = action.icon;
              const destination = actionDestination(action, Boolean(user));
              const content = (
                <>
                  <Icon className="h-10 w-10 text-[#0b2b52]" strokeWidth={1.7} aria-hidden="true" />
                  <div className="mt-6">
                    <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#0b2b52] sm:text-2xl">{action.title}</h2>
                    <p className="mt-2 leading-6 text-[#5a718b]">{action.description}</p>
                  </div>
                </>
              );
              const className = cn(
                "group min-h-48 rounded-2xl border p-7 text-left shadow-[0_18px_50px_rgba(11,43,82,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(11,43,82,0.13)] focus-visible:outline-none",
                action.featured ? "border-[#dfa42e] bg-[linear-gradient(145deg,#f4c65f,#efb53a)]" : action.id === "account" ? "border-sky-100 bg-[linear-gradient(145deg,#fff,#e9f5ff)]" : "border-slate-200 bg-white/95",
              );

              if (action.assistantQuery) {
                return (
                  <button key={action.id} type="button" className={className} onClick={() => openAssistant({ query: action.assistantQuery, autoSubmit: true, profile: audience === "patient" ? "customer_support" : "general_search" })}>
                    {content}
                  </button>
                );
              }
              return <Link key={action.id} to={destination ?? "/"} className={className}>{content}</Link>;
            })}
          </div>

          <div className="lg:col-span-2">
            {actions[6] ? (
              <Link to={actions[6].href ?? "/find-a-retailer"} className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition hover:border-[#0ea5b7]/50 hover:shadow-md">
                <span className="flex items-center gap-3"><MapPin className="h-6 w-6 text-[#0ea5b7]" /><span><strong className="block">{actions[6].title}</strong><span className="text-sm text-[#5a718b]">{actions[6].description}</span></span></span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </section>

        <section className="relative border-t border-slate-200 bg-white/75" aria-label="Classic Visions service facts">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 text-sm font-semibold sm:grid-cols-3 sm:px-8">
            <div className="flex items-center justify-center gap-3"><Store className="h-6 w-6 text-[#c68517]" /> Trusted by Caribbean optical retailers</div>
            <div className="flex items-center justify-center gap-3 sm:border-x sm:border-slate-200"><Clock3 className="h-6 w-6 text-[#c68517]" /> Turnaround shown only when confirmed</div>
            <div className="flex items-center justify-center gap-3"><MapPin className="h-6 w-6 text-[#c68517]" /> Serving the Caribbean</div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SmartHome;
