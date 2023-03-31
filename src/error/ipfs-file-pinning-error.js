import GenericError from './generic-error.js'

export default class IpfsFilePinningError extends GenericError {
    httpCode = 500
    error

    constructor(error) {
        super()
        this.error = error
    }

    toJson() {
        return {
            error: 'IpfsFilePinningError',
            message: 'Error pinning file to IPFS',
            ...(process.env.ENV !== 'prod' && { info: this.error.message })
        }
    }
}
