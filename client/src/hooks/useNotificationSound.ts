import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface UserPreferences {
  notifySound: boolean;
  notificationSoundType: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const playSound = (soundType: string) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  switch (soundType) {
    case "chime":
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.2);
      oscillator.type = "sine";
      break;
    case "bell":
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = "triangle";
      break;
    case "ping":
      oscillator.frequency.setValueAtTime(1400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.3);
      oscillator.type = "sine";
      break;
    case "pop":
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      oscillator.type = "square";
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      break;
    default:
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.type = "sine";
  }
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

const isWithinQuietHours = (start: string, end: string): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

export function useNotificationSound() {
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const playNotification = useCallback(() => {
    if (!preferences?.notifySound) return;
    
    if (preferences.quietHoursEnabled) {
      const inQuietHours = isWithinQuietHours(
        preferences.quietHoursStart || "22:00",
        preferences.quietHoursEnd || "08:00"
      );
      if (inQuietHours) return;
    }
    
    playSound(preferences.notificationSoundType || "chime");
  }, [preferences]);

  return { playNotification };
}
