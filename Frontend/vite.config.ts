import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { 
      "@": path.resolve(__dirname, "./src"),
      "process/browser": "process/browser.js"
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    target: "es2020",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-qr": ["react-qr-code"],
          "vendor-ui": ["lucide-react", "sonner", "axios"],
          "vendor-rgl": ["react-grid-layout", "react-resizable"],
        },
      },
    },
  },
  server: {
    host: true, // listen on 0.0.0.0 so other devices on LAN can open http://<your-ip>:5174
    port: 5174,
    strictPort: true,
    hmr: {
      host: "localhost",
      port: 5174,
      clientPort: 5174,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "axios", "recharts", "react-grid-layout", "react-resizable"],
  },
});
