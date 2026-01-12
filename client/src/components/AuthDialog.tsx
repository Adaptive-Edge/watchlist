import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "login" | "register" | "link";
}

export function AuthDialog({ open, onOpenChange, mode: initialMode = "login" }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register" | "link">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register, linkAccount } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if ((mode === "register" || mode === "link") && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register(email, password);
      } else if (mode === "link") {
        await linkAccount(email, password);
      }
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      const message = err?.message || "An error occurred";
      if (message.includes("409")) {
        setError("Email already registered");
      } else if (message.includes("401")) {
        setError("Invalid email or password");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const switchMode = (newMode: "login" | "register" | "link") => {
    setMode(newMode);
    setError(null);
  };

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "Sign In";
      case "register":
        return "Create Account";
      case "link":
        return "Link Your Account";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "login":
        return "Sign in to access your watchlist from any device";
      case "register":
        return "Create an account to save your preferences";
      case "link":
        return "Add email and password to keep your existing data";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {(mode === "register" || mode === "link") && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : getTitle()}
          </Button>
        </form>
        {mode !== "link" && (
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
