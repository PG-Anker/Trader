import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize auth from localStorage
const initAuth = () => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    // Set global auth header
    (window as any).__sessionId = sessionId;
  }
};

initAuth();

createRoot(document.getElementById("root")!).render(<App />);
