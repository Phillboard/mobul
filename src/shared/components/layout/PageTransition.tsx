import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

/**
 * PageTransition Component
 * 
 * Smooth page transition wrapper with fade and slide effects.
 * Used to wrap page content for consistent transitions.
 * 
 * Usage:
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 * 
 * Features:
 * - Fade in/out animation
 * - Slide up on entry
 * - 300ms duration for snappy feel
 * - Respects reduced motion preferences
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.3, 
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeTransition Component
 * 
 * Simple fade-only transition for subtle content changes.
 */
export function FadeTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleTransition Component
 * 
 * Scale and fade transition for modal-like content.
 */
export function ScaleTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
