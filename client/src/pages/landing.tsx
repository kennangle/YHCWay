import { Command } from "lucide-react";
import { Link } from "wouter";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-50"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-2xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Command className="w-7 h-7" />
            </div>
          </div>
          
          <h1 className="font-display font-bold text-5xl md:text-6xl mb-6 tracking-tight">
            UniWork
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            All your tools in one place. Slack, Gmail, Calendar, and Zoom unified into a single, beautiful workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-semibold text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105"
              data-testid="button-get-started"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-primary/30 text-primary font-semibold text-lg hover:bg-primary/10 transition-all"
              data-testid="button-login"
            >
              Sign In
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground">
            Sign in with Google or email
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            { title: "Unified Feed", desc: "All your messages, emails, and events in one timeline" },
            { title: "Smart Connections", desc: "Connect your favorite apps with one click" },
            { title: "Stay Focused", desc: "See what matters most without switching tabs" },
          ].map((feature) => (
            <div key={feature.title} className="glass-card p-6 rounded-2xl text-center">
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
