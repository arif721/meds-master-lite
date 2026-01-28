import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import gaziLogo from '@/assets/gazi-logo.svg';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email.trim(), password);
        
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        toast({
          title: 'অ্যাকাউন্ট তৈরি হয়েছে',
          description: 'আপনি এখন লগইন করতে পারবেন',
        });
        setIsSignUp(false);
        setConfirmPassword('');
      } else {
        const { error: signInError } = await signIn(email.trim(), password);

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('ভুল ইমেইল বা পাসওয়ার্ড');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('ইমেইল ভেরিফাই করা হয়নি');
          } else {
            setError(signInError.message);
          }
          return;
        }

        toast({
          title: 'লগইন সফল',
          description: 'স্বাগতম!',
        });
      }
    } catch (err) {
      setError('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={gaziLogo} alt="Gazi Laboratories" className="w-20 h-20 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Gazi Laboratories</h1>
            <p className="text-sm text-muted-foreground">Inventory Management System</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isSignUp ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'লগইন হচ্ছে...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      সাইন আপ করুন
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      লগইন করুন
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          {/* Toggle between Login and Sign Up */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setConfirmPassword('');
              }}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {isSignUp ? 'আগে থেকে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Mamtaj Center, Islamiahat<br />
              Hathazari, Chattogram<br />
              +880 1987-501700
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
