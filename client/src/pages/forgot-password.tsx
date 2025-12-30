import { useState } from "react";
import { Link } from "wouter";
import { Command, Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/">
              <div className="inline-flex items-center gap-3 cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  <Command className="w-6 h-6" />
                </div>
                <span className="font-display font-bold text-3xl">UniWork360</span>
              </div>
            </Link>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            {isSubmitted ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
                <p className="text-muted-foreground mb-6">
                  If an account exists with {email}, you'll receive a password reset link shortly.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-center mb-2">Forgot password?</h2>
                <p className="text-muted-foreground text-center mb-6">
                  Enter your email and we'll send you a reset link.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-send-reset"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-primary hover:underline" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
