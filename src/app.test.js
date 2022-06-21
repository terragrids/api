import { app } from './app.js'
import request from 'supertest'

const mockAlgoIndexer = {
    callRandLabsIndexerEndpoint: jest.fn().mockImplementation(() => jest.fn()),
    callAlgonodeIndexerEndpoint: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./network/algo-indexer.js', () => jest.fn().mockImplementation(() => ({
    callRandLabsIndexerEndpoint: mockAlgoIndexer.callRandLabsIndexerEndpoint,
    callAlgonodeIndexerEndpoint: mockAlgoIndexer.callAlgonodeIndexerEndpoint
})))

const mockTokenRepository = {
    getTokenContract: jest.fn().mockImplementation(() => jest.fn()),
    putTokenContract: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/token.repository.js', () => jest.fn().mockImplementation(() => ({
    getTokenContract: mockTokenRepository.getTokenContract,
    putTokenContract: mockTokenRepository.putTokenContract
})))

describe('app', function () {
    const OLD_ENV = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        process.env = { ...OLD_ENV } // make a copy
    })

    afterAll(() => {
        process.env = OLD_ENV // restore old env
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

    describe('get terracell endpoint', function () {
        it('should return 200 when calling terracell endpoint when assets found with no token contract', async () => {
            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'TRCL',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'assets/123/balances':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                balances: [{
                                    address: 'test_address_1',
                                    amount: 1,
                                    deleted: false
                                }, {
                                    address: 'test_address_2',
                                    amount: 0,
                                    deleted: false
                                }, {
                                    address: 'test_address_3',
                                    amount: 1,
                                    deleted: true
                                }, {
                                    address: 'test_address_4',
                                    amount: 1,
                                    deleted: false
                                }]
                            }
                        })
                }
            })

            const response = await request(app.callback()).get('/terracells/123')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123/balances')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                asset: {
                    id: 123,
                    name: 'Terracell #1',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#1',
                    holders: [{
                        address: 'test_address_1',
                        amount: 1
                    }, {
                        address: 'test_address_4',
                        amount: 1
                    }]
                }
            })
        })

        it('should return 200 when calling terracell endpoint when assets found with token contract', async () => {
            mockTokenRepository.getTokenContract.mockImplementation(() => Promise.resolve({
                id: 'contract_id'
            }))
            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'TRCL',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'assets/123/balances':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                balances: [{
                                    address: 'test_address_1',
                                    amount: 1,
                                    deleted: false
                                }, {
                                    address: 'test_address_2',
                                    amount: 0,
                                    deleted: false
                                }, {
                                    address: 'test_address_3',
                                    amount: 1,
                                    deleted: true
                                }, {
                                    address: 'test_address_4',
                                    amount: 1,
                                    deleted: false
                                }]
                            }
                        })
                }
            })

            const response = await request(app.callback()).get('/terracells/123')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123/balances')

            expect(mockTokenRepository.getTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.getTokenContract).toHaveBeenCalledWith('123')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                asset: {
                    id: 123,
                    name: 'Terracell #1',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#1',
                    holders: [{
                        address: 'test_address_1',
                        amount: 1
                    }, {
                        address: 'test_address_4',
                        amount: 1
                    }],
                    contract: {
                        id: 'contract_id'
                    }
                }
            })
        })

        it('should return 404 when calling terracell endpoint when assets not found', async () => {
            mockTokenRepository.getTokenContract.mockImplementation(() => Promise.resolve({
                id: 'contract_id'
            }))
            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 404
                        })
                    case 'assets/123/balances':
                        return Promise.resolve({})
                }
            })

            const response = await request(app.callback()).get('/terracells/123')

            expect(response.status).toBe(404)
            expect(response.body).toEqual({
                error: 'AssetNotFoundError',
                message: 'Asset specified not found'
            })
        })
    })

    describe('get account terracells endpoint', function () {
        it('should return 200 when calling account terracells endpoint and no assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 404
            }))

            const response = await request(app.callback()).get('/accounts/123/terracells')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('accounts/123/assets')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ assets: [] })
        })

        it('should return 200 when calling account terracells endpoint and assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 200,
                json: {
                    assets: [{
                        'asset-id': 1,
                        amount: 1,
                        decimals: 0,
                        deleted: false,
                        'unit-name': 'TRCL',
                        name: 'Terracell 1'
                    }, {
                        'asset-id': 2,
                        amount: 0,
                        decimals: 0,
                        deleted: false,
                        'unit-name': 'TRCL',
                        name: 'Terracell 2'
                    }, {
                        'asset-id': 3,
                        amount: 1,
                        decimals: 0,
                        deleted: true,
                        'unit-name': 'TRCL',
                        name: 'Terracell 3'
                    }, {
                        'asset-id': 4,
                        amount: 2,
                        decimals: 0,
                        deleted: false,
                        'unit-name': 'TRCL',
                        name: 'Terracell 4'
                    }, {
                        'asset-id': 5,
                        amount: 1,
                        decimals: 1,
                        deleted: false,
                        'unit-name': 'TRCL',
                        name: 'Terracell 5'
                    }, {
                        'asset-id': 6,
                        amount: 1,
                        decimals: 0,
                        deleted: false,
                        'unit-name': 'meh',
                        name: 'Terracell 6'
                    }, {
                        'asset-id': 7,
                        amount: 1,
                        decimals: 0,
                        deleted: false,
                        'unit-name': 'TRCL',
                        name: 'Terracell 7'
                    }]
                }
            }))

            const response = await request(app.callback()).get('/accounts/123/terracells')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('accounts/123/assets')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terracell 1',
                    symbol: 'TRCL'
                }, {
                    id: 7,
                    name: 'Terracell 7',
                    symbol: 'TRCL'
                }]
            })
        })
    })

    describe('post terracell contract endpoint', function () {
        it('should return 204 when calling terracell contract endpoint and both terracell and application found', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'TRCL',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'applications/456':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                application: {
                                    params: {
                                        'approval-program': 'approval_program_value'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledWith({
                assetId: '123',
                applicationId: '456',
                contractInfo: 'contract_info',
                sellerAddress: 'seller_address',
                assetPrice: 10,
                assetPriceUnit: 'ALGO'
            })

            expect(response.status).toBe(204)
        })

        it('should return 404 when calling terracell contract endpoint and terracell not found', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 404
                        })
                    case 'applications/456':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                application: {
                                    params: {
                                        'approval-program': 'approval_program_value'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 404 when calling terracell contract endpoint and asset not terracell', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'meh',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'applications/456':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                application: {
                                    params: {
                                        'approval-program': 'approval_program_value'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 404 when calling terracell contract endpoint and application not found', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'TRCL',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'applications/456':
                        return Promise.resolve({
                            status: 404
                        })
                }
            })

            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 404 when calling terracell contract endpoint and application approval program not valid', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockAlgoIndexer.callAlgonodeIndexerEndpoint.mockImplementation(params => {
                switch (params) {
                    case 'assets/123':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                asset: {
                                    index: 123,
                                    params: {
                                        name: 'Terracell #1',
                                        total: 1,
                                        decimals: 0,
                                        'unit-name': 'TRCL',
                                        url: 'https://terragrids.org#1'
                                    }
                                }
                            }
                        })
                    case 'applications/456':
                        return Promise.resolve({
                            status: 200,
                            json: {
                                application: {
                                    params: {
                                        'approval-program': 'meh'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 400 when calling terracell contract endpoint and contract info missing', async () => {
            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    sellerAddress: 'seller_address',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'contractInfo must be specified'
            })
        })

        it('should return 400 when calling terracell contract endpoint and seller address missing', async () => {
            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    assetPrice: 10,
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'sellerAddress must be specified'
            })
        })

        it('should return 400 when calling terracell contract endpoint and asset price missing', async () => {
            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPriceUnit: 'ALGO'
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'assetPrice must be specified'
            })
        })

        it('should return 400 when calling terracell contract endpoint and asset price unit missing', async () => {
            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')
                .send({
                    contractInfo: 'contract_info',
                    sellerAddress: 'seller_address',
                    assetPrice: 10
                })

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'assetPriceUnit must be specified'
            })
        })

        it('should return 400 when calling terracell contract endpoint and request body missing', async () => {
            const response = await request(app.callback())
                .post('/terracells/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'contractInfo must be specified'
            })
        })
    })
})