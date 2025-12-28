import { Clock, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";

export default function PendingApproval() {
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (user.approvalStatus === "approved") {
    return <Redirect to="/dashboard" />;
  }

  if (user.approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{ 
            backgroundImage: `url(${generatedBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className="font-display font-bold text-2xl mb-2" data-testid="text-rejected-title">
            Account Not Approved
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Unfortunately, your account registration was not approved. If you believe this is a mistake, please contact your administrator.
          </p>
          
          <div className="space-y-3">
            <a 
              href="mailto:ken@kennangle.com"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
              data-testid="button-contact-admin"
            >
              <Mail className="w-4 h-4" />
              Contact Administrator
            </a>
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all"
              data-testid="button-logout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center relative z-10">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        
        <h1 className="font-display font-bold text-2xl mb-2" data-testid="text-pending-title">
          Account Pending Approval
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Thank you for registering! Your account is currently being reviewed by an administrator. You'll receive an email once your account has been approved.
        </p>
        
        <div className="glass-card rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold mb-3">What happens next?</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              </div>
              <div>
                <div className="font-medium">Account Created</div>
                <div className="text-muted-foreground">Your account has been created successfully</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <div className="font-medium">Pending Review</div>
                <div className="text-muted-foreground">An admin will review your registration</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Email Notification</div>
                <div className="text-muted-foreground">You'll be notified when approved</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
            data-testid="button-refresh"
          >
            Check Status
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all"
            data-testid="button-logout"
          >
            Sign Out
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-6">
          Questions? Contact <a href="mailto:ken@kennangle.com" className="text-primary hover:underline">ken@kennangle.com</a>
        </p>
      </div>
    </div>
  );
}
