import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GiftCardRedemption } from "@/types/aceForms";
import { GiftCardDisplay } from "./GiftCardDisplay";
import { FireworksAnimation } from "./FireworksAnimation";

interface GiftCardRevealProps {
  redemption: GiftCardRedemption;
}

export function GiftCardReveal({ redemption }: GiftCardRevealProps) {
  const [stage, setStage] = useState<"validating" | "fireworks" | "flipping" | "revealed">("validating");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("fireworks"), 1000);
    const timer2 = setTimeout(() => setStage("flipping"), 2500);
    const timer3 = setTimeout(() => setStage("revealed"), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === "validating" && (
          <motion.div
            key="validating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Validating code...</p>
          </motion.div>
        )}

        {stage === "fireworks" && (
          <motion.div
            key="fireworks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <FireworksAnimation />
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-2xl font-bold text-primary"
            >
              Success! 🎉
            </motion.p>
          </motion.div>
        )}

        {stage === "flipping" && (
          <motion.div
            key="flipping"
            className="perspective-1000"
            style={{ perspective: "1000px" }}
          >
            <motion.div
              animate={{ rotateY: 180 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-80 h-48 relative"
            >
              {/* Front of card */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl flex items-center justify-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="text-4xl">🎁</div>
              </div>
              {/* Back of card - revealed */}
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <GiftCardDisplay redemption={redemption} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {stage === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
          >
            <GiftCardDisplay redemption={redemption} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
