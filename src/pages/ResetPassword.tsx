import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/lib/password-validation";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenMode, setTokenMode] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [sessionValidating, setSessionValidating] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("token");

    if (urlToken) {
      // SMTP-based token flow
      setToken(urlToken);
      setTokenMode(true);
      verifyToken(urlToken);
      return;
    }

    // Capture Supabase native recovery from hash
    const handleHashSession = async () => {
      const hash = window.location.hash;
      console.log("[ResetPassword] Checking hash for session...");

      if (hash.includes("access_token=")) {
        setSessionValidating(true);
        // Robust parsing handling HashRouter
        // Typical hash: #/reset-password#access_token=...&refresh_token=...
        const hashSegments = hash.split("#");
        const tokenSegment = hashSegments.find(s => s.includes("access_token="));

        if (tokenSegment) {
          const params = new URLSearchParams(tokenSegment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("[ResetPassword] Tokens found in hash, setting session...");
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              console.error("[ResetPassword] Error setting session from hash:", error.message);
            } else {
              console.log("[ResetPassword] Session set successfully from hash");
              setIsRecovery(true);
            }
          }
        }
        setSessionValidating(false);
      }
    };

    handleHashSession();

    // Supabase native recovery flow (event listener fallback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && window.location.hash.includes("type=recovery"))) {
          console.log("[ResetPassword] Auth event:", event, session ? "Session present" : "No session");
          setIsRecovery(true);
          setVerifying(false);
        }
      }
    );

    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
      setVerifying(false);
    } else if (!urlToken && !window.location.hash.includes("access_token=")) {
      // No token and no recovery hash - wait a bit for auth event
      const timeout = setTimeout(() => setVerifying(false), 2000);
      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const verifyToken = async (t: string) => {
    try {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/manage-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-reset-token", token: t }),
      });

      const data = await res.json();

      if (data.valid && data.email) {
        setIsRecovery(true);
        // Mask email for display
        const [user, domain] = data.email.split("@");
        const masked = user.length > 2
          ? user[0] + "***" + user[user.length - 1] + "@" + domain
          : user[0] + "***@" + domain;
        setMaskedEmail(masked);
      } else {
        setIsRecovery(false);
      }
    } catch {
      setIsRecovery(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid(password)) {
      toast({
        title: "Senha não atende aos requisitos",
        description: "Verifique as regras abaixo do campo de senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (tokenMode && token) {
      // SMTP token-based reset
      try {
        const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/manage-smtp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset-password", token, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast({
            title: "Erro ao redefinir senha",
            description: data.error || "Tente novamente.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setSuccess(true);
        toast({ title: "Senha redefinida com sucesso!" });
        setTimeout(() => navigate("/login"), 2000);
      } catch {
        toast({
          title: "Erro de conexão",
          description: "Verifique sua internet e tente novamente.",
          variant: "destructive",
        });
      }
    } else {
      // Supabase native reset
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        console.error("[ResetPassword] Session is missing before update attempt");
        toast({
          title: "Sessão expirada ou ausente",
          description: "Não foi possível validar sua identidade. Solicite um novo link.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("[ResetPassword] Error updating password:", error.message);
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({ title: "Senha redefinida com sucesso!" });
        setTimeout(() => navigate("/admin"), 2000);
      }
    }

    setLoading(false);
  };

  return (
    <Layout>
      <section className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
              Redefinir Senha
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {success
                ? "Sua senha foi atualizada"
                : maskedEmail
                  ? `Redefinir senha para ${maskedEmail}`
                  : "Digite sua nova senha abaixo"}
            </p>
          </div>

          <Card className="p-6">
            {verifying || sessionValidating ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {sessionValidating ? "Verificando sessão..." : "Verificando link..."}
                </p>
              </div>
            ) : success ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-primary" />
                <p className="text-center text-sm text-muted-foreground">
                  Redirecionando para o {tokenMode ? "login" : "painel"}...
                </p>
              </div>
            ) : !isRecovery ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Link inválido ou expirado. Solicite um novo link de recuperação na página de login.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/login")}
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nova senha</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    showRules
                    placeholder="Digite sua nova senha"
                  />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  disabled={loading || sessionValidating || !isPasswordValid(password)}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Redefinir Senha"
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default ResetPassword;
