import GenericError from './generic-error.js'

export class TypeNumberError extends GenericError {
    httpCode = 400
    message

    constructor(parameter) {
        super()
        this.message = `${parameter} must be a number`
    }

    toJson() {
        return {
            error: 'TypeNumberError',
            message: this.message
        }
    }
}
