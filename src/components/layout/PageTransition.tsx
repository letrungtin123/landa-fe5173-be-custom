import { motion, type Variants } from "framer-motion";
import { useLocation } from "react-router-dom";

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export function PageTransition({ children, animationKey }: { children: React.ReactNode, animationKey?: string }) {
  const location = useLocation();
  const key = animationKey || location.pathname;

  return (
    <motion.div
      key={key}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="flex min-h-full w-full flex-col"
    >
      {children}
    </motion.div>
  );
}
