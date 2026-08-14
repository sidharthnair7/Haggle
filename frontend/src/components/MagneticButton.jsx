import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * MagneticButton — wraps children in a magnetic hover effect.
 * The element pulls slightly toward the cursor within a configurable radius.
 * On click: radial ripple + scale spring.
 */
export default function MagneticButton({
  children,
  wrapperClassName = '',
  className = '',
  style = {},
  strength = 0.3,
  radius = 120,
  as: Tag = 'button',
  // Pulled out of the rest so it isn't spread onto the DOM node. It's a styling
  // prop for this component, not an HTML attribute, and React logged a warning
  // for every button on the landing page because it was reaching the element.
  buttonStyle = {},
  ...props
}) {
  const ref = useRef(null);
  const [ripple, setRipple] = useState(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 15, mass: 0.2 });
  const springY = useSpring(y, { stiffness: 180, damping: 15, mass: 0.2 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < radius) {
      x.set(distX * strength);
      y.set(distY * strength);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const rippleX = e.clientX - rect.left;
    const rippleY = e.clientY - rect.top;
    const id = Date.now();
    setRipple({ x: rippleX, y: rippleY, id });
    setTimeout(() => setRipple(null), 600);
    props.onClick?.(e);
  };

  return (
    <motion.div
      ref={ref}
      className={`magnetic-wrap ${wrapperClassName}`}
      style={{ ...style, x: springX, y: springY, position: 'relative', display: 'inline-flex' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <Tag {...props} className={className} onClick={handleClick} style={{ ...buttonStyle, position: 'relative', overflow: 'hidden' }}>
        {children}
        {/* Ripple effect */}
        {ripple && (
          <span
            key={ripple.id}
            className="magnetic-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
          />
        )}
      </Tag>
    </motion.div>
  );
}
