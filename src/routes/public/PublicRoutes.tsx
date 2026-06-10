import { Navigate, Route, Routes } from "react-router";

import {
  LABLINK_PORTAL_URL,
  LABLINK_TRACKING_URL,
} from "@/config/externalLinks";
import {
  PUBLIC_COATINGS_REDIRECTS,
  PUBLIC_LENSES_REDIRECTS,
  PUBLIC_LEGAL_REDIRECTS,
  PUBLIC_MISC_REDIRECTS,
} from "@/config/routeRegistry";
import Index from "@/pages/Index";
import VizionizeCleanerPage from "@/pages/VizionizeCleanerPage";
import BlogHubPage from "@/pages/BlogHubPage";
import BlogPostPage from "@/pages/BlogPostPage";
import CompanionAssistantWindowPage from "@/pages/assistant/CompanionAssistantWindowPage";
import OpticalRetailWebsitesPage from "@/pages/OpticalRetailWebsitesPage";
import RxLabServicesPage from "@/pages/RxLabServicesPage";
import LabLinkEmbedPage from "@/pages/LabLinkEmbedPage";
import Knowledge from "@/pages/Knowledge";
import LegalPage from "@/pages/LegalPage";
import LensDesignGuidePage from "@/pages/LensDesignGuidePage";
import CoatingsLandingPage from "@/pages/coatings/CoatingsLandingPage";
import MirrorFinishPage from "@/pages/MirrorFinishPage";
import UltraClearARPage from "@/pages/coatings/UltraClearARPage";
import BlueBlockARPage from "@/pages/coatings/BlueBlockARPage";
import ScratchResistantPage from "@/pages/coatings/ScratchResistantPage";
import UVShieldPage from "@/pages/coatings/UVShieldPage";
import HydrophobicOleophobicPage from "@/pages/coatings/HydrophobicOleophobicPage";
import ProfessionalsPage from "@/pages/ProfessionalsPage";
import PatientsPage from "@/pages/PatientsPage";
import LensDifferencesPage from "@/pages/patients/LensDifferencesPage";
import ProgressiveLensesPage from "@/pages/patients/ProgressiveLensesPage";
import AntiFatigueLensesPage from "@/pages/patients/AntiFatigueLensesPage";
import CaringForGlassesPage from "@/pages/patients/CaringForGlassesPage";
import ComputerMobileUsePage from "@/pages/patients/ComputerMobileUsePage";
import SunlightProtectionPage from "@/pages/patients/SunlightProtectionPage";
import RegularEyeExamsPage from "@/pages/patients/RegularEyeExamsPage";
import NightDrivingAidsPage from "@/pages/patients/NightDrivingAidsPage";
import ProfessionalsPortalPage from "@/pages/ProfessionalsPortalPage";
import ProfessionalsChemistriePage from "@/pages/ProfessionalsChemistriePage";
import CustomerSuppliedFramesPolicyPage from "@/pages/professionals/CustomerSuppliedFramesPolicyPage";
import DispensingTipsPage from "@/pages/professionals/DispensingTipsPage";
import FreightDeliveryPolicyPage from "@/pages/professionals/FreightDeliveryPolicyPage";
import RepairsPolicyPage from "@/pages/professionals/RepairsPolicyPage";
import ReturnsReplacementsPage from "@/pages/professionals/ReturnsReplacementsPage";
import FindARetailerPage from "@/pages/find-a-retailer/FindARetailerPage";
import BarbadosRetailersPage from "@/pages/find-a-retailer/BarbadosRetailersPage";
import TracingCuttingGuidePage from "@/pages/professionals/TracingCuttingGuidePage";
import LabProcessOverviewPage from "@/pages/professionals/LabProcessOverviewPage";
import LensOrderingTipsPage from "@/pages/professionals/LensOrderingTipsPage";
import ProgressivePage from "@/pages/lenses/ProgressivePage";
import OfficeOccupationalPage from "@/pages/lenses/OfficeOccupationalPage";
import AntiFatiguePage from "@/pages/lenses/AntiFatiguePage";
import SingleVisionPage from "@/pages/lenses/SingleVisionPage";
import BifocalsPage from "@/pages/lenses/BifocalsPage";
import MyopiaControlPage from "@/pages/lenses/MyopiaControlPage";
import LedProPage from "@/pages/lenses/LedProPage";
import BlueFilterPage from "@/pages/lenses/BlueFilterPage";
import PolarizedPage from "@/pages/lenses/PolarizedPage";
import TintsFashionColorsPage from "@/pages/lenses/TintsFashionColorsPage";
import MaterialsPage from "@/pages/lenses/MaterialsPage";
import ThicknessChartPage from "@/pages/lenses/ThicknessChartPage";
import ZenvueHome from "@/pages/zenvue/ZenvueHome";
import ZenvueBrilliance from "@/pages/zenvue/ZenvueBrilliance";
import ZenvueSingleVision from "@/pages/zenvue/ZenvueSingleVision";
import ZenvueDarkun from "@/pages/zenvue/ZenvueDarkun";
import ZenvueCompare from "@/pages/zenvue/ZenvueCompare";
import ZenvueWholesale from "@/pages/zenvue/ZenvueWholesale";
import PhotochromicGuidePage from "@/pages/photochromic/PhotochromicGuidePage";
import NotFound from "@/pages/NotFound";

const toRelativePath = (path: string) => path.replace(/^\//, "");

const ContactHashRedirect = () => {
  if (typeof window !== "undefined") {
    window.location.replace("/#contact");
  }
  return null;
};

const PublicRoutes = () => (
  <Routes>
    <Route index element={<Index />} />
    <Route path="contact" element={<ContactHashRedirect />} />
    <Route path="blog" element={<BlogHubPage />} />
    <Route path="blog/:slug" element={<BlogPostPage />} />
    <Route path="assistant/window" element={<CompanionAssistantWindowPage />} />
    <Route path="optical-retail-websites" element={<OpticalRetailWebsitesPage />} />
    <Route path="rx-lab-services" element={<RxLabServicesPage />} />
    <Route
      path="rx-order"
      element={
        <LabLinkEmbedPage
          title="Online Ordering Portal"
          iframeTitle="Classic Visions Online Ordering Portal"
          src={LABLINK_PORTAL_URL}
          canonicalPath="/rx-order"
        />
      }
    />
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
    <Route path="knowledge" element={<Knowledge />} />
    <Route path="knowledge/:articleSlug" element={<Knowledge />} />
    <Route path="legal/:slug" element={<LegalPage />} />

    {PUBLIC_MISC_REDIRECTS.map((route) => (
      <Route key={route.id} path={toRelativePath(route.path)} element={<Navigate to={route.redirectTo ?? "/"} replace />} />
    ))}
    {PUBLIC_LEGAL_REDIRECTS.map((route) => (
      <Route key={route.id} path={toRelativePath(route.path)} element={<Navigate to={route.redirectTo ?? "/"} replace />} />
    ))}
    {PUBLIC_LENSES_REDIRECTS.map((route) => (
      <Route key={route.id} path={toRelativePath(route.path)} element={<Navigate to={route.redirectTo ?? "/"} replace />} />
    ))}

    <Route path="lenses/lens-types" element={<LensDesignGuidePage />} />
    <Route path="lenses/progressive" element={<ProgressivePage />} />
    <Route path="lenses/office-occupational" element={<OfficeOccupationalPage />} />
    <Route path="lenses/anti-fatigue" element={<AntiFatiguePage />} />
    <Route path="lenses/single-vision" element={<SingleVisionPage />} />
    <Route path="lenses/bifocals" element={<BifocalsPage />} />
    <Route path="lenses/myopia-control" element={<MyopiaControlPage />} />
    <Route path="lenses/led-pro" element={<LedProPage />} />
    <Route path="lenses/blue-filter" element={<BlueFilterPage />} />
    <Route path="lenses/polarized" element={<PolarizedPage />} />
    <Route path="lenses/tints-fashion-colors" element={<TintsFashionColorsPage />} />
    <Route path="lenses/materials" element={<MaterialsPage />} />
    <Route path="lenses/thickness-chart" element={<ThicknessChartPage />} />

    <Route path="coatings" element={<CoatingsLandingPage />} />
    <Route path="coatings/mirror" element={<MirrorFinishPage />} />
    <Route path="coatings/ultraclear-ar" element={<UltraClearARPage />} />
    <Route path="coatings/blueblock-ar" element={<BlueBlockARPage />} />
    <Route path="coatings/scratch-resistant" element={<ScratchResistantPage />} />
    <Route path="coatings/uv-shield" element={<UVShieldPage />} />
    <Route path="coatings/hydrophobic-oleophobic" element={<HydrophobicOleophobicPage />} />
    {PUBLIC_COATINGS_REDIRECTS.map((route) => (
      <Route key={route.id} path={toRelativePath(route.path)} element={<Navigate to={route.redirectTo ?? "/"} replace />} />
    ))}

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
    <Route path="professionals/dispensing-tips" element={<Navigate to="/dispensing-tips" replace />} />
    <Route path="professionals/freight-delivery-policy" element={<FreightDeliveryPolicyPage />} />
    <Route path="professionals/repairs-policy" element={<RepairsPolicyPage />} />
    <Route path="professionals/returns-replacements" element={<ReturnsReplacementsPage />} />
    <Route path="professionals/tracing-cutting-guide" element={<TracingCuttingGuidePage />} />
    <Route path="professionals/lab-process-overview" element={<LabProcessOverviewPage />} />
    <Route path="professionals/lens-ordering-tips" element={<LensOrderingTipsPage />} />
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

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default PublicRoutes;
