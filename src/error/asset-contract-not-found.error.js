import GenericError from './generic-error.js'

export default class AssetContractNotFoundError extends GenericError {
    httpCode = 404

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'AssetContractNotFoundError',
            message: 'Asset contract specified not found'
        }
    }
}