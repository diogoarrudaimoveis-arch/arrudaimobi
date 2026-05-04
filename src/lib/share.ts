import { toast } from "sonner";

export async function shareProperty(title: string, url?: string) {
  const shareUrl = url || window.location.href;
  const shareData = {
    title,
    text: `Confira este imóvel: ${title}`,
    url: shareUrl,
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado para a área de transferência!");
    }
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado para a área de transferência!");
    }
  }
}
