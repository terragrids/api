export default class BlobFromStream {
    #stream

    constructor(stream, size) {
        this.#stream = stream
        this.size = size
    }

    stream() {
        return this.#stream
    }

    get [Symbol.toStringTag]() {
        return 'Blob'
    }
}
