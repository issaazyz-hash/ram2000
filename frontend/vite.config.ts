import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path - set to '/' for root deployment (e.g., /var/www/html)
  base: '/',
  
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/hero": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/brands": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/images": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    // Ensure index.html is always generated
    emptyOutDir: true,
    
    sourcemap: false, // Disable source maps in production for smaller bundle
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: true, // Remove all console.* calls in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Explicitly remove these
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Optimize chunk naming for caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Ensure assets are properly resolved
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  
  preview: {
    port: 8080,
    host: true, // Allow external access for preview
  },
}));
