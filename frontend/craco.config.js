// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

function makeDevServerV5Compatible(devServerConfig) {
  const {
    https,
    onAfterSetupMiddleware,
    onBeforeSetupMiddleware,
    onListening,
    setupMiddlewares,
    ...compatibleConfig
  } = devServerConfig;

  compatibleConfig.server =
    typeof https === "object"
      ? { type: "https", options: https }
      : https
        ? "https"
        : "http";
  compatibleConfig.headers = {
    ...compatibleConfig.headers,
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  if (onBeforeSetupMiddleware || setupMiddlewares) {
    compatibleConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }

      return setupMiddlewares
        ? setupMiddlewares(middlewares, devServer)
        : middlewares;
    };
  }

  compatibleConfig.onListening = (devServer) => {
    devServer.close ??= (callback) => devServer.stopCallback(callback);

    if (onListening) {
      onListening(devServer);
    }
    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }
  };

  return compatibleConfig;
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      /* Add health check plugin to webpack if enabled */
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      /* --------------------------------------------------------------- 
      // Bundle-splitting: only applies to production builds. CRA's dev
      // server already serves modules unbundled, so gating on NODE_ENV
      // avoids slowing down `craco start` for no benefit.
      //
      // Why each group exists (from source-map-explorer analysis):
      // - reactVendor: react/react-dom/scheduler change almost never —
      //   isolate so browsers cache it across deploys that don't touch React.
      // - motion: framer-motion + motion-dom were ~144KB stuck in main.js
      //   via AnimatePresence in App.js. Once that import is removed from
      //   the App shell, this chunk becomes lazy-loaded only on pages that
      //   still import framer-motion directly.
      // - charts: recharts (+ its bundled redux/immer/reselect internals)
      //   was duplicated across 3 separate page chunks. One shared chunk
      //   means it downloads once and is reused/cached across chart pages.
      // - radix / lucide: used by many components; splitting avoids these
      //   being duplicated into every chunk that imports a Radix primitive
      //   or an icon.
      // - commonApp: catches OUR OWN code shared by 2+ routes — this is
      //   what pulls DashboardLayout.jsx (+its icon imports) out of ~15
      //   separate dashboard chunk copies into one cached chunk.
      // - vendor: catch-all for remaining node_modules not matched above.
      // ---------------------------------------------------------------*/
      if (process.env.NODE_ENV === "production") {
        webpackConfig.optimization.splitChunks = {
          chunks: "all",
          maxInitialRequests: 10,
          cacheGroups: {
            reactVendor: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: "vendor-react",
              priority: 40,
              reuseExistingChunk: true,
            },
            motion: {
              test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
              name: "vendor-motion",
              priority: 30,
              reuseExistingChunk: true,
            },
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-[a-z-]+|@reduxjs|redux|redux-thunk|immer|reselect|react-redux|es-toolkit|decimal\.js-light|eventemitter3|internmap|use-sync-external-store)[\\/]/,
              name: "vendor-charts",
              priority: 30,
              reuseExistingChunk: true,
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: "vendor-radix",
              priority: 20,
              reuseExistingChunk: true,
            },
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: "vendor-lucide",
              priority: 20,
              reuseExistingChunk: true,
            },
            commonApp: {
              minChunks: 2,
              name: "common",
              priority: 10,
              reuseExistingChunk: true,
              chunks: "all",
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        };
      }

      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

const configureDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) =>
  makeDevServerV5Compatible(configureDevServer(devServerConfig));

module.exports = webpackConfig;
