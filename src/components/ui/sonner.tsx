import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
export const sonnerToast = (opts: { title: string; description?: string; variant?: string }) => {
  const { title, description, variant, ...rest } = opts;
  // DEFENSIVE: ensure title is always a string to prevent React Error #31
  const safeTitle = typeof title === 'string' ? title : String(title ?? 'Notificação');
  const safeDesc = typeof description === 'string' ? description
    : description != null ? String(description) : undefined;
  if (variant === "destructive") {
    toast.error(safeTitle, { description: safeDesc, ...rest });
  } else {
    toast.success(safeTitle, { description: safeDesc, ...rest });
  }
};