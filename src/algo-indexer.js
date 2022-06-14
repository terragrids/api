import fetch from 'node-fetch'

function randLabsIndexerEndpoint(path) {
    const randLabsEnv = process.env.ENV === 'dev' ? 'testnet.' : ''
    return `https://indexer.${randLabsEnv}algoexplorerapi.io/v2/${path}`
}

export default class AlgoIndexer {
    async callRandLabsIndexerEndpoint(path) {
        const response = await fetch(randLabsIndexerEndpoint(path))
        return await response.json()
    }
}
