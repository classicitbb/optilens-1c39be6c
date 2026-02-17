import { Outlet } from "react-router-dom";
import ZenvueHeader from "./ZenvueHeader";
import Footer from "@/components/Footer";

const ZenvueLayout = () => {
  return (
    <div className="zenvue min-h-screen flex flex-col">
      <ZenvueHeader />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default ZenvueLayout;
