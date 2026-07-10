import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleUserRound,
  ClipboardCheck,
  Glasses,
  Headphones,
  MapPin,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
} from "lucide-react";

export type HomeAudience = "professional" | "patient";

export interface SmartHomeAction {
  id: string;
  title: string;
  description: string;
  href?: string;
  assistantQuery?: string;
  icon: LucideIcon;
  featured?: boolean;
  requiresSignIn?: boolean;
}

export const HOME_AUDIENCE_STORAGE_KEY = "classicvisions.homeAudience.v1";

export const SMART_HOME_ACTIONS: Record<HomeAudience, SmartHomeAction[]> = {
  professional: [
    {
      id: "new-rx",
      title: "Place an Rx Order",
      description: "Get a controlled lens recommendation first",
      href: "/lens-assistant?mode=order&audience=professional",
      icon: ClipboardCheck,
      featured: true,
    },
    {
      id: "status",
      title: "Check Order Status",
      description: "View website orders or open LabLink tracking",
      href: "/profile/orders",
      icon: ClipboardCheck,
      requiresSignIn: true,
    },
    {
      id: "lens-price",
      title: "Find a Lens & Price",
      description: "Compare suitable approved options",
      href: "/lens-assistant?audience=professional",
      icon: Search,
    },
    {
      id: "repeat",
      title: "Repeat a Previous Job",
      description: "Reuse a saved cart or Rx draft",
      href: "/profile/drafts",
      icon: RefreshCw,
      requiresSignIn: true,
    },
    {
      id: "technical-help",
      title: "Get Technical Help",
      description: "Ask our optical team",
      assistantQuery: "I need technical help with a lens or prescription order.",
      icon: Headphones,
    },
    {
      id: "account",
      title: "My Account",
      description: "Orders, statements, pricing and documents",
      href: "/profile",
      icon: CircleUserRound,
      requiresSignIn: true,
    },
    {
      id: "retailer",
      title: "Find an Optical Retailer",
      description: "Locate a participating Caribbean eyecare provider",
      href: "/find-a-retailer",
      icon: MapPin,
    },
  ],
  patient: [
    {
      id: "guidance",
      title: "Find the Right Lens",
      description: "Understand suitable lens categories",
      href: "/lens-assistant?audience=patient",
      icon: Glasses,
      featured: true,
    },
    {
      id: "compare",
      title: "Compare Lens Options",
      description: "Clear explanations without medical diagnosis",
      href: "/patients/lens-differences",
      icon: ShieldCheck,
    },
    {
      id: "screen-use",
      title: "Computer & Mobile Use",
      description: "Guidance for screen-heavy days",
      href: "/patients/computer-mobile-use",
      icon: Monitor,
    },
    {
      id: "sunlight",
      title: "Sunlight Protection",
      description: "Photochromic, polarized and UV guidance",
      href: "/patients/sunlight-protection",
      icon: Sun,
    },
    {
      id: "learn",
      title: "Learn About Lenses",
      description: "Plain-language educational resources",
      href: "/patients",
      icon: BookOpen,
    },
    {
      id: "ask",
      title: "Ask Classic",
      description: "Get an answer or the right next step",
      assistantQuery: "Help me understand my lens choices as a patient.",
      icon: ShoppingBag,
    },
    {
      id: "retailer",
      title: "Find an Optical Retailer",
      description: "Connect with a participating eyecare provider",
      href: "/find-a-retailer",
      icon: MapPin,
    },
  ],
};

export const getSmartHomeActions = (audience: HomeAudience) => SMART_HOME_ACTIONS[audience];

export const shouldRedirectAuthenticatedCustomer = ({
  isSignedIn,
  isStaff,
  publicPreview,
}: {
  isSignedIn: boolean;
  isStaff: boolean;
  publicPreview: boolean;
}) => isSignedIn && !isStaff && !publicPreview;
