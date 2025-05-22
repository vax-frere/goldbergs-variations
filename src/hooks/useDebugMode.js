import { useState, useEffect, useCallback } from "react";

/**
 * Hook to manage debug mode state with localStorage persistence
 * @param {boolean} initialValue - Initial debug mode state (default: false)
 * @returns {[boolean, Function]} - Debug mode state and toggle function
 */
const useDebugMode = (initialValue = false) => {
  // Initialize state from localStorage or use initialValue
  const [debugMode, setDebugMode] = useState(() => {
    const savedValue = localStorage.getItem("debugMode");
    return savedValue !== null ? JSON.parse(savedValue) : initialValue;
  });

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem("debugMode", JSON.stringify(debugMode));
  }, [debugMode]);

  // Toggle debug mode function
  const toggleDebugMode = useCallback(() => {
    setDebugMode((prevMode) => !prevMode);
  }, []);

  // Add keyboard listener for 'P' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "p" || e.key === "P") {
        toggleDebugMode();
        console.log("Debug mode " + (!debugMode ? "activated" : "deactivated"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [debugMode, toggleDebugMode]);

  return [debugMode, toggleDebugMode];
};

export default useDebugMode;
