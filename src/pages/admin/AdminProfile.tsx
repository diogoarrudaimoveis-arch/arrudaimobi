import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Mail, KeyRound, Camera, User } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/lib/password-validation";

const AdminProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      // Remove old avatar files
      const { data: existing } = await supabase.storage.from("avatars").list(user.id);
      if (existing?.length) {
        await supabase.storage.from("avatars").remove(existing.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      if (updateErr) throw updateErr;

      await refreshProfile();
      toast({ title: "Foto atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: "Nome inválido", description: "Mínimo 2 caracteres.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    }).eq("user_id", profile?.user_id);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    }
  };

  const handleUpdateEmail = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    if (trimmed === user?.email) {
      toast({ title: "O email é o mesmo", variant: "destructive" });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSavingEmail(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verifique seu email", description: "Um link de confirmação foi enviado para o novo email." });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw) {
      toast({ title: "Informe a senha atual", variant: "destructive" });
      return;
    }
    if (!isPasswordValid(newPw)) {
      toast({ title: "Nova senha não atende aos requisitos", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPw,
    });
    if (signInErr) {
      setSavingPw(false);
      toast({ title: "Senha atual incorreta", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast({ title: "Senha alterada com sucesso!" });
    }
  };

  const initials = (profile?.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>

        {/* Avatar + Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Informações Pessoais
            </CardTitle>
            <CardDescription>Atualize sua foto e informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar upload */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.full_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Clique no ícone da câmera para alterar a foto (máx. 2MB)</p>
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome completo</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Bio / Sobre</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fale um pouco sobre você..." rows={3} maxLength={500} />
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" /> Alterar Email
            </CardTitle>
            <CardDescription>Email atual: {user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Novo email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button onClick={handleUpdateEmail} disabled={savingEmail || email.trim() === user?.email} className="gap-2">
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Atualizar Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" /> Alterar Senha
            </CardTitle>
            <CardDescription>Digite sua senha atual e defina uma nova</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Senha atual</label>
              <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Senha atual" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nova senha</label>
              <PasswordInput value={newPw} onChange={setNewPw} showRules placeholder="Nova senha" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirmar nova senha</label>
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Confirme a nova senha" />
              {confirmPw && newPw !== confirmPw && (
                <p className="mt-1 text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPw || !currentPw || !isPasswordValid(newPw) || newPw !== confirmPw}
              className="gap-2"
            >
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
