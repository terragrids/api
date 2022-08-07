export const TRCL = 'TRCL'
export const TRLD = 'TRLD'
export const TRBD = 'TRBD'

export function filterAlgoAssetsByDbAssets(algoAssets, dbAssets) {
    const assets = []
    for (const algoAsset of algoAssets) {
        const dbAsset = dbAssets.find(result => result && result.id === algoAsset.id)
        if (dbAsset) {
            assets.push({
                ...algoAsset,
                offchainUrl: dbAsset.offchainUrl,
                ...dbAsset.power !== undefined && { power: dbAsset.power },
                ...dbAsset.positionX !== undefined && { positionX: dbAsset.positionX },
                ...dbAsset.positionY !== undefined && { positionY: dbAsset.positionY }
            })
        }
    }
    return assets
}

export function isValidAsset(asset) {
    return asset && (
        asset.params['unit-name'] === TRCL ||
        asset.params['unit-name'] === TRLD ||
        asset.params['unit-name'] === TRBD
    )
}
