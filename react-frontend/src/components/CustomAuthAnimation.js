
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function CustomAuthAnimation() {
  const [stage, setStage] = useState(0);
  const stages = ["Initializing", "Connecting", "Authenticating", "Verifying"];

  useEffect(() => {
    if (stage < stages.length - 1) {
      const timeout = setTimeout(() => setStage(stage + 1), 1000); // Progress through stages every second
      return () => clearTimeout(timeout);
    }
  }, [stage]);

  return (
    <div className="custom-auth-animation">
      {/* Glowing Animated Ring */}
      <div className="absolute inset-0 flex justify-center items-center">
        <motion.div
          className="absolute w-[240px] h-[240px] blur-3xl opacity-30 rounded-full"
          style={{ background: 'linear-gradient(135deg, var(--accent-color, #3B82F6), var(--accent-color, #3B82F6))' }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-30"
            style={{ 
              backgroundColor: 'var(--accent-color, #3B82F6)',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{ y: ["0%", "-110%"], opacity: [0.4, 0] }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random(),
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {/* Stage Animation */}
        {stage < stages.length && (
          <motion.div
            key={stages[stage]}
            className="z-10 flex flex-col items-center text-center"
            style={{ color: 'var(--text-primary, #333)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Progress Ring */}
            <div className="relative flex items-center justify-center w-32 h-32">
              <motion.div
                className="absolute w-full h-full border-4 rounded-full border-transparent"
                style={{ borderTopColor: `var(--accent-color, #3B82F6)` }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                }}
              />
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{
                  yoyo: Infinity,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
                className="absolute w-10 h-10 flex items-center justify-center rounded-full shadow-inner"
                style={{ backgroundColor: 'var(--bg-secondary, #f8fafc)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-6 h-6"
                  style={{ color: 'var(--accent-color, #3B82F6)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15l9-9m-9 9l-9-9m9 9V6.5m0 4.5c-1.5 0-3-2-3-3.5s1.5-3 3-3m0 6c1.5 0 3-2 3-3.5s1.5-3-3-3z"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Stage Text */}
            <div className="mt-4 text-lg font-medium" style={{ color: 'var(--text-primary, #333)' }}>{stages[stage]}...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomAuthAnimation;

