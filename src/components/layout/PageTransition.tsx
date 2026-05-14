import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useLocation } from "react-router-dom";

const pageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.12,
      ease: "easeIn" as const,
    },
  },
};

export function PageTransition({ children, animationKey }: { children: React.ReactNode, animationKey?: string }) {
  const location = useLocation();
  const key = animationKey || location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col flex-1 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
