import { useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface GuidedTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

// Track globally if tour has been started/dismissed this session
let tourStartedThisSession = false;

export function useGuidedTour() {
  const queryClient = useQueryClient();
  
  const markTourCompletedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/tour-completed', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to mark tour completed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });

  const startTour = useCallback(() => {
    // Prevent tour from starting if already started this session
    if (tourStartedThisSession) return;
    tourStartedThisSession = true;
    
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'yhc-tour-popover',
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Get Started!',
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      steps: [
        {
          element: '[data-tour="sidebar-logo"]',
          popover: {
            title: 'Welcome to The YHC Way! 👋',
            description: 'Your unified workspace that brings all your work tools together in one place. Let me show you around!',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-overview"]',
          popover: {
            title: 'Overview Dashboard',
            description: 'Get a bird\'s-eye view of all your connected apps and their status. This is your home base.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-dashboard"]',
          popover: {
            title: 'Activity Feed',
            description: 'See all your recent activities from Gmail, Calendar, Slack, and more in one unified timeline.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-inbox"]',
          popover: {
            title: 'Mailbox',
            description: 'All your messages from different platforms in one place. Never miss an important message again.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-calendar"]',
          popover: {
            title: 'Calendar',
            description: 'View and manage all your events from Google Calendar and Apple Calendar in one view.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-projects"]',
          popover: {
            title: 'Projects',
            description: 'Manage your projects with Kanban boards. Create tasks, set due dates, and track progress.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-tasks"]',
          popover: {
            title: 'Tasks',
            description: 'Your personal task list across all projects. Stay organized and never forget a to-do.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-connect"]',
          popover: {
            title: 'Connect Your Apps',
            description: 'Link your Gmail, Google Calendar, Slack, Zoom, and other apps to unlock the full power of YHC Way.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-settings"]',
          popover: {
            title: 'Settings',
            description: 'Customize your experience, manage your profile, and configure your preferences.',
            side: 'top',
            align: 'start',
          },
        },
        {
          popover: {
            title: 'You\'re All Set! 🎉',
            description: 'Start by connecting your apps to see your unified workspace come to life. Click "Get Started" to begin!',
            side: 'top',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        // Mark tour as completed when user closes or finishes
        markTourCompletedMutation.mutate();
        // Must call destroy to proceed with closing
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, [markTourCompletedMutation]);

  const resetTour = useCallback(() => {
  }, []);

  return { startTour, resetTour };
}

export function GuidedTour({ onComplete, autoStart = false }: GuidedTourProps) {
  const { user } = useAuth();
  const { startTour } = useGuidedTour();
  const [location] = useLocation();

  useEffect(() => {
    if (!autoStart || !user) return;
    
    // Don't show tour on pending-approval or other non-app pages
    if (location === '/pending-approval') return;
    
    // Only show tour if hasCompletedTour is explicitly false (not undefined/null)
    // This ensures existing users who don't have this field yet don't see the tour
    if (user.hasCompletedTour === false) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startTour, user, location]);

  return null;
}
