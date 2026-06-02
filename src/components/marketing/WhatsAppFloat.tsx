/**
 * 🎨 Arruda 2.0 — WhatsApp Floating Button
 * Sprint 2.5
 *
 * Botão flutuante de WhatsApp com pulsação contínua.
 * Aparece em todas as páginas públicas (via MainLayout).
 */

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

const DEFAULT_PHONE = "5531997918717"; // (31) 99791-8717 — Arruda Imobi
const DEFAULT_MESSAGE = "Olá! Vi o site da Arruda Imobi e gostaria de mais informações.";

export function WhatsAppFloat() {
  const { data: tenant } = useTenantSettings();
  const phone =
    tenant?.settings?.contact_phone?.replace(/\D/g, "") || DEFAULT_PHONE;
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-float transition-shadow hover:shadow-hover"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Pulse ring (animação contínua) */}
      <motion.span
        className="absolute inset-0 rounded-full bg-success/40"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <MessageCircle className="relative h-7 w-7" />
    </motion.a>
  );
}
