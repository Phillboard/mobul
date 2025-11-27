import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GiftCardDisplay } from "./GiftCardDisplay";
import { GiftCardInstructions } from "./GiftCardInstructions";
import { FireworksAnimation } from "./FireworksAnimation";
import { GiftCardRedemption, RevealSettings } from "@/types/aceForms";
import { Share2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface GiftCardRevealProps {
  redemption: GiftCardRedemption;
  revealSettings?: RevealSettings;
  embedMode?: boolean;
  skipReveal?: boolean;
}

export function GiftCardReveal({ redemption, revealSettings, embedMode = false, skipReveal = false }: GiftCardRevealProps) {
  const [revealed, setRevealed] = useState(skipReveal);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  // Apply revealSettings for confetti
  const shouldShowConfetti = revealSettings?.showConfetti !== false;
  const animationStyle = revealSettings?.animationStyle || 'confetti';

  useEffect(() => {
    if (skipReveal) {
      setRevealed(true);
      if (shouldShowConfetti) {
        setShowConfetti(true);
      }
    }
  }, [skipReveal, shouldShowConfetti]);

  useEffect(() => {
    if (revealed && shouldShowConfetti) {
      setShowConfetti(true);
      // Play a subtle sound effect (optional)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmi77eefTRAMUKjj8LZjHAU5ktfyzH');
        audio.volume = 0.3;
        audio.play().catch((err) => {
          logger.debug('Audio playback failed (expected if user has not interacted):', err);
        });
      } catch (error) {
        logger.debug('Audio initialization failed:', error);
      }
    }
  }, [revealed, shouldShowConfetti]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${redemption.brand_name} Gift Card`,
          text: `I just received a $${redemption.card_value} ${redemption.brand_name} gift card!`,
        });
      } catch (error) {
        // User cancelled sharing or browser doesn't support it
        logger.debug('Share cancelled or not supported:', error);
      }
    } else {
      toast({
        title: "Share",
        description: "Sharing is not supported on this device",
      });
    }
  };

  const handleAddToWallet = () => {
    toast({
      title: "Add to Wallet",
      description: "Wallet integration coming soon!",
    });
  };

  const handleDownload = () => {
    // Generate a simple text file with the gift card details
    const content = `
${redemption.brand_name} Gift Card
Value: $${redemption.card_value}
Code: ${redemption.card_code}
${redemption.card_number ? `Number: ${redemption.card_number}` : ''}

${redemption.redemption_instructions || ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-card-${redemption.card_code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Gift card details saved to your device",
    });
  };

  // Apply background from revealSettings
  const backgroundClass = revealSettings?.revealBackground === 'solid' 
    ? 'bg-background'
    : revealSettings?.revealBackground === 'transparent'
    ? 'bg-transparent'
    : 'bg-gradient-to-br from-purple-50 via-white to-blue-50';

  return (
    <div className={`${embedMode ? 'bg-transparent py-4' : `min-h-screen ${backgroundClass} py-8`} flex items-center justify-center px-4`}>
      <AnimatePresence>
        {showConfetti && <FireworksAnimation />}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={embedMode ? 'w-full' : 'max-w-2xl w-full'}
      >
        {!revealed ? (
          <motion.div
            className="text-center space-y-8"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={animationStyle !== 'none' ? {
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="text-8xl filter drop-shadow-2xl"
            >
              🎁
            </motion.div>
            
            <motion.h1 
              className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              You've Got a Gift!
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Click the gift to reveal your reward
            </motion.p>
            
            <motion.button
              onClick={() => setRevealed(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-5 rounded-full text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <span className="relative z-10">Reveal My Gift Card</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="flex items-center justify-center"
            >
              <GiftCardDisplay redemption={redemption} revealSettings={revealSettings} embedMode={embedMode} />
            </motion.div>

            {/* Action Buttons - Conditionally rendered based on revealSettings */}
            {!embedMode && (revealSettings?.showShareButton || revealSettings?.showDownloadButton) && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                {/* SECONDARY - Smaller action buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {revealSettings?.showShareButton !== false && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleShare}
                      className="gap-2 bg-card"
                    >
                      <Share2 className="w-3 h-3" />
                      Share
                    </Button>
                  )}
                  
                  {revealSettings?.showDownloadButton !== false && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                      className="gap-2 bg-card"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
