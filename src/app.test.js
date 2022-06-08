import { app } from './app.js'
import request from 'supertest'

describe('app', function () {
    describe('get root endpoint', function () {
        it('should return 200 when calling root path', async () => {
            const response = await request(app.callback()).get('/')
            expect(response.status).toBe(200)
            expect(response.text).toBe('terragrids api')
        })
    })
})