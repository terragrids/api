import uuid from './uuid'

describe('Uuid', function () {
    it('should create valid uuid', async () => {
        const id = uuid()
        expect(isValidUuid(id)).toBeTruthy()
    })
})

function isValidUuid(str) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return regex.test(str)
}
