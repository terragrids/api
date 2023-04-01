import FileIdNotFoundError from '../error/fileid-not-found-error copy.js'

export default class MediaRepository {
    getMedia() {
        return {
            // detached house 1
            '89e12a92-b568-4511-9ce2-bb5a55791a7c': 'QmXVCRBkH9zp8Xhw95ZrwNMUMPSM4mmyUi7hfx9XbGXPXJ',
            // detached house 3
            '1cbeb62a-935d-434e-875d-f17c9f5a2d4c': 'QmP9Jxm4xxuKZyUxfftBESy2V8EZAHWEu4P6m6sPoyoGzf'
        }
    }

    getFileIds() {
        return this.getMedia().map(pair => pair[0])
    }

    getIpfsHashByFileId(fileId) {
        const media = this.getMedia()
        const hash = media[fileId]
        if (hash) return hash
        else throw new FileIdNotFoundError()
    }
}
