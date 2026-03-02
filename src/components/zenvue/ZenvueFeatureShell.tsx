import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ZenvueFeatureShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
};

export default ZenvueFeatureShell;
