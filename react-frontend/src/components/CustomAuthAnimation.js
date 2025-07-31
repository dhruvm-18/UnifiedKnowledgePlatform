
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function CustomAuthAnimation() {
  const [stage, setStage] = useState(0);
  const stages = ["Initializing", "Connecting", "Authenticating", "Verifying", "Success"];

  useEffect(() => {
    if (stage < stages.length - 1) {
      const timeout = setTimeout(() => setStage(stage + 1), 1000); // Progress through stages every second
      return () => clearTimeout(timeout);
    }
  }, [stage]);

  return (
    <div className="relative flex justify-center items-center h-64 w-64 mx-auto bg-gradient-to-br from-gray-900 to-indigo-800 rounded-lg shadow-lg overflow-hidden">
      {/* Glowing Animated Ring */}
      <div className="absolute inset-0 flex justify-center items-center">
        <motion.div
          className="absolute w-[240px] h-[240px] bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-500 blur-3xl opacity-30 rounded-full"
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
            className="absolute w-2 h-2 rounded-full bg-white opacity-30"
            style={{
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
        {stage < stages.length - 1 && (
          <motion.div
            key={stages[stage]}
            className="z-10 flex flex-col items-center text-center text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Progress Ring */}
            <div className="relative flex items-center justify-center w-32 h-32">
              <motion.div
                className="absolute w-full h-full border-4 rounded-full border-transparent"
                style={{ borderTopColor: `hsl(${220 + stage * 45}, 70%, 60%)` }}
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
                className="absolute w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full shadow-inner"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={
                      stage < stages.length - 1
                        ? "M12 15l9-9m-9 9l-9-9m9 9V6.5m0 4.5c-1.5 0-3-2-3-3.5s1.5-3 3-3m0 6c1.5 0 3-2 3-3.5s1.5-3-3-3z"
                        : "M5 13l4 4L19 7"
                    }
                  />
                </svg>
              </motion.div>
            </div>

            {/* Stage Text */}
            <div className="mt-4 text-lg font-medium">{stages[stage]}...</div>
          </motion.div>
        )}

        {/* Success State */}
        {stage === stages.length - 1 && (
          <motion.div
            key="success"
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="absolute w-[200px] h-[200px] bg-green-400 rounded-full blur-2xl opacity-30"
              initial={{ scale: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5 }}
            />
            <div className="relative w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-sm font-medium text-green-400 mt-2">
              Authentication Successful
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomAuthAnimation;

