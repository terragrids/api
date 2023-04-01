import S3KeyNotFoundError from '../error/s3-key-not-found-error.js'

export default class MediaRepository {
    getIpfsHashByFileId(fileId) {
        switch (fileId) {
            // detached house 1
            case '89e12a92-b568-4511-9ce2-bb5a55791a7c':
                return 'QmXVCRBkH9zp8Xhw95ZrwNMUMPSM4mmyUi7hfx9XbGXPXJ'
            // detached house 3
            case '1cbeb62a-935d-434e-875d-f17c9f5a2d4c':
                return 'QmP9Jxm4xxuKZyUxfftBESy2V8EZAHWEu4P6m6sPoyoGzf'
            default:
                throw new S3KeyNotFoundError()
        }
    }
}
