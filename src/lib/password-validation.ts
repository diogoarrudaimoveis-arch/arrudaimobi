export interface PasswordRules {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function validatePassword(password: string): PasswordRules {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const rules = validatePassword(password);
  return Object.values(rules).every(Boolean);
}

export function getPasswordStrength(password: string): { label: string; score: number; color: string } {
  const rules = validatePassword(password);
  const passed = Object.values(rules).filter(Boolean).length;

  if (passed <= 2) return { label: "Fraca", score: 1, color: "bg-destructive" };
  if (passed <= 3) return { label: "Média", score: 2, color: "bg-warning" };
  if (passed <= 4) return { label: "Boa", score: 3, color: "bg-info" };
  return { label: "Forte", score: 4, color: "bg-success" };
}
