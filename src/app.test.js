import { app } from './app.js'
import request from 'supertest'

const mockAlgoIndexer = {
    callRandLabsIndexerEndpoint: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./network/algo-indexer.js', () => jest.fn().mockImplementation(() => ({
    callRandLabsIndexerEndpoint: mockAlgoIndexer.callRandLabsIndexerEndpoint
})))

describe('app', function () {
    beforeEach(() => {
        mockAlgoIndexer.callRandLabsIndexerEndpoint.mockClear()
    })

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

    describe('get terracells endpoint', function () {
        it('should return 200 when calling terracells endpoint and no assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 200,
                json: {
                    assets: []
                }
            }))

            const response = await request(app.callback()).get('/terracells')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ assets: [] })
        })

        it('should return 200 when calling terracells endpoint and assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 200,
                json: {
                    assets: [{
                        index: 1,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terracell #1',
                            total: 1,
                            'unit-name': 'TRCL',
                            url: 'https://terragrids.org#1'
                        }
                    }, {
                        index: 2,
                        deleted: true,
                        params: {
                            decimals: 0,
                            name: 'Terracell #2',
                            total: 1,
                            'unit-name': 'TRCL',
                            url: 'https://terragrids.org#2'
                        }
                    },
                    {
                        index: 3,
                        deleted: false,
                        params: {
                            decimals: 1,
                            name: 'Terracell #3',
                            total: 1,
                            'unit-name': 'TRCL',
                            url: 'https://terragrids.org#3'
                        }
                    }, {
                        index: 4,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terracell #4',
                            total: 100,
                            'unit-name': 'TRCL',
                            url: 'https://terragrids.org#4'
                        }
                    }, {
                        index: 5,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terracell #5',
                            total: 1,
                            'unit-name': 'TRCL',
                            url: 'https://terragrids.org#5'
                        }
                    }]
                }
            }))

            const response = await request(app.callback()).get('/terracells')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terracell #1',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#1'
                }, {
                    id: 5,
                    name: 'Terracell #5',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#5'
                }]
            })
        })
    })
})