import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Mail, Lock, User, Phone, Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/lib/password-validation";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function checkAuthRateLimit(authAction: string): Promise<{ allowed: boolean; retry_after?: number; error?: string }> {
  try {
    const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/submit-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-auth-rate-limit", auth_action: authAction }),
    });
    const data = await res.json();
    if (res.status === 429) return { allowed: false, retry_after: data.retry_after, error: data.error };
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const rateCheck = await checkAuthRateLimit("reset-password");
    if (!rateCheck.allowed) {
      toast({ title: "Muitas tentativas", description: rateCheck.error || "Aguarde antes de tentar novamente.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/manage-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-reset-email", email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        toast({ title: "Muitas tentativas", description: data.error || "Aguarde antes de tentar novamente.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível iniciar a recuperação de senha.");
      }

      if (data.fallback) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/#/reset-password`,
        });

        if (error) {
          throw error;
        }
      }

      setSent(true);
    } catch (primaryError) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/#/reset-password`,
        });

        if (error) {
          throw error;
        }

        setSent(true);
      } catch (fallbackError) {
        const message = fallbackError instanceof Error
          ? fallbackError.message
          : primaryError instanceof Error
            ? primaryError.message
            : "Erro ao enviar recuperação de senha.";

        toast({ title: "Erro", description: message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm text-primary hover:underline"
      >
        Esqueci minha senha
      </button>
    );
  }

  if (sent) {
    return (
      <p className="text-center text-sm text-primary">
        Se o email informado estiver cadastrado, um link de recuperação será enviado. Verifique sua caixa de entrada.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        Informe seu email para receber o link de recuperação:
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="seu@email.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading} className="flex-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

const Login = () => {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { data: tenant } = useTenantSettings();
  const companyName = tenant?.name || "Sua Imobiliária";
  const registrationAllowed = tenant?.settings?.allow_registration !== false;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  

  if (isReady && user) return <Navigate to="/admin" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const rateCheck = await checkAuthRateLimit("login");
    if (!rateCheck.allowed) {
      toast({ title: "Muitas tentativas", description: rateCheck.error || "Aguarde antes de tentar novamente.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bem-vindo!" });
      navigate("/admin");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    

    if (!notRobot) {
      toast({ title: "Confirme que não é um robô", variant: "destructive" });
      return;
    }

    const name = regName.trim();
    const email = regEmail.trim();
    const phone = regPhone.trim();

    if (name.length < 2 || name.length > 100) {
      toast({ title: "Nome inválido", description: "Entre 2 e 100 caracteres.", variant: "destructive" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }

    if (!isPasswordValid(regPassword)) {
      toast({ title: "Senha não atende aos requisitos", description: "Verifique as regras abaixo do campo de senha.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const rateCheck = await checkAuthRateLimit("register");
      if (!rateCheck.allowed) {
        toast({ title: "Muitas tentativas", description: rateCheck.error || "Aguarde antes de tentar novamente.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: regPassword,
        options: {
          data: { full_name: name, phone },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
      } else {
        console.log("Signup success:", data);
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    } catch (err: any) {
      console.error("Unexpected signup error:", err);
      toast({ title: "Erro inesperado", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
              {companyName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta ou crie uma nova</p>
          </div>

          <Card className="p-6">
            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="flex-1" disabled={!registrationAllowed}>Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="seu@email.com" className="pl-10" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={loginShowPw ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setLoginShowPw(!loginShowPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        tabIndex={-1}
                      >
                        {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>

                <ForgotPassword />
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                {!registrationAllowed ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium text-foreground">Cadastro desabilitado</p>
                    <p className="text-sm text-muted-foreground">O registro de novos usuários está temporariamente indisponível. Entre em contato com o administrador.</p>
                  </div>
                ) : (
                <form onSubmit={handleRegister} className="space-y-4">

                  <div>
                    <label className="mb-1 block text-sm font-medium">Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Seu nome" className="pl-10" value={regName} onChange={(e) => setRegName(e.target.value)} required maxLength={100} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="seu@email.com" className="pl-10" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required maxLength={255} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="(11) 99999-0000" className="pl-10" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} maxLength={20} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Senha</label>
                    <PasswordInput value={regPassword} onChange={setRegPassword} showRules />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="not-robot"
                      checked={notRobot}
                      onCheckedChange={(checked) => setNotRobot(checked === true)}
                    />
                    <label htmlFor="not-robot" className="text-sm text-muted-foreground cursor-pointer select-none">
                      Não sou um robô
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Ao criar sua conta, você concorda com nossos{" "}
                    <Link to="/termos" className="text-primary hover:underline">Termos de Serviço</Link>{" "}
                    e{" "}
                    <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
                  </p>
                </form>
                )}
              </TabsContent>
            </Tabs>

          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Login;
