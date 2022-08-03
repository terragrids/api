export function filterAlgoAssetsByDbAssets(algoAssets, dbAssets) {
    const assets = []
    for (const algoAsset of algoAssets) {
        const dbAsset = dbAssets.find(result => result && result.id === algoAsset.id)
        if (dbAsset) {
            assets.push({
                ...algoAsset,
                offchainUrl: dbAsset.offchainUrl
            })
        }
    }
    return assets
}

export function isValidAsset(asset) {
    return asset && (
        asset.params['unit-name'] === 'TRCL' ||
        asset.params['unit-name'] === 'TRLD' ||
        asset.params['unit-name'] === 'TRBD'
    )
}
