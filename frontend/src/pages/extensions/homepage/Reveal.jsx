import React, { useEffect, useRef, useState } from "react";

/**
 * Reveal
 * ------
 * Drop-in replacement for framer-motion's `whileInView` fade/slide pattern,
 * without shipping a JS animation engine to the client. This component only
 * does two cheap things:
 *   1. Observes when the element enters the viewport (one IntersectionObserver
 *      per instance, disconnected after firing by default).
 *   2. Toggles a single class name ("is-visible").
 *
 * All actual animation (opacity/transform easing) happens in CSS
 * (see extensions/homepage/homepage.css: .reveal / .reveal-item / .bar-fill),
 * so the browser can run it on the compositor thread instead of main-thread
 * JS, and `prefers-reduced-motion` is honored automatically in one place.
 *
 * For groups of children that should stagger in, wrap the group in a single
 * <Reveal> and give each child className="reveal-item" plus an inline
 * `style={{ "--i-delay": `${i * 40}ms` }}` — no extra observers needed.
 */
export const Reveal = React.memo(function Reveal({
  as: Tag = "div",
  children,
  delay = 0,
  once = true,
  className = "",
  style,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      // Very old browsers: just show the content, no animation gating.
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "80px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ ...style, "--reveal-delay": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Reveal;
