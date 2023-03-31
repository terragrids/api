import GenericError from './generic-error.js'

export default class IpfsJsonPinningError extends GenericError {
    httpCode = 500
    error

    constructor(error) {
        super()
        this.error = error
    }

    toJson() {
        return {
            error: 'IpfsJsonPinningError',
            message: 'Error pinning json to IPFS',
            ...(process.env.ENV !== 'prod' && { info: this.error.message })
        }
    }
}
