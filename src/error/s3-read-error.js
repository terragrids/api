import GenericError from './generic-error.js'

export default class S3ReadError extends GenericError {
    httpCode = 400

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'S3ReadError',
            message: 'Error reading from remote storage'
        }
    }
}