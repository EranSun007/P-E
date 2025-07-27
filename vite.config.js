import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// Custom plugin to display chunk sizes during build
function chunkSizeReporter() {
  return {
    name: 'chunk-size-reporter',
    generateBundle(options, bundle) {
      const chunks = Object.values(bundle).filter(chunk => chunk.type === 'chunk')
      const assets = Object.values(bundle).filter(chunk => chunk.type === 'asset')
      
      console.log('\n📊 Build Chunk Analysis:')
      console.log('========================')
      
      // Sort chunks by size (largest first)
      const sortedChunks = chunks.sort((a, b) => {
        const sizeA = Buffer.byteLength(a.code, 'utf8')
        const sizeB = Buffer.byteLength(b.code, 'utf8')
        return sizeB - sizeA
      })
      
      let totalJSSize = 0
      sortedChunks.forEach(chunk => {
        const size = Buffer.byteLength(chunk.code, 'utf8')
        totalJSSize += size
        const sizeKB = (size / 1024).toFixed(2)
        const warning = size > 400 * 1024 ? ' ⚠️' : ''
        console.log(`  ${chunk.fileName}: ${sizeKB} KB${warning}`)
      })
      
      // Show CSS assets
      const cssAssets = assets.filter(asset => asset.fileName.endsWith('.css'))
      if (cssAssets.length > 0) {
        console.log('\n🎨 CSS Assets:')
        cssAssets.forEach(asset => {
          const size = Buffer.byteLength(asset.source, 'utf8')
          const sizeKB = (size / 1024).toFixed(2)
          console.log(`  ${asset.fileName}: ${sizeKB} KB`)
        })
      }
      
      console.log(`\n📈 Total JS Size: ${(totalJSSize / 1024).toFixed(2)} KB`)
      console.log('========================\n')
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    }),
    chunkSizeReporter()
  ],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    // Set chunk size warning limit to 400 kB
    chunkSizeWarningLimit: 400,
    // Enable build optimizations
    minify: 'esbuild',
    target: 'esnext',
    // Configure tree shaking optimization
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            return 'assets/[name]-[hash].js'
          }
          return 'assets/chunk-[hash].js'
        },
        // Optimize asset naming
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // React core libraries into vendor-core chunk
          'vendor-core': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Radix UI components into vendor-ui chunk
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            'lucide-react',
            'framer-motion'
          ],
          // Utility libraries into vendor-utils chunk
          'vendor-utils': [
            'date-fns',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'zod',
            'react-hook-form',
            '@hookform/resolvers',
            'cmdk',
            'next-themes',
            'sonner',
            'react-day-picker',
            'input-otp',
            'embla-carousel-react',
            'react-resizable-panels',
            'vaul'
          ],
          // Chart libraries into vendor-charts chunk
          'vendor-charts': [
            'recharts'
          ]
        }
      }
    }
  }
}) 