import { useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface GuidedTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

export function useGuidedTour() {
  const startTour = useCallback(() => {
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
            title: 'Unified Inbox',
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
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-settings"]',
          popover: {
            title: 'Settings',
            description: 'Customize your experience, manage your profile, and configure your preferences.',
            side: 'right',
            align: 'start',
          },
        },
        {
          popover: {
            title: 'You\'re All Set! 🎉',
            description: 'Start by connecting your apps to see your unified workspace come to life. Click "Get Started" to begin!',
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem('yhc-tour-completed', 'true');
      },
    });

    driverObj.drive();
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('yhc-tour-completed');
  }, []);

  const hasTourCompleted = useCallback(() => {
    return localStorage.getItem('yhc-tour-completed') === 'true';
  }, []);

  return { startTour, resetTour, hasTourCompleted };
}

export function GuidedTour({ onComplete, autoStart = false }: GuidedTourProps) {
  const { startTour, hasTourCompleted } = useGuidedTour();

  useEffect(() => {
    if (autoStart && !hasTourCompleted()) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startTour, hasTourCompleted]);

  return null;
}
