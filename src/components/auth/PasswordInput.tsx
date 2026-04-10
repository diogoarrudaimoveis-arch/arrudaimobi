import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { validatePassword, getPasswordStrength, type PasswordRules } from "@/lib/password-validation";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  showRules?: boolean;
  placeholder?: string;
  id?: string;
}

const RULES_CONFIG: { key: keyof PasswordRules; label: string }[] = [
  { key: "minLength", label: "Mínimo 8 caracteres" },
  { key: "hasUpper", label: "1 letra maiúscula" },
  { key: "hasLower", label: "1 letra minúscula" },
  { key: "hasNumber", label: "1 número" },
  { key: "hasSpecial", label: "1 caractere especial (!@#$...)" },
];

export function PasswordInput({ value, onChange, showRules = false, placeholder = "••••••••", id }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const rules = useMemo(() => validatePassword(value), [value]);
  const strength = useMemo(() => getPasswordStrength(value), [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="pl-10 pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          tabIndex={-1}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showRules && value.length > 0 && (
        <>
          {/* Strength bar */}
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all",
                    level <= strength.score ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className={cn("text-xs font-medium", {
              "text-destructive": strength.score === 1,
              "text-warning": strength.score === 2,
              "text-info": strength.score === 3,
              "text-success": strength.score === 4,
            })}>
              Senha {strength.label}
            </p>
          </div>

          {/* Rules checklist */}
          <ul className="space-y-1">
            {RULES_CONFIG.map(({ key, label }) => (
              <li key={key} className="flex items-center gap-2 text-xs">
                {rules[key] ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn(rules[key] ? "text-success" : "text-muted-foreground")}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
