export default {
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: [
        '**/src/**',
        '!**/src/server*.js',
        '!**/src/algo-indexer*.js',
        '!**/node_modules/**',
        '!**/build/**',
        '!**/coverage/**'
    ],
    coverageThreshold: {
        'global': {
            'branches': 100,
            'functions': 100,
            'lines': 100,
            'statements': 100
        }
    },
    coverageReporters: [
        'text',
        'text-summary',
        'html'
    ]
}