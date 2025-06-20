import React, { useState, useEffect } from "react";

const CompactMagnifyingGlassLoader = () => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [dotCount, setDotCount] = useState(0);

  // Animate the magnifying glass for smooth movement
  useEffect(() => {
    const moveGlass = setInterval(() => {
      setPosition({
        x: Math.random() * 70 + 15, // Horizontal movement (15% to 85%)
        y: Math.random() * 70 + 15, // Vertical movement (15% to 85%)
      });
    }, 2000); // Every 2 seconds
    return () => clearInterval(moveGlass);
  }, []);

  // Animate the loading dots in the status text
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // Cycle dots (0 to 3)
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Document Container */}
      <div style={{ position: "relative", width: "160px", height: "220px" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "var(--bg-secondary)", // Use theme background
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Document lines */}
          {[...Array(10)].map((_, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                top: `${index * 18 + 6}px`,
                left: "10px",
                width: "calc(100% - 20px)",
                height: "4px",
                backgroundColor: "#e5e7eb",
                borderRadius: "2px",
              }}
            />
          ))}

          {/* Moving Magnifying Glass */}
          <div
            style={{
              position: "absolute",
              top: `${position.y}%`,
              left: `${position.x}%`,
              width: "40px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#ffffff",
              border: "3px solid #3b82f6", // Blue border
              borderRadius: "50%",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              transform: "translate(-50%, -50%)",
              transition: "top 2s ease, left 2s ease",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "20px", height: "20px" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Loading Text */}
        <p
          style={{
            marginTop: "8px",
            fontSize: "14px",
            color: "var(--text-primary)", // Use theme text color
            textAlign: "center",
            fontWeight: "500",
          }}
        >
          Generating your response{" "}
          <span>{Array(dotCount).fill(".").join("")}</span>
        </p>
      </div>
    </div>
  );
};

export default CompactMagnifyingGlassLoader;

