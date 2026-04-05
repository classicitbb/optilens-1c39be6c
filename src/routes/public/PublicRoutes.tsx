import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import ComingSoonGate from "@/components/ComingSoonGate";
import {
  PUBLIC_COATINGS_REDIRECTS,
  PUBLIC_LENSES_REDIRECTS,
  PUBLIC_LEGAL_REDIRECTS,
  PUBLIC_MISC_REDIRECTS,
} from "@/config/routeRegistry";

const Index = lazy(() => import("@/pages/Index"));
const OpticalRetailWebsitesPage = lazy(() => import("@/pages/OpticalRetailWebsitesPage"));
const Knowledge = lazy(() => import("@/pages/Knowledge"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const LensDesignGuidePage = lazy(() => import("@/pages/LensDesignGuidePage"));
const MirrorFinishPage = lazy(() => import("@/pages/MirrorFinishPage"));
const UltraClearARPage = lazy(() => import("@/pages/coatings/UltraClearARPage"));
const BlueBlockARPage = lazy(() => import("@/pages/coatings/BlueBlockARPage"));
const ScratchResistantPage = lazy(() => import("@/pages/coatings/ScratchResistantPage"));
const UVShieldPage = lazy(() => import("@/pages/coatings/UVShieldPage"));
const HydrophobicOleophobicPage = lazy(() => import("@/pages/coatings/HydrophobicOleophobicPage"));
const ProfessionalsPage = lazy(() => import("@/pages/ProfessionalsPage"));
const PatientsPage = lazy(() => import("@/pages/PatientsPage"));
const NightDrivingAidsPage = lazy(() => import("@/pages/patients/NightDrivingAidsPage"));
const ProfessionalsPortalPage = lazy(() => import("@/pages/ProfessionalsPortalPage"));
const ProfessionalsChemistriePage = lazy(() => import("@/pages/ProfessionalsChemistriePage"));
const DispensingTipsPage = lazy(() => import("@/pages/professionals/DispensingTipsPage"));
const FindARetailerPage = lazy(() => import("@/pages/find-a-retailer/FindARetailerPage"));
const BarbadosRetailersPage = lazy(() => import("@/pages/find-a-retailer/BarbadosRetailersPage"));
const TracingCuttingGuidePage = lazy(() => import("@/pages/professionals/TracingCuttingGuidePage"));
const LabProcessOverviewPage = lazy(() => import("@/pages/professionals/LabProcessOverviewPage"));
const LensOrderingTipsPage = lazy(() => import("@/pages/professionals/LensOrderingTipsPage"));
const ProgressivePage = lazy(() => import("@/pages/lenses/ProgressivePage"));
const OfficeOccupationalPage = lazy(() => import("@/pages/lenses/OfficeOccupationalPage"));
const AntiFatiguePage = lazy(() => import("@/pages/lenses/AntiFatiguePage"));
const SingleVisionPage = lazy(() => import("@/pages/lenses/SingleVisionPage"));
const BifocalsPage = lazy(() => import("@/pages/lenses/BifocalsPage"));
const MyopiaControlPage = lazy(() => import("@/pages/lenses/MyopiaControlPage"));
const BlueFilterPage = lazy(() => import("@/pages/lenses/BlueFilterPage"));
const PolarizedPage = lazy(() => import("@/pages/lenses/PolarizedPage"));
const TintsFashionColorsPage = lazy(() => import("@/pages/lenses/TintsFashionColorsPage"));
const MaterialsPage = lazy(() => import("@/pages/lenses/MaterialsPage"));
const ThicknessChartPage = lazy(() => import("@/pages/lenses/ThicknessChartPage"));
const ZenvueHome = lazy(() => import("@/pages/zenvue/ZenvueHome"));
const ZenvueBrilliance = lazy(() => import("@/pages/zenvue/ZenvueBrilliance"));
const ZenvueSingleVision = lazy(() => import("@/pages/zenvue/ZenvueSingleVision"));
const ZenvueDarkun = lazy(() => import("@/pages/zenvue/ZenvueDarkun"));
const ZenvueCompare = lazy(() => import("@/pages/zenvue/ZenvueCompare"));
const ZenvueWholesale = lazy(() => import("@/pages/zenvue/ZenvueWholesale"));
const PhotochromicGuidePage = lazy(() => import("@/pages/photochromic/PhotochromicGuidePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const toRelativePath = (path: string) => path.replace(/^\//, "");

const PublicRoutes = () => (
  <ComingSoonGate>
    <Routes>
      <Route index element={<Index />} />
      <Route path="optical-retail-websites" element={<OpticalRetailWebsitesPage />} />
      <Route path="knowledge" element={<Knowledge />} />
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
      <Route path="lenses/blue-filter" element={<BlueFilterPage />} />
      <Route path="lenses/polarized" element={<PolarizedPage />} />
      <Route path="lenses/tints-fashion-colors" element={<TintsFashionColorsPage />} />
      <Route path="lenses/materials" element={<MaterialsPage />} />
      <Route path="lenses/thickness-chart" element={<ThicknessChartPage />} />

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
      <Route path="find-a-retailer" element={<FindARetailerPage />} />
      <Route path="find-a-retailer/barbados" element={<BarbadosRetailersPage />} />
      <Route path="patients/find-a-retailer" element={<Navigate to="/find-a-retailer" replace />} />
      <Route path="patients/night-driving-aids" element={<NightDrivingAidsPage />} />
      <Route path="dispensing-tips" element={<DispensingTipsPage />} />
      <Route path="professionals/chemistrie-lens-system" element={<ProfessionalsChemistriePage />} />
      <Route path="professionals/dispensing-tips" element={<Navigate to="/dispensing-tips" replace />} />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  </ComingSoonGate>
);

export default PublicRoutes;
