import GenericError from './generic-error.js'

export class NftTypeError extends GenericError {
    httpCode = 400
    message

    constructor() {
        super()
        this.message = 'Invalid NFT type'
    }

    toJson() {
        return {
            error: 'NftTypeError',
            message: this.message
        }
    }
}
