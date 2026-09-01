import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";

import {
  LABLINK_TRACKING_URL,
} from "@/config/externalLinks";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";
import ProtectedRoute from "@/components/ProtectedRoute";

const Index = lazyWithRetry(() => import("@/pages/Index"));
const AboutUsPage = lazyWithRetry(() => import("@/pages/AboutUsPage"));
const VizionizeCleanerPage = lazyWithRetry(() => import("@/pages/VizionizeCleanerPage"));
const BlogHubPage = lazyWithRetry(() => import("@/pages/BlogHubPage"));
const BlogPostPage = lazyWithRetry(() => import("@/pages/BlogPostPage"));
const CompanionAssistantWindowPage = lazyWithRetry(() => import("@/pages/assistant/CompanionAssistantWindowPage"));
const OpticalRetailWebsitesPage = lazyWithRetry(() => import("@/pages/OpticalRetailWebsitesPage"));
const RxLabServicesPage = lazyWithRetry(() => import("@/pages/RxLabServicesPage"));
const LensAssistantPage = lazyWithRetry(() => import("@/pages/LensAssistantPage"));
const LabLinkEmbedPage = lazyWithRetry(() => import("@/pages/LabLinkEmbedPage"));
const Knowledge = lazyWithRetry(() => import("@/pages/Knowledge"));
const LegalPage = lazyWithRetry(() => import("@/pages/LegalPage"));
const LensDesignGuidePage = lazyWithRetry(() => import("@/pages/LensDesignGuidePage"));
const CoatingsLandingPage = lazyWithRetry(() => import("@/pages/coatings/CoatingsLandingPage"));
const MirrorFinishPage = lazyWithRetry(() => import("@/pages/MirrorFinishPage"));
const UltraClearARPage = lazyWithRetry(() => import("@/pages/coatings/UltraClearARPage"));
const BlueBlockARPage = lazyWithRetry(() => import("@/pages/coatings/BlueBlockARPage"));
const ScratchResistantPage = lazyWithRetry(() => import("@/pages/coatings/ScratchResistantPage"));
const UVShieldPage = lazyWithRetry(() => import("@/pages/coatings/UVShieldPage"));
const HydrophobicOleophobicPage = lazyWithRetry(() => import("@/pages/coatings/HydrophobicOleophobicPage"));
const ProfessionalsPage = lazyWithRetry(() => import("@/pages/ProfessionalsPage"));
const PatientsPage = lazyWithRetry(() => import("@/pages/PatientsPage"));
const LensDifferencesPage = lazyWithRetry(() => import("@/pages/patients/LensDifferencesPage"));
const ProgressiveLensesPage = lazyWithRetry(() => import("@/pages/patients/ProgressiveLensesPage"));
const AntiFatigueLensesPage = lazyWithRetry(() => import("@/pages/patients/AntiFatigueLensesPage"));
const CaringForGlassesPage = lazyWithRetry(() => import("@/pages/patients/CaringForGlassesPage"));
const ComputerMobileUsePage = lazyWithRetry(() => import("@/pages/patients/ComputerMobileUsePage"));
const SunlightProtectionPage = lazyWithRetry(() => import("@/pages/patients/SunlightProtectionPage"));
const RegularEyeExamsPage = lazyWithRetry(() => import("@/pages/patients/RegularEyeExamsPage"));
const NightDrivingAidsPage = lazyWithRetry(() => import("@/pages/patients/NightDrivingAidsPage"));
const ProfessionalsPortalPage = lazyWithRetry(() => import("@/pages/ProfessionalsPortalPage"));
const ProfessionalsChemistriePage = lazyWithRetry(() => import("@/pages/ProfessionalsChemistriePage"));
const CustomerSuppliedFramesPolicyPage = lazyWithRetry(() => import("@/pages/professionals/CustomerSuppliedFramesPolicyPage"));
const DispensingTipsPage = lazyWithRetry(() => import("@/pages/professionals/DispensingTipsPage"));
const FreightDeliveryPolicyPage = lazyWithRetry(() => import("@/pages/professionals/FreightDeliveryPolicyPage"));
const RepairsPolicyPage = lazyWithRetry(() => import("@/pages/professionals/RepairsPolicyPage"));
const ReturnsReplacementsPage = lazyWithRetry(() => import("@/pages/professionals/ReturnsReplacementsPage"));
const FindARetailerPage = lazyWithRetry(() => import("@/pages/find-a-retailer/FindARetailerPage"));
const BarbadosRetailersPage = lazyWithRetry(() => import("@/pages/find-a-retailer/BarbadosRetailersPage"));
const TracingCuttingGuidePage = lazyWithRetry(() => import("@/pages/professionals/TracingCuttingGuidePage"));
const LabProcessOverviewPage = lazyWithRetry(() => import("@/pages/professionals/LabProcessOverviewPage"));
const LensOrderingTipsPage = lazyWithRetry(() => import("@/pages/professionals/LensOrderingTipsPage"));
const ProgressivePage = lazyWithRetry(() => import("@/pages/lenses/ProgressivePage"));
const OfficeOccupationalPage = lazyWithRetry(() => import("@/pages/lenses/OfficeOccupationalPage"));
const SportPage = lazyWithRetry(() => import("@/pages/lenses/SportPage"));
const AntiFatiguePage = lazyWithRetry(() => import("@/pages/lenses/AntiFatiguePage"));
const SingleVisionPage = lazyWithRetry(() => import("@/pages/lenses/SingleVisionPage"));
const BifocalsPage = lazyWithRetry(() => import("@/pages/lenses/BifocalsPage"));
const MyopiaControlPage = lazyWithRetry(() => import("@/pages/lenses/MyopiaControlPage"));
const LedProPage = lazyWithRetry(() => import("@/pages/lenses/LedProPage"));
const BlueFilterPage = lazyWithRetry(() => import("@/pages/lenses/BlueFilterPage"));
const PolarizedPage = lazyWithRetry(() => import("@/pages/lenses/PolarizedPage"));
const TintsFashionColorsPage = lazyWithRetry(() => import("@/pages/lenses/TintsFashionColorsPage"));
const SpecialtyLensesPage = lazyWithRetry(() => import("@/pages/lenses/SpecialtyLensesPage"));
const MaterialsPage = lazyWithRetry(() => import("@/pages/lenses/MaterialsPage"));
const ThicknessChartPage = lazyWithRetry(() => import("@/pages/lenses/ThicknessChartPage"));
const ZenvueHome = lazyWithRetry(() => import("@/pages/zenvue/ZenvueHome"));
const ZenvueBrilliance = lazyWithRetry(() => import("@/pages/zenvue/ZenvueBrilliance"));
const ZenvueSingleVision = lazyWithRetry(() => import("@/pages/zenvue/ZenvueSingleVision"));
const ZenvueDarkun = lazyWithRetry(() => import("@/pages/zenvue/ZenvueDarkun"));
const ZenvueCompare = lazyWithRetry(() => import("@/pages/zenvue/ZenvueCompare"));
const ZenvueWholesale = lazyWithRetry(() => import("@/pages/zenvue/ZenvueWholesale"));
const PhotochromicGuidePage = lazyWithRetry(() => import("@/pages/photochromic/PhotochromicGuidePage"));
const ConnectCardPage = lazyWithRetry(() => import("@/pages/ConnectCardPage"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

const toRelativePath = (path: string) => path.replace(/^\//, "");

const ContactHashRedirect = () => {
  if (typeof window !== "undefined") {
    window.location.replace("/#contact");
  }
  return null;
};

const LensAssistantRouteGate = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const publicLensAssistant = useWebsiteFeature("lens_assistant_public", false);
  const adminLensAssistant = useWebsiteFeature("lens_assistant_admin", true);

  if ((user && roleLoading) || publicLensAssistant.isLoading || adminLensAssistant.isLoading) return null;

  const enabled = isAdmin ? adminLensAssistant.enabled : publicLensAssistant.enabled;
  return enabled ? <LensAssistantPage /> : <Navigate to={user ? "/profile" : "/"} replace />;
};

import RepoHealthPage from "@/pages/RepoHealth";

const PublicRoutes = () => (
  <Routes>
    <Route index element={<Index />} />
    <Route path="about-us" element={<AboutUsPage />} />
    <Route path="contact" element={<ContactHashRedirect />} />
    <Route path="blog" element={<BlogHubPage />} />
    <Route path="blog/:slug" element={<BlogPostPage />} />
    <Route path="assistant/window" element={<CompanionAssistantWindowPage />} />
    <Route path="connect/:slug" element={<ConnectCardPage />} />
    <Route path="optical-retail-websites" element={<ProtectedRoute><OpticalRetailWebsitesPage /></ProtectedRoute>} />
    <Route path="rx-lab-services" element={<RxLabServicesPage />} />
    <Route path="lens-assistant" element={<LensAssistantRouteGate />} />
    <Route
      path="rx-job-status"
      element={
        <LabLinkEmbedPage
          title="Order Tracking"
          iframeTitle="Classic Visions Order Tracking"
          src={LABLINK_TRACKING_URL}
          canonicalPath="/rx-job-status"
        />
      }
    />
    <Route path="knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
    <Route path="knowledge/:articleSlug" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
    <Route path="privacy-policy" element={<LegalPage slug="privacy-policy" />} />
    <Route path="terms" element={<LegalPage slug="terms" />} />
    <Route path="legal/privacy-policy" element={<Navigate to="/privacy-policy" replace />} />
    <Route path="legal/terms" element={<Navigate to="/terms" replace />} />
    <Route path="legal/:slug" element={<LegalPage />} />

    <Route path="lenses/lens-types" element={<LensDesignGuidePage />} />
    <Route path="lenses/progressive" element={<ProgressivePage />} />
    <Route path="lenses/office-occupational" element={<OfficeOccupationalPage />} />
    <Route path="lenses/sport" element={<SportPage />} />
    <Route path="lenses/anti-fatigue" element={<AntiFatiguePage />} />
    <Route path="lenses/single-vision" element={<SingleVisionPage />} />
    <Route path="lenses/bifocals" element={<BifocalsPage />} />
    <Route path="lenses/myopia-control" element={<MyopiaControlPage />} />
    <Route path="lenses/led-pro" element={<LedProPage />} />
    <Route path="lenses/blue-filter" element={<BlueFilterPage />} />
    <Route path="lenses/polarized" element={<PolarizedPage />} />
    <Route path="lenses/tints-fashion-colors" element={<TintsFashionColorsPage />} />
    <Route path="lenses/specialty" element={<SpecialtyLensesPage />} />
    <Route path="lenses/materials" element={<MaterialsPage />} />
    <Route path="lenses/thickness-chart" element={<ThicknessChartPage />} />

    <Route path="coatings" element={<CoatingsLandingPage />} />
    <Route path="coatings/mirror" element={<MirrorFinishPage />} />
    <Route path="coatings/ultraclear-ar" element={<UltraClearARPage />} />
    <Route path="coatings/blueblock-ar" element={<BlueBlockARPage />} />
    <Route path="coatings/scratch-resistant" element={<ScratchResistantPage />} />
    <Route path="coatings/uv-shield" element={<UVShieldPage />} />
    <Route path="coatings/hydrophobic-oleophobic" element={<HydrophobicOleophobicPage />} />
    <Route path="professionals" element={<ProfessionalsPage />} />
    <Route path="patients" element={<PatientsPage />} />
    <Route path="patients/lens-differences" element={<LensDifferencesPage />} />
    <Route path="patients/progressive-lenses" element={<ProgressiveLensesPage />} />
    <Route path="patients/anti-fatigue-lenses" element={<AntiFatigueLensesPage />} />
    <Route path="patients/caring-for-glasses" element={<CaringForGlassesPage />} />
    <Route path="patients/computer-mobile-use" element={<ComputerMobileUsePage />} />
    <Route path="patients/sunlight-protection" element={<SunlightProtectionPage />} />
    <Route path="patients/regular-eye-exams" element={<RegularEyeExamsPage />} />
    <Route path="find-a-retailer" element={<FindARetailerPage />} />
    <Route path="find-a-retailer/barbados" element={<BarbadosRetailersPage />} />
    <Route path="patients/find-a-retailer" element={<Navigate to="/find-a-retailer" replace />} />
    <Route path="patients/night-driving-aids" element={<NightDrivingAidsPage />} />
    <Route path="dispensing-tips" element={<DispensingTipsPage />} />
    <Route path="professionals/chemistrie-lens-system" element={<ProfessionalsChemistriePage />} />
    <Route path="professionals/customer-supplied-frames-policy" element={<CustomerSuppliedFramesPolicyPage />} />
    <Route path="professionals/freight-delivery-policy" element={<FreightDeliveryPolicyPage />} />
    <Route path="professionals/repairs-policy" element={<RepairsPolicyPage />} />
    <Route path="professionals/returns-replacements" element={<ReturnsReplacementsPage />} />
    <Route path="professionals/tracing-cutting-guide" element={<ProtectedRoute><TracingCuttingGuidePage /></ProtectedRoute>} />
    <Route path="professionals/lab-process-overview" element={<ProtectedRoute><LabProcessOverviewPage /></ProtectedRoute>} />
    <Route path="professionals/lens-ordering-tips" element={<ProtectedRoute><LensOrderingTipsPage /></ProtectedRoute>} />
    <Route path="professionals/price-list-request" element={<ProfessionalsPage />} />
    <Route path="professionals/:slug" element={<ProfessionalsPortalPage />} />
    <Route path="return-policy" element={<LegalPage />} />

    <Route path="zenvue" element={<ZenvueHome />} />
    <Route path="zenvue/brilliance" element={<ZenvueBrilliance />} />
    <Route path="zenvue/single-vision" element={<ZenvueSingleVision />} />
    <Route path="zenvue/sundun" element={<Navigate to="/lenses/polarized" replace />} />
    <Route path="zenvue/darkun" element={<ZenvueDarkun />} />
    <Route path="photochromic" element={<PhotochromicGuidePage />} />
    <Route path="zenvue/compare" element={<ZenvueCompare />} />
    <Route path="zenvue/wholesale" element={<ZenvueWholesale />} />

    <Route path="vizionize-cleaner" element={<VizionizeCleanerPage />} />

    <Route path="repo-health" element={<RepoHealthPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default PublicRoutes;
