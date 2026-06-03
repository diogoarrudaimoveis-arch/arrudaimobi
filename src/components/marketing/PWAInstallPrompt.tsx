import { useState, useEffect } from "react";
import { X, Smartphone, Monitor, Tablet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

type DeviceType = "ios" | "android" | "desktop";

function getDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg/.test(ua)) return "Edge";
  if (/chrome/.test(ua)) return "Chrome";
  if (/safari/.test(ua) && !/chrome/.test(ua)) return "Safari";
  if (/firefox/.test(ua)) return "Firefox";
  return "navegador";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

const deviceConfig = {
  ios: {
    icon: <Smartphone className="w-16 h-16 text-blue-500" />,
    title: "Instalar no iPhone/iPad",
    steps: [
      { num: 1, text: "Toque no botão Compartilhar", action: "👆 Toque em 🗂️ (iPhones sem botão) ou no menu (iPads)", icon: "📱" },
      { num: 2, text: "Role para baixo e toque em 'Adicionar à Tela Início'", action: "📋 Ou arraste para baixo até ver a opção", icon: "➕" },
      { num: 3, text: "Toque em 'Adicionar' no canto superior direito", action: "✅ Confirme o nome 'Arruda Imobi'", icon: "✅" },
    ],
  },
  android: {
    icon: <Smartphone className="w-16 h-16 text-green-500" />,
    title: "Instalar no Android",
    steps: [
      { num: 1, text: "Toque no menu ⋮ no canto superior direito do navegador", action: "Ou arraste a página para baixo", icon: "⋮" },
      { num: 2, text: "Toque em 'Instalar aplicativo' ou 'Adicionar à tela inicial'", action: "Se não ver, toque nos 3 pontinhos → 'Adicionar à tela inicial'", icon: "📲" },
      { num: 3, text: "Confirme tocando em 'Instalar'", action: "✅ O ícone vai aparecer na tela inicial", icon: "✅" },
    ],
  },
  desktop: {
    icon: <Monitor className="w-16 h-16 text-purple-500" />,
    title: "Instalar no Computador",
    steps: [],
  },
};

const desktopBrowserConfig: Record<string, { title: string; steps: { num: number; text: string; action: string }[] }> = {
  chrome: {
    title: "Instalar no Chrome",
    steps: [
      { num: 1, text: "Clique no ícone de instalação na barra de endereço", action: "🖥️ Ou vá em Menu ⋮ → 'Instalar Arruda Imobi'", icon: "📥" },
      { num: 2, text: "Clique em 'Instalar' na janela que aparecer", action: "✅ O app vai abrir em janela separada", icon: "✅" },
    ],
  },
  edge: {
    title: "Instalar no Microsoft Edge",
    steps: [
      { num: 1, text: "Clique no ícone de instalação na barra de endereço", action: "🖥️ Ou vá em Menu ⋮ → 'Apps' → 'Instalar este site como app'", icon: "📥" },
      { num: 2, text: "Confirme a instalação", action: "✅ Arruda Imobi vai abrir como app separado", icon: "✅" },
    ],
  },
  safari: {
    title: "Instalar no Safari (Mac)",
    steps: [
      { num: 1, text: "Vá em Safari → 'Adicionar à Dock' (ou use o menu Compartilhar)", action: "🖥️ Ou clique em Compartilhar → 'Adicionar à Tela Início'", icon: "📥" },
      { num: 2, text: "Confirme o nome e clique 'Adicionar'", action: "✅ O app vai aparecer no Launchpad e Dock", icon: "✅" },
    ],
  },
  firefox: {
    title: "Instalar no Firefox",
    steps: [
      { num: 1, text: "Clique no botão de menu ☰ → 'Instalar' → 'Criar atalho'", action: "🖥️ Ou use a Barra de endereço para expandir o app", icon: "📥" },
      { num: 2, text: "Confirme criando o atalho na área de trabalho", action: "✅ O app vai funcionar como janela independente", icon: "✅" },
    ],
  },
};

export function PWAInstallPrompt({ onDismiss, forceShow }: PWAInstallPromptProps) {
  const [open, setOpen] = useState(false);
  const [deviceType] = useState<DeviceType>(getDeviceType);
  const [browser] = useState(getBrowser());
  const [localDismissed, setLocalDismissed] = useState(false);
  const alreadyInstalled = isStandalone();

  useEffect(() => {
    // First login detection: show prompt on first admin visit
    const dismissedKey = "pwa-install-dismissed";
    const firstLoginKey = "pwa-first-login-shown";
    const dismissed = localStorage.getItem(dismissedKey);
    const firstShown = localStorage.getItem(firstLoginKey);

    if (!alreadyInstalled && !dismissed && !firstShown) {
      // Mark as shown (don't annoy again)
      localStorage.setItem(firstLoginKey, new Date().toISOString());
      setOpen(true);
    } else if (forceShow && !alreadyInstalled && !dismissed) {
      setOpen(true);
    }
  }, [forceShow, alreadyInstalled]);

  if (alreadyInstalled) return null;
  if (localDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
    setLocalDismissed(true);
    setOpen(false);
    onDismiss?.();
  };

  const deviceConfigForDesktop = deviceType === "desktop" ? desktopBrowserConfig[browser.toLowerCase()] || desktopBrowserConfig.chrome : null;
  const steps = deviceType === "desktop" && deviceConfigForDesktop ? deviceConfigForDesktop.steps : (deviceConfig[deviceType]?.steps ?? []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Download className="w-5 h-5 text-primary" />
              Instalar Arruda Imobi
            </DialogTitle>
            <button
              onClick={handleDismiss}
              className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Device Icon */}
          <div className="flex justify-center">
            {deviceType === "ios" && <Smartphone className="w-16 h-16 text-blue-500" />}
            {deviceType === "android" && <Smartphone className="w-16 h-16 text-green-500" />}
            {deviceType === "desktop" && <Monitor className="w-16 h-16 text-purple-500" />}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {deviceType === "desktop"
              ? `Instale como app no seu ${browser} para acesso rápido e experiência completa.`
              : "Adicione à tela inicial para acesso rápido como um app nativo."}
          </p>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.action}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dismiss */}
          <Button variant="outline" className="w-full" onClick={handleDismiss}>
            Não obrigado, fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to trigger the prompt from anywhere
export function usePWAInstallPrompt() {
  const [show, setShow] = useState(false);

  const trigger = () => setShow(true);
  const reset = () => setShow(false);

  return { show, trigger, reset };
}