import GenericError from './generic-error.js'

export default class ApplicationStillRunningError extends GenericError {
    httpCode = 400

    constructor() {
        super()
    }

    toJson() {
        return {
            error: 'ApplicationStillRunningError',
            message: 'Application specified is still running'
        }
    }
}