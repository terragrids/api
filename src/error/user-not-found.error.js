import GenericError from './generic-error.js'

export default class UserNotFoundError extends GenericError {
    httpCode = 404

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'UserNotFoundError',
            message: 'User specified not found'
        }
    }
}
