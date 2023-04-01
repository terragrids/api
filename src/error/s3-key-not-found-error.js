import GenericError from './generic-error.js'

export default class S3KeyNotFoundError extends GenericError {
    httpCode = 404

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'S3KeyNotFoundError',
            message: 'The specified key was not found'
        }
    }
}
