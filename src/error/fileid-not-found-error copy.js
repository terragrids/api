import GenericError from './generic-error.js'

export default class FileIdNotFoundError extends GenericError {
    httpCode = 404

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'FileIdNotFoundError',
            message: 'The specified file id was not found'
        }
    }
}
