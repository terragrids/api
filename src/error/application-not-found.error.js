import GenericError from './generic-error.js'

export default class ApplicationNotFoundError extends GenericError {
    httpCode = 404

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'ApplicationNotFoundError',
            message: 'Application specified not found'
        }
    }
}