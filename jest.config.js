export default {
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: ['**/src/app.js', '**/src/utils/validators.js', '**/src/utils/uuid.js'],
    coveragePathIgnorePatterns: ['constants.js'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    },
    coverageReporters: ['text', 'text-summary', 'html']
}
