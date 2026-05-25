import { useCookieConsent, type CookiePreferences } from "@/contexts/CookieConsentContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIES = [
  {
    key: "essential" as const,
    label: "Essenciais",
    description: "Necessários para o funcionamento básico do site. Não podem ser desativados.",
    locked: true,
  },
  {
    key: "functional" as const,
    label: "Funcionais",
    description: "Permitem lembrar suas preferências, como idioma e região, para uma experiência personalizada.",
    locked: false,
  },
  {
    key: "analytics" as const,
    label: "Analíticos",
    description: "Nos ajudam a entender como você usa o site para melhorar a experiência de navegação.",
    locked: false,
  },
  {
    key: "marketing" as const,
    label: "Marketing",
    description: "Utilizados para exibir anúncios relevantes com base nos seus interesses.",
    locked: false,
  },
];

export function CookieConsent() {
  const {
    preferences,
    showBanner,
    showSettings,
    setShowSettings,
    acceptAll,
    rejectNonEssential,
    savePreferences,
  } = useCookieConsent();

  const [localPrefs, setLocalPrefs] = useState<CookiePreferences>(preferences);

  const handleOpenSettings = () => {
    setLocalPrefs(preferences);
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    savePreferences(localPrefs);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-500">
          <div className="border-t bg-card/95 backdrop-blur-md shadow-lg">
            <div className="container py-4 sm:py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Sua privacidade é importante para nós
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      Utilizamos cookies para melhorar sua experiência. Cookies não essenciais só serão
                      ativados com seu consentimento.{" "}
                      <Link to="/privacidade" className="underline text-primary hover:text-primary/80 transition-colors">
                        Política de Privacidade
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSettings}
                    className="gap-1.5 text-xs"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configurar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectNonEssential}
                    className="text-xs"
                  >
                    Rejeitar não essenciais
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="text-xs"
                  >
                    Aceitar todos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Shield className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription className="text-sm">
              Escolha quais categorias de cookies deseja permitir. Cookies essenciais são sempre
              ativos para garantir o funcionamento do site. Você pode alterar suas preferências a
              qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    {cat.locked && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Sempre ativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
                <Switch
                  checked={cat.locked ? true : localPrefs[cat.key]}
                  onCheckedChange={(checked) => {
                    if (!cat.locked) {
                      setLocalPrefs((prev) => ({ ...prev, [cat.key]: checked }));
                    }
                  }}
                  disabled={cat.locked}
                  className="shrink-0 mt-0.5"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={rejectNonEssential} className="text-xs">
              Rejeitar não essenciais
            </Button>
            <Button variant="outline" size="sm" onClick={acceptAll} className="text-xs">
              Aceitar todos
            </Button>
            <Button size="sm" onClick={handleSaveSettings} className="text-xs">
              Salvar preferências
            </Button>
          </DialogFooter>

          <p className="text-center text-[11px] text-muted-foreground">
            Conforme a{" "}
            <Link to="/privacidade" className="underline hover:text-primary transition-colors">
              Política de Privacidade
            </Link>{" "}
            e a LGPD (Lei 13.709/2018).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
