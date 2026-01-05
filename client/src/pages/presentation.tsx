import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home, Download, Maximize2, FileDown, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { presentationSlides as slides } from "@shared/presentation-slides";

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const downloadPptx = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/presentation/download', { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'The-YHC-Way-Presentation.pptx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.log("Fullscreen not supported");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const slide = slides[currentSlide];

  const renderSlide = () => {
    switch (slide.type) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-6">
              {slide.title}
            </h1>
            <p className="text-2xl md:text-3xl text-gray-600 mb-4">{slide.subtitle}</p>
            <p className="text-xl text-gray-500 italic">{slide.tagline}</p>
          </div>
        );

      case "overview":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-12">{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-center">
              <ul className="space-y-6">
                {slide.points?.map((point, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="text-3xl text-orange-500">✓</span>
                    <span className="text-2xl text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-12 p-6 bg-gradient-to-r from-orange-100 to-pink-100 rounded-2xl">
                <p className="text-2xl font-semibold text-orange-700">{slide.benefit}</p>
              </div>
            </div>
          </div>
        );

      case "feature":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <div className="flex items-center gap-4 mb-10">
              <span className="text-5xl">{slide.icon}</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800">{slide.title}</h2>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {slide.features?.map((feature, i) => (
                <div key={i} className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.name}</h3>
                  <p className="text-lg text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 p-5 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl">
              <p className="text-xl font-semibold text-purple-700 text-center">{slide.benefit}</p>
            </div>
          </div>
        );

      case "benefits":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-10 text-center">{slide.title}</h2>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
              {slide.benefits?.map((benefit, i) => (
                <div key={i} className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center">
                  <span className="text-4xl mb-3">{benefit.icon}</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "closing":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8">{slide.title}</h2>
            <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-6">
              {slide.subtitle}
            </div>
            <p className="text-2xl text-gray-600 mb-10 italic">{slide.tagline}</p>
            <Link href="/">
              <Button size="lg" className="text-xl px-8 py-6 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                {slide.cta}
              </Button>
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl aspect-[16/9] bg-white rounded-3xl shadow-2xl overflow-hidden relative">
          {renderSlide()}
        </div>
      </div>

      <div className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur border-t">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-home">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={downloadPptx} disabled={isDownloading} data-testid="button-download-pptx">
            {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            PowerPoint
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} data-testid="button-print">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} data-testid="button-fullscreen">
            <Maximize2 className="h-4 w-4 mr-2" />
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentSlide ? "bg-orange-500 scale-125" : "bg-gray-300 hover:bg-gray-400"
              }`}
              data-testid={`slide-dot-${i}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-4">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button variant="outline" size="sm" onClick={goPrev} disabled={currentSlide === 0} data-testid="button-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} disabled={currentSlide === slides.length - 1} data-testid="button-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .min-h-screen { min-height: auto; }
        }
      `}</style>
    </div>
  );
}
