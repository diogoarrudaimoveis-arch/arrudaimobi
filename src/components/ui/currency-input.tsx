import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (raw: string, formatted: string) => void;
}

function formatBRL(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  const formatted = (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
}

function parseToNumber(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toString();
}

export function CurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  const displayValue = value ? formatBRL(
    Math.round(parseFloat(value) * 100).toString()
  ) : "";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      onValueChange("", "");
      return;
    }
    const formatted = formatBRL(raw);
    const numeric = parseToNumber(formatted);
    onValueChange(numeric, formatted);
  }, [onValueChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        className="pl-10"
        value={displayValue}
        onChange={handleChange}
      />
    </div>
  );
}
