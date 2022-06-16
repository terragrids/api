import fetch from 'node-fetch'

function randLabsIndexerEndpoint(path) {
    const randLabsEnv = process.env.ENV === 'dev' ? 'testnet.' : ''
    return `https://indexer.${randLabsEnv}algoexplorerapi.io/v2/${path}`
}

function algonodeIndexerEndpoint(path) {
    const algonodeEnv = process.env.ENV === 'dev' ? 'testnet' : 'mainnet'
    return `https://${algonodeEnv}-idx.algonode.cloud/v2/${path}`
}

export default class AlgoIndexer {
    async callRandLabsIndexerEndpoint(path) {
        const response = await fetch(randLabsIndexerEndpoint(path))
        return await response.json()
    }

    async callAlgonodeIndexerEndpoint(path) {
        const response = await fetch(algonodeIndexerEndpoint(path))
        return {
            status: response.status,
            json: await response.json()
        }
    }
}
