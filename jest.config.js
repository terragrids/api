export default {
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: [
        '**/src/**',
        '!**/src/server*.js',
        '!**/src/network/**.js',
        '!**/node_modules/**',
        '!**/build/**',
        '!**/coverage/**',
        '!**/logger.js'
    ],
    coverageReporters: [
        'text',
        'text-summary',
        'html'
    ]
}