/**
 * 🎨 Arruda 2.0 — Framer Motion Animation Presets
 * Sprint 2.1 (Setup)
 *
 * Padrões reutilizáveis para todas as animações de UI.
 * Use com `motion` do framer-motion + `viewport={{ once: true }}` para lazy animations.
 */

import type { Variants, Transition } from "framer-motion";

/** Transição base — suave e snappy */
export const baseTransition: Transition = {
  duration: 0.5,
  ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
};

/** Fade + slide up (entrada padrão) */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/** Fade in simples */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale in (zoom suave) */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/** Slide da esquerda */
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/** Slide da direita */
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/** Container com stagger (lista de filhos animados em sequência) */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/** Item filho do stagger — fadeInUp */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/** Hover lift (sombra + translate) */
export const hoverLift = {
  whileHover: { y: -8, transition: { duration: 0.3, ease: "easeOut" as const } },
  whileTap: { y: -2, scale: 0.98 },
};

/** Hover zoom para imagens (1.05x) */
export const hoverZoom = {
  whileHover: { scale: 1.05, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/** Pulse contínuo (WhatsApp, indicadores) */
export const pulseContinuous = {
  animate: {
    scale: [1, 1.15, 1],
    opacity: [0.7, 0.3, 0.7],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

/** Float (cards decorativos) */
export const floatAnimation = {
  animate: {
    y: [0, -20, 0],
  },
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

/** Viewport config — lazy trigger quando elemento entra na tela */
export const viewportOnce = { once: true, margin: "-50px" } as const;
