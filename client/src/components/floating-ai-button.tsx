import { useState } from "react";
import { Brain } from "lucide-react";
import { AIAssistantPanel } from "./ai-assistant-panel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocation } from "wouter";

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  if (location === "/presentation") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-primary to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
        data-testid="button-floating-ai"
        title="AI Assistant"
      >
        <Brain className="w-7 h-7 group-hover:animate-pulse" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <AIAssistantPanel />
        </DialogContent>
      </Dialog>
    </>
  );
}
