import React from 'react';
import { motion, Variants } from 'motion/react';

interface Props {
    children: React.ReactNode;
    className?: string;
}

const pageVariants: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        y: -8,
        transition: { duration: 0.25, ease: 'easeIn' }
    }
};

export const PageTransition: React.FC<Props> = ({ children, className }) => {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
