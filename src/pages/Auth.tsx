import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

import { userProfileSchema, sanitizeText } from "@/lib/validation";

/* ── Demo employees (Acme Inc test users) ── */
const DEMO_USERS = [
  { name: "Jordan Lee",        email: "jordan.lee@acmecorp.com",        dept: "IT",          role: "Sr. Software Engineer",        avatar: "JL", color: "#06B6D4" },
  { name: "Maya Patel",        email: "maya.patel@acmecorp.com",        dept: "HR",          role: "HR Business Partner",          avatar: "MP", color: "#8B5CF6" },
  { name: "Carlos Rodriguez",  email: "carlos.rodriguez@acmecorp.com",  dept: "Finance",     role: "Financial Analyst",            avatar: "CR", color: "#10B981" },
  { name: "Sarah Kim",         email: "sarah.kim@acmecorp.com",         dept: "Legal",       role: "Associate Counsel",            avatar: "SK", color: "#F59E0B" },
  { name: "Marcus Thompson",   email: "marcus.thompson@acmecorp.com",   dept: "Facilities",  role: "Office Manager",               avatar: "MT", color: "#38BDF8" },
  { name: "Priya Singh",       email: "priya.singh@acmecorp.com",       dept: "Security",    role: "Security Analyst",             avatar: "PS", color: "#F43F5E" },
  { name: "David Chen",        email: "david.chen@acmecorp.com",        dept: "Operations",  role: "Operations Manager",           avatar: "DC", color: "#84CC16" },
  { name: "Rachel Foster",     email: "rachel.foster@acmecorp.com",     dept: "Marketing",   role: "Brand Manager",                avatar: "RF", color: "#EC4899" },
  { name: "James Wilson",      email: "james.wilson@acmecorp.com",      dept: "IT",          role: "DevOps Engineer",              avatar: "JW", color: "#06B6D4" },
  { name: "Aisha Johnson",     email: "aisha.johnson@acmecorp.com",     dept: "HR",          role: "Talent Acquisition Specialist",avatar: "AJ", color: "#8B5CF6" },
];
const DEMO_PASSWORD = "Acme@2026!";

// Enhanced validation schemas with security requirements
const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(1, "Password is required")
    .max(128, "Password must be less than 128 characters"),
});

const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens and apostrophes"),
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
});

const resetPasswordSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupDepartment, setSignupDepartment] = useState("");
  const signupCompany = "Acme Inc";
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [signingInAs, setSigningInAs] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectToDepartmentDashboard(session.user.id);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await redirectToDepartmentDashboard(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const redirectToDepartmentDashboard = async (_userId: string) => {
    // All employees go to the Employee Portal (FrontDoor)
    navigate("/portal");
  };

  const demoLoginAs = async (email: string, name: string) => {
    setSigningInAs(email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });
      if (error) toast.error(`Could not sign in as ${name}: ${error.message}`);
    } catch {
      toast.error("Sign-in failed");
    } finally {
      setSigningInAs(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedEmail = z.string().trim().email().parse(resetEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      // Log security event - no customer_id available for password reset
      // Skip audit log to avoid foreign key constraint
      toast.success("Password reset email sent! Check your inbox.");
      setShowResetForm(false);
      setResetEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Please enter a valid email address");
      } else {
        toast.error("Failed to send reset email");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      const validatedData = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message);
      } else {
        toast.success("Logged in successfully");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'openid email profile User.Read Calendars.Read Mail.Read Files.Read.All Chat.Read',
          redirectTo: `${window.location.origin}/portal`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Microsoft");
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedData = signupSchema.parse({
        fullName: signupName,
        companyName: signupCompany,
        email: signupEmail,
        password: signupPassword,
      });

      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: {
            full_name: validatedData.fullName,
            company_name: validatedData.companyName,
            department: signupDepartment || "General",
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // AuthContext.loadProfile will auto-create employee_profiles on first session
      toast.success("Account created! Check your email to confirm, then sign in.");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        const errorMessage = error.message?.includes('already registered')
          ? 'An account with this email already exists'
          : error.message || "An error occurred during signup";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4"
      style={{ background: "#0B1120", fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── DEMO USER SWITCHER ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", paddingTop: 32, paddingBottom: 24 }}>
        <div style={{
          background: "#111927", border: "1px solid rgba(232,160,32,0.22)",
          borderRadius: 14, padding: "20px 24px",
          boxShadow: "0 0 40px rgba(232,160,32,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke="#E8A020" strokeWidth="1.5"/>
            </svg>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#E8A020", letterSpacing: "0.07em" }}>
              DEMO · ACME INC — SIGN IN AS ANY EMPLOYEE
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#3D5068", marginBottom: 16, marginLeft: 26 }}>
            Click any card to instantly authenticate as that employee and explore their portal.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 8,
          }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                onClick={() => demoLoginAs(u.email, u.name)}
                disabled={!!signingInAs}
                style={{
                  background: signingInAs === u.email ? u.color + "18" : "#0F1829",
                  border: `1px solid ${signingInAs === u.email ? u.color + "60" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                  textAlign: "left", transition: "all 0.15s",
                  opacity: signingInAs && signingInAs !== u.email ? 0.45 : 1,
                }}
                onMouseEnter={e => {
                  if (!signingInAs) {
                    e.currentTarget.style.borderColor = u.color + "50";
                    e.currentTarget.style.background = u.color + "12";
                  }
                }}
                onMouseLeave={e => {
                  if (signingInAs !== u.email) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.background = "#0F1829";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: u.color + "22", border: `1px solid ${u.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: u.color,
                    fontFamily: "'DM Mono',monospace", flexShrink: 0,
                  }}>
                    {signingInAs === u.email ? "…" : u.avatar}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: "#ECF1FA",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{u.name}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: u.color, fontFamily: "'DM Mono',monospace",
                  marginBottom: 2,
                }}>{u.dept}</div>
                <div style={{
                  fontSize: 10, color: "#3D5068", lineHeight: 1.3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{u.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STANDARD AUTH CARD ── */}
      <div className="flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Sign in to access your portal or create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Microsoft 365 SSO - Primary Authentication */}
          <div className="space-y-4 mb-6">
            <Button 
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 text-base font-medium"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z"/>
                <path fill="#81bc06" d="M12 0h11v11H12z"/>
                <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                <path fill="#ffba08" d="M12 12h11v11H12z"/>
              </svg>
              Sign in with Microsoft 365
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {showResetForm ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowResetForm(false);
                        setResetEmail("");
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors text-center w-full"
                  >
                    Forgot your password?
                  </button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-company">Company</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    value="Acme Inc"
                    readOnly
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-dept">Department</Label>
                  <Select value={signupDepartment} onValueChange={setSignupDepartment}>
                    <SelectTrigger id="signup-dept">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Facilities">Facilities</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="General">Other / General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={12}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be 12+ characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;