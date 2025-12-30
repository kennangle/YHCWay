import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  handler: ShortcutHandler;
  description: string;
}

export function useKeyboardShortcuts(onCommandPalette?: () => void) {
  const [, navigate] = useLocation();
  const pendingKeyRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shortcuts: ShortcutConfig[] = [
    { key: "g i", handler: () => navigate("/inbox"), description: "Go to Inbox" },
    { key: "g c", handler: () => navigate("/calendar"), description: "Go to Calendar" },
    { key: "g d", handler: () => navigate("/"), description: "Go to Dashboard" },
    { key: "g p", handler: () => navigate("/projects"), description: "Go to Projects" },
    { key: "g s", handler: () => navigate("/settings"), description: "Go to Settings" },
    { key: "g h", handler: () => navigate("/chat"), description: "Go to Chat" },
    { key: "g m", handler: () => navigate("/intro-offers"), description: "Go to Mindbody Analytics" },
    { key: "g e", handler: () => navigate("/email-builder"), description: "Go to Email Builder" },
    { key: "g a", handler: () => navigate("/admin"), description: "Go to Admin" },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === "INPUT" || 
                         target.tagName === "TEXTAREA" || 
                         target.isContentEditable;

    if (isInputField) return;

    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      onCommandPalette?.();
      return;
    }

    if (event.key === "Escape") {
      pendingKeyRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const key = event.key.toLowerCase();

    if (pendingKeyRef.current) {
      const fullKey = `${pendingKeyRef.current} ${key}`;
      const shortcut = shortcuts.find(s => s.key === fullKey);
      
      if (shortcut) {
        event.preventDefault();
        shortcut.handler();
      }
      
      pendingKeyRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else if (key === "g") {
      pendingKeyRef.current = "g";
      timeoutRef.current = setTimeout(() => {
        pendingKeyRef.current = null;
      }, 1000);
    }
  }, [navigate, onCommandPalette, shortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  return { shortcuts };
}

export function getShortcutsList() {
  return [
    { keys: ["G", "D"], description: "Go to Dashboard" },
    { keys: ["G", "I"], description: "Go to Inbox" },
    { keys: ["G", "C"], description: "Go to Calendar" },
    { keys: ["G", "P"], description: "Go to Projects" },
    { keys: ["G", "H"], description: "Go to Chat" },
    { keys: ["G", "S"], description: "Go to Settings" },
    { keys: ["G", "M"], description: "Go to Mindbody Analytics" },
    { keys: ["G", "E"], description: "Go to Email Builder" },
    { keys: ["G", "A"], description: "Go to Admin" },
    { keys: ["⌘", "K"], description: "Open Command Palette" },
  ];
}
