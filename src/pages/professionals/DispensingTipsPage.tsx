import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CirclePlay, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router";

const videos = [
{
  title: "Fitting and Dispensing Progressive Lenses: Dispensing Progressive Lenses for First Time Wearers",
  description:
  "A practical guide for helping first-time progressive wearers understand adaptation, expectations, and the confidence-building handoff conversation.",
  youtubeUrl: "https://youtu.be/9lKKj9sDz-w",
  embedUrl: "https://www.youtube-nocookie.com/embed/9lKKj9sDz-w",
  focus: ["First-time PAL wearers", "Expectation setting", "Adaptation coaching"]
},
{
  title: "Fitting and Dispensing Progressive Lenses: Handling Customer Reactions to New Eyeglasses",
  description:
  "Use this video to coach teams on handling patient concerns, objections, and early reactions after dispense with empathy and technical clarity.",
  youtubeUrl: "https://youtu.be/F1VsVs3ZIgs",
  embedUrl: "https://www.youtube-nocookie.com/embed/F1VsVs3ZIgs",
  focus: ["Customer reactions", "Dispense conversations", "Confidence recovery"]
},
{
  title: "Fitting and Dispensing Progressive Lenses: Measure Pupillary Distance",
  description:
  "A fast refresher on measuring pupillary distance accurately so teams can reduce remakes and improve first-pair success.",
  youtubeUrl: "https://www.youtube.com/watch?v=sz1gNPBMkXE",
  embedUrl: "https://www.youtube-nocookie.com/embed/sz1gNPBMkXE",
  focus: ["Monocular PD", "Measurement accuracy", "Remake prevention"]
},
{
  title: "Fitting and Dispensing Progressive Lenses: Measure Fitting Height",
  description:
  "A focused lesson on fitting-height measurement with frame-adjustment awareness, helping teams improve alignment and wearer comfort.",
  youtubeUrl: "https://www.youtube.com/watch?v=-PIDGBn8RY4&pp=ygVBRml0dGluZyBhbmQgRGlzcGVuc2luZyBQcm9ncmVzc2l2ZSBMZW5zZXM6IE1lYXN1cmUgRml0dGluZyBIZWlnaHQ%3D",
  embedUrl: "https://www.youtube-nocookie.com/embed/-PIDGBn8RY4",
  focus: ["Fitting height", "Frame preparation", "Dispensing consistency"]
}];


const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Dispensing tips videos",
  itemListElement: videos.map((video, index) => ({
    "@type": "VideoObject",
    position: index + 1,
    name: video.title,
    description: video.description,
    embedUrl: video.embedUrl,
    contentUrl: video.youtubeUrl,
    publisher: {
      "@type": "Organization",
      name: "Classic Visions"
    }
  }))
};

const DispensingTipsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Dispensing tips videos for optical professionals | Classic Visions"
        description="Watch playable dispensing tips videos for optical professionals, including first-time progressive wearers, customer reactions, PD measurement, and fitting height."
        canonicalPath="/dispensing-tips"
        jsonLd={jsonLd} />
      
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <Badge variant="secondary">Professionals resource page</Badge>
            <div className="mt-5 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Dispensing tips </h1>
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                  Built for optical dispensers, retail teams, and clinic staff who need quick, practical refreshers on progressive lens fitting, patient conversations, and measurement consistency.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/professionals">Return to professionals hub</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/find-a-retailer">View retailer finder</Link>
                  </Button>
                </div>
              </div>
              






















              
            </div>
          </section>

          

























          

          <section className="mt-10">
            <div className="flex items-center gap-3">
              <CirclePlay className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-semibold text-foreground">Watch the dispensing tips series</h2>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              {videos.map((video) =>
              <Card key={video.title} className="overflow-hidden rounded-3xl border-border shadow-sm">
                  <div className="aspect-video w-full bg-muted">
                    <iframe
                    className="h-full w-full"
                    src={video.embedUrl}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen />
                  
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl leading-snug">{video.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground sm:text-base">{video.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {video.focus.map((item) =>
                    <Badge key={item} variant="outline">{item}</Badge>
                    )}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button size="sm" asChild>
                        <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          
























          
        </div>
      </main>
      <Footer />
    </div>);

};

export default DispensingTipsPage;