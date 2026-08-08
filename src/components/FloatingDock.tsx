/**
 * Aceternity UI - Floating Dock
 * Inspired by Rauno Freiberg's dock and Build UI's recipe.
 */
import { cn } from "../lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type FloatingDockItem = {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  full?: boolean;
};

export const FloatingDock = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={className} />
      <FloatingDockMobile items={items} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[min(88vw,340px)] max-h-[60dvh] overflow-y-auto rounded-3xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 pb-2"
          >
            <div className="grid grid-cols-4 gap-2">
              {items.map((item, idx) => (
                <motion.button
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else if (item.href) {
                      navigate(item.href);
                    }
                    setOpen(false);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:bg-white/10 transition-colors"
                >
                  <div className={cn(
                    "flex items-center justify-center rounded-full bg-neutral-800",
                    item.full ? "h-12 w-12 overflow-hidden" : "h-12 w-12"
                  )}>
                    <div className={item.full ? "h-full w-full" : "h-6 w-6"}>{item.icon}</div>
                  </div>
                  <span className="text-[9px] font-bold text-neutral-400 text-center leading-tight">{item.title}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir menu"
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center bg-neutral-800 shadow-xl transition-transform active:scale-90",
          open && "rotate-90"
        )}
      >
        <IconLayoutNavbarCollapse className="h-6 w-6 text-neutral-300" />
      </button>
    </div>
  );
};

export const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-20 gap-4 items-end rounded-3xl bg-neutral-900 px-6 pb-4",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  full,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  full?: boolean;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() || { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [56, 100, 56]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [56, 100, 56]);

  let widthIconTransform = useTransform(distance, [-150, 0, 150], [34, 60, 34]);
  let heightIconTransform = useTransform(distance, [-150, 0, 150], [34, 60, 34]);

  let width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  let height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  let widthIcon = useSpring(widthIconTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  let heightIcon = useSpring(heightIconTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const inner = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="aspect-square rounded-full flex items-center justify-center relative bg-neutral-800"
    >
      <motion.div
        style={{ width: full ? width : widthIcon, height: full ? height : heightIcon }}
        className={cn("flex items-center justify-center", full && "overflow-hidden rounded-full")}
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  if (onClick) {
    return (
      <div onClick={handleClick} className="cursor-pointer group" title={title}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={href || '#'} className="cursor-pointer group" title={title}>
      {inner}
    </Link>
  );
}
