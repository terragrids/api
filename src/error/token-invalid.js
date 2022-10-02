import GenericError from './generic-error.js'

export class TokenInvalidError extends GenericError {
    httpCode = 400
    message

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'TokenInvalidError',
            message: 'Invalid token'
        }
    }
}
