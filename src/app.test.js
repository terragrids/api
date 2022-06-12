import { app } from './app.js'
import request from 'supertest'

describe('app', function () {
    describe('get root endpoint', function () {
        it('should return 200 when calling root endpoint', async () => {
            const response = await request(app.callback()).get('/')
            expect(response.status).toBe(200)
            expect(response.text).toBe('terragrids api')
        })
    })

    describe('get health check endpoint', function () {
        it('should return 200 when calling hc endpoint', async () => {
            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.body).toEqual({ env: 'dev', region: 'local' })
        })
    })
})