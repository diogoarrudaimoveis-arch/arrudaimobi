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
export const sonnerToast = (opts: any) => {
  // CRITICAL: handle ALL input shapes defensively to prevent React Error #31
  // Possible inputs:
  //   1. { title: string, description?, variant? }  — normal case
  //   2. "string"                                    — accidentally passed string instead of object
  //   3. { message: string, ... }                    — sonner-native shape
  //   4. { title: { foo: "bar" } }                   — nested object bug
  //   5. undefined / null                            — no-op

  if (opts == null) return;
  // If accidentally passed a string, treat it as title
  if (typeof opts === 'string') {
    toast.success(opts);
    return;
  }
  if (typeof opts !== 'object') {
    toast.success(String(opts));
    return;
  }

  // Extract title from multiple possible keys
  let title: any = opts.title ?? opts.message;
  let description: any = opts.description;
  const variant = opts.variant;
  // Drop any other keys that could leak as React children
  const rest: any = {};

  // Defensive coercion
  if (title != null && typeof title === 'object') {
    console.error('[sonnerToast] NON-STRING TITLE DETECTED', { title, description, variant });
    title = String(JSON.stringify(title).slice(0, 200) || 'Notificação');
  }
  if (description != null && typeof description === 'object') {
    console.error('[sonnerToast] NON-STRING DESCRIPTION DETECTED', { description });
    description = String(JSON.stringify(description).slice(0, 500));
  }
  if (typeof title !== 'string') {
    title = title == null ? 'Notificação' : String(title);
  }
  if (typeof description !== 'string' && description != null) {
    description = String(description);
  }

  if (variant === "destructive") {
    toast.error(title, { description });
  } else {
    toast.success(title, { description });
  }
};

// Backward-compat shims in case something calls sonnerToast.success / .error
(sonnerToast as any).success = (title: any, opts?: any) => sonnerToast({ ...(opts || {}), title });
(sonnerToast as any).error = (title: any, opts?: any) => sonnerToast({ ...(opts || {}), title, variant: 'destructive' });