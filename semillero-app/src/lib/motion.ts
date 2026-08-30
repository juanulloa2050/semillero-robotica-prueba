export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

export const DURATION = {
  fast: 0.2,
  base: 0.35,
  slow: 0.55,
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, delay: i * 0.07, ease: EASE_OUT },
  }),
};
