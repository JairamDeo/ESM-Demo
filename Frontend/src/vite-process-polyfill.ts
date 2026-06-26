// Polyfill for process.env in Vite, required by react-grid-layout
if (typeof window !== "undefined") {
  window.process = window.process || ({} as unknown as NodeJS.Process);
  window.process.env = window.process.env || {};
  window.process.env.NODE_ENV = import.meta.env.MODE || "development";
}
