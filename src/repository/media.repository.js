export default class MediaRepository {
    getMedia() {
        return [
            {
                key: 'detachedHouse1',
                fileId: '89e12a92-b568-4511-9ce2-bb5a55791a7c',
                ipfsHash: 'QmXVCRBkH9zp8Xhw95ZrwNMUMPSM4mmyUi7hfx9XbGXPXJ'
            },
            {
                key: 'detachedHouse3',
                fileId: '1cbeb62a-935d-434e-875d-f17c9f5a2d4c',
                ipfsHash: 'QmP9Jxm4xxuKZyUxfftBESy2V8EZAHWEu4P6m6sPoyoGzf'
            }
        ]
    }

    getMediaFileIds() {
        return this.getMedia().map(item => ({ key: item.key, fileId: item.fileId }))
    }

    getIpfsHashByFileId(fileId) {
        return this.getMedia().find(item => item.fileId === fileId)
    }
}
