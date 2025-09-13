export default [
  {
    ignores: [
      'lib/*.min.js',  // Ignore minified third-party libraries
      'lib/vue.global.prod.js',  // Ignore Vue production build
      'lib/exif.min.js',
      'node_modules/**'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        
        // Chrome Extension APIs
        chrome: 'readonly',
        browser: 'readonly',
        
        // Service Worker globals
        self: 'readonly',
        importScripts: 'readonly',
        caches: 'readonly',
        
        // Web Workers
        Worker: 'readonly',
        SharedWorker: 'readonly',
        
        // IndexedDB
        indexedDB: 'readonly',
        IDBTransaction: 'readonly',
        IDBKeyRange: 'readonly',
        
        // Libraries (global)
        Vue: 'readonly',
        Papa: 'readonly',
        XLSX: 'readonly',
        JSZip: 'readonly',
        
        // Extension-specific globals (reduced for security)
        StepTwoUtils: 'readonly', // Keep as readonly since it's a utility library
        
        // Web APIs missing from service workers
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        navigator: 'readonly',
        Image: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        performance: 'readonly',
        screen: 'readonly',
        Element: 'readonly',
        Node: 'readonly'
      }
    },
    rules: {
      // Possible Errors
      'no-await-in-loop': 'warn',
      'no-console': 'off', // Extension needs console for debugging
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^(_|options|template|html|data|pathname)', 'varsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_' }],
      
      // Best Practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Stylistic Issues
      'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      'comma-dangle': ['error', 'never'],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      
      // ES6
      'arrow-spacing': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'warn'
    }
  },
  {
    // ES module files
    files: [
      // Background ES modules
      'background/enterprise-integration.js',
      'background/professional-export-system.js',
      'background/utils.js',
      'background/filename-mask-simple.js',
      'background/advanced-export-system.js',
      'background/download-queue.js',
      'background/filename-mask.js',
      'background/site-profiles.js',
      // Content ES modules
      'content/crop-selector.js',
      'content/enhanced-macro-system.js',
      'content/enhanced-selector-engine.js',
      'content/enhanced-selector.js',
      'content/macro-recorder.js',
      'content/macro/*.js',
      'content/perceptual-duplicate-detector.js',
      'content/picker.js',
      'content/smartGuess.js',
      // Library ES modules
      'lib/css-path.js',
      'lib/common-utils.js',
      // Config files
      'eslint.config.js'
    ],
    languageOptions: {
      sourceType: 'module',
      globals: {
        // Browser DOM APIs for content scripts
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        XPathResult: 'readonly',
        NodeFilter: 'readonly',
        getComputedStyle: 'readonly',
        location: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    // Service Worker specific configuration
    files: ['background/service-worker-modern.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        // Service worker importScripts globals
        DownloadQueue: 'readonly',
        AdvancedExportSystem: 'readonly',
        detectSiteProfile: 'readonly',
        mergeWithUserSettings: 'readonly',
        getProfileList: 'readonly',
        UNIVERSAL_SELECTORS: 'readonly',
        previewMask: 'readonly',
        getAvailableTokens: 'readonly',
        StepTwoUtils: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    // Script files (remaining background files)
    files: ['background/*.js'],
    ignores: [
      'background/enterprise-integration.js',
      'background/professional-export-system.js',
      'background/utils.js',
      'background/filename-mask-simple.js',
      'background/advanced-export-system.js',
      'background/download-queue.js',
      'background/filename-mask.js',
      'background/site-profiles.js'
    ],
    languageOptions: {
      sourceType: 'script'
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    // Content script specific rules - exclude ES modules  
    files: ['content/*.js'],
    ignores: [
      'content/crop-selector.js',
      'content/enhanced-macro-system.js',
      'content/enhanced-selector-engine.js',
      'content/enhanced-selector.js',
      'content/macro-recorder.js',
      'content/perceptual-duplicate-detector.js',
      'content/picker.js',
      'content/smartGuess.js'
    ],
    languageOptions: {
      sourceType: 'script',
      globals: {
        // Additional content script globals
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly'
      }
    }
  },
  {
    // UI script specific rules
    files: ['ui/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        // UI-specific globals
        Vue: 'readonly'
      }
    }
  }
];
