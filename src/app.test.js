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

const mockDynamoDbRepository = {
    testConnection: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/dynamodb.repository.js', () => jest.fn().mockImplementation(() => ({
    testConnection: mockDynamoDbRepository.testConnection
})))

const mockTokenRepository = {
    getToken: jest.fn().mockImplementation(() => jest.fn()),
    putTrclToken: jest.fn().mockImplementation(() => jest.fn()),
    putTrldToken: jest.fn().mockImplementation(() => jest.fn()),
    putTrbdToken: jest.fn().mockImplementation(() => jest.fn()),
    deleteToken: jest.fn().mockImplementation(() => jest.fn()),
    putTokenContract: jest.fn().mockImplementation(() => jest.fn()),
    deleteTokenContract: jest.fn().mockImplementation(() => jest.fn()),
    getSpp: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/token.repository.js', () => jest.fn().mockImplementation(() => ({
    getToken: mockTokenRepository.getToken,
    putTrclToken: mockTokenRepository.putTrclToken,
    putTrldToken: mockTokenRepository.putTrldToken,
    putTrbdToken: mockTokenRepository.putTrbdToken,
    deleteToken: mockTokenRepository.deleteToken,
    putTokenContract: mockTokenRepository.putTokenContract,
    deleteTokenContract: mockTokenRepository.deleteTokenContract,
    getSpp: mockTokenRepository.getSpp
})))

const mockIpfsRepository = {
    testConnection: jest.fn().mockImplementation(() => jest.fn()),
    pinFile: jest.fn().mockImplementation(() => jest.fn()),
    pinJson: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/ipfs.repository.js', () => jest.fn().mockImplementation(() => ({
    testConnection: mockIpfsRepository.testConnection,
    pinFile: mockIpfsRepository.pinFile,
    pinJson: mockIpfsRepository.pinJson
})))

const mockS3Repository = {
    testConnection: jest.fn().mockImplementation(() => jest.fn()),
    getFileReadStream: jest.fn().mockImplementation(() => jest.fn()),
    getUploadSignedUrl: jest.fn().mockImplementation(() => jest.fn())
}
jest.mock('./repository/s3.repository.js', () => jest.fn().mockImplementation(() => ({
    testConnection: mockS3Repository.testConnection,
    getFileReadStream: mockS3Repository.getFileReadStream,
    getUploadSignedUrl: mockS3Repository.getUploadSignedUrl
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
            mockIpfsRepository.testConnection.mockImplementation(() => Promise.resolve({ ipfs: true }))
            mockS3Repository.testConnection.mockImplementation(() => Promise.resolve({ s3: true }))
            mockDynamoDbRepository.testConnection.mockImplementation(() => Promise.resolve({ dynamodb: true }))

            const response = await request(app.callback()).get('/hc')
            expect(response.status).toBe(200)
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                env: 'dev',
                region: 'local',
                ipfs: { ipfs: true },
                s3: { s3: true },
                db: { dynamodb: true }
            })
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
            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({
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

            expect(mockTokenRepository.getToken).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.getToken).toHaveBeenCalledWith('123')

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
            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({
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
        it('should return 201 when calling terracell contract endpoint and both terracell and application found', async () => {
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
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: true
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: true
            })
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

            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledWith({
                assetId: '123',
                applicationId: '456',
                contractInfo: 'contract_info',
                sellerAddress: 'seller_address',
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: false
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: false
            })
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

            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTokenContract).toHaveBeenCalledWith({
                assetId: '123',
                applicationId: '456',
                contractInfo: 'contract_info',
                sellerAddress: 'seller_address',
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: false
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: false
            })
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

    describe('delete terracell contract endpoint', function () {
        it('should return 204 when calling terracell contract endpoint and terracell found and application not running', async () => {
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

            const response = await request(app.callback()).delete('/terracells/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.deleteTokenContract).toHaveBeenCalledWith('123')

            expect(response.status).toBe(204)
        })

        it('should return 404 when calling terracell contract endpoint and terracell not found', async () => {
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

            const response = await request(app.callback()).delete('/terracells/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 404 when calling terracell contract endpoint and asset not terracell', async () => {
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

            const response = await request(app.callback()).delete('/terracells/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 400 when calling terracell contract endpoint and application still running', async () => {
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
                                    id: '456',
                                    params: {
                                        'approval-program': 'meh'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback()).delete('/terracells/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ApplicationStillRunningError',
                message: 'Application specified is still running'
            })
        })
    })

    describe('get nft endpoint', function () {
        it('should return 200 when calling nft endpoint and assets found on both algo indexer and offchain db', async () => {
            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({
                id: 123,
                offchainUrl: 'offchain_url'
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

            const response = await request(app.callback()).get('/nfts/123')

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
                    offchainUrl: 'offchain_url',
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

        it('should return 200 when calling nft endpoint and assets found on both algo indexer and offchain db and contract info', async () => {
            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({
                id: 123,
                offchainUrl: 'offchain_url',
                contractId: 'contract-id',
                contractInfo: 'contract-info',
                sellerAddress: 'seller-address',
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: false
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

            const response = await request(app.callback()).get('/nfts/123')

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
                    offchainUrl: 'offchain_url',
                    contractId: 'contract-id',
                    contractInfo: 'contract-info',
                    sellerAddress: 'seller-address',
                    assetPrice: '10',
                    assetPriceUnit: 'ALGO',
                    verified: false,
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

        it('should return 404 when calling nft endpoint and assets not found in offchain db', async () => {
            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve())
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

            const response = await request(app.callback()).get('/nfts/123')

            expect(response.status).toBe(404)
            expect(response.body).toEqual({
                error: 'AssetNotFoundError',
                message: 'Asset specified not found'
            })
        })
    })

    describe('get nft type endpoint', function () {
        it('should return 200 when calling nft type endpoint and no assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 200,
                json: {
                    assets: []
                }
            }))

            const response = await request(app.callback()).get('/nfts/type/symbol')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=SYMBOL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ assets: [] })
        })

        it('should return 200 when calling nft type endpoint and trcl assets found', async () => {
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

            mockTokenRepository.getToken.mockImplementation(assetId => Promise.resolve({
                id: assetId,
                power: assetId + 10
            }))

            const response = await request(app.callback()).get('/nfts/type/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terracell #1',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#1',
                    power: 11
                }, {
                    id: 5,
                    name: 'Terracell #5',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#5',
                    power: 15
                }]
            })
        })

        it('should return 200 when calling nft type endpoint and trld assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 200,
                json: {
                    assets: [{
                        index: 1,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terraland #1',
                            total: 1,
                            'unit-name': 'TRLD',
                            url: 'https://terragrids.org#1'
                        }
                    }, {
                        index: 2,
                        deleted: true,
                        params: {
                            decimals: 0,
                            name: 'Terraland #2',
                            total: 1,
                            'unit-name': 'TRLD',
                            url: 'https://terragrids.org#2'
                        }
                    },
                    {
                        index: 3,
                        deleted: false,
                        params: {
                            decimals: 1,
                            name: 'Terraland #3',
                            total: 1,
                            'unit-name': 'TRLD',
                            url: 'https://terragrids.org#3'
                        }
                    }, {
                        index: 4,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terraland #4',
                            total: 100,
                            'unit-name': 'TRLD',
                            url: 'https://terragrids.org#4'
                        }
                    }, {
                        index: 5,
                        deleted: false,
                        params: {
                            decimals: 0,
                            name: 'Terraland #5',
                            total: 1,
                            'unit-name': 'TRLD',
                            url: 'https://terragrids.org#5'
                        }
                    }]
                }
            }))

            mockTokenRepository.getToken.mockImplementation(assetId => Promise.resolve({
                id: assetId,
                positionX: assetId + 10,
                positionY: assetId + 11
            }))

            const response = await request(app.callback()).get('/nfts/type/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terraland #1',
                    symbol: 'TRLD',
                    url: 'https://terragrids.org#1',
                    positionX: 11,
                    positionY: 12
                }, {
                    id: 5,
                    name: 'Terraland #5',
                    symbol: 'TRLD',
                    url: 'https://terragrids.org#5',
                    positionX: 15,
                    positionY: 16
                }]
            })
        })

        it('should return 200 when calling nft type endpoint and some assets found in db', async () => {
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

            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({ id: 1 }))

            const response = await request(app.callback()).get('/nfts/type/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terracell #1',
                    symbol: 'TRCL',
                    url: 'https://terragrids.org#1'
                }]
            })
        })

        it('should return 200 when calling nft type endpoint and no assets found in db', async () => {
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

            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({}))

            const response = await request(app.callback()).get('/nfts/type/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('assets?unit=TRCL')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: []
            })
        })
    })

    describe('get account nft type endpoint', function () {
        it('should return 200 when calling account nft type endpoint and no assets found', async () => {
            mockAlgoIndexer.callRandLabsIndexerEndpoint.mockImplementation(() => Promise.resolve({
                status: 404
            }))

            const response = await request(app.callback()).get('/accounts/123/nfts/symbol')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('accounts/123/assets')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({ assets: [] })
        })

        it('should return 200 when calling account terracells endpoint and db assets found', async () => {
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

            mockTokenRepository.getToken.mockImplementation(assetId => Promise.resolve({ id: assetId }))

            const response = await request(app.callback()).get('/accounts/123/nfts/trcl')

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

        it('should return 200 when calling account terracells endpoint and some db assets found', async () => {
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

            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({ id: 1 }))

            const response = await request(app.callback()).get('/accounts/123/nfts/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('accounts/123/assets')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: [{
                    id: 1,
                    name: 'Terracell 1',
                    symbol: 'TRCL'
                }]
            })
        })

        it('should return 200 when calling account terracells endpoint and no db assets found', async () => {
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

            mockTokenRepository.getToken.mockImplementation(() => Promise.resolve({}))

            const response = await request(app.callback()).get('/accounts/123/nfts/trcl')

            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledTimes(1)
            expect(mockAlgoIndexer.callRandLabsIndexerEndpoint).toHaveBeenCalledWith('accounts/123/assets')

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                assets: []
            })
        })
    })

    describe('delete nfts endpoint', function () {
        it('should return 204 when deleting nft', async () => {
            const response = await request(app.callback()).delete('/nfts/123')

            expect(mockTokenRepository.deleteToken).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.deleteToken).toHaveBeenCalledWith('123')

            expect(response.status).toBe(204)
        })
    })

    describe('post nfts endpoint', function () {
        it('should return 201 when posting trcl nfts', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRCL',
                    offchainUrl: 'offchain_url',
                    power: 10
                })

            expect(mockTokenRepository.putTrclToken).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTrclToken).toHaveBeenCalledWith({
                assetId: '123',
                symbol: 'TRCL',
                offchainUrl: 'offchain_url',
                power: 10
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({})
        })

        it('should return 201 when posting trld nfts', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRLD',
                    offchainUrl: 'offchain_url',
                    positionX: 12,
                    positionY: 7
                })

            expect(mockTokenRepository.putTrldToken).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTrldToken).toHaveBeenCalledWith({
                assetId: '123',
                symbol: 'TRLD',
                offchainUrl: 'offchain_url',
                positionX: 12,
                positionY: 7
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({})
        })

        it('should return 201 when posting trbd nfts', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRBD',
                    offchainUrl: 'offchain_url'
                })

            expect(mockTokenRepository.putTrbdToken).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.putTrbdToken).toHaveBeenCalledWith({
                assetId: '123',
                symbol: 'TRBD',
                offchainUrl: 'offchain_url'
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({})
        })

        it('should return 400 when posting unsupported nfts', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'SYMB',
                    offchainUrl: 'offchain_url'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'NftTypeError',
                message: 'Invalid NFT type'
            })
        })

        it('should return 400 when posting nft endpoint and asset id missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    symbol: 'TRCL',
                    offchainUrl: 'offchain_url'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'assetId must be specified'
            })
        })

        it('should return 400 when posting nft endpoint and asset symbol missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    offchainUrl: 'offchain_url'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'symbol must be specified'
            })
        })

        it('should return 400 when posting nft endpoint and offchain url missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRCL'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'offchainUrl must be specified'
            })
        })

        it('should return 400 when posting trcl nft and power missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRCL',
                    offchainUrl: 'offchain_url'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'power must be specified'
            })
        })

        it('should return 400 when posting trcl nft and power not a number', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRCL',
                    offchainUrl: 'offchain_url',
                    power: 'meh'
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'TypePositiveNumberError',
                message: 'power must be a positive number'
            })
        })

        it('should return 400 when posting trcl nft and power not a positive number', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRCL',
                    offchainUrl: 'offchain_url',
                    power: -12
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'TypePositiveNumberError',
                message: 'power must be a positive number'
            })
        })

        it('should return 400 when posting trld nft and positionX missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRLD',
                    offchainUrl: 'offchain_url',
                    positionY: 10
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'TypeNumberError',
                message: 'positionX must be a number'
            })
        })

        it('should return 400 when posting trld nft and positionY missing', async () => {
            const response = await request(app.callback())
                .post('/nfts')
                .send({
                    assetId: '123',
                    symbol: 'TRLD',
                    offchainUrl: 'offchain_url',
                    positionX: 10
                })

            expect(mockTokenRepository.putTrclToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrldToken).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTrbdToken).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'TypeNumberError',
                message: 'positionY must be a number'
            })
        })
    })

    describe('post nft contract endpoint', function () {
        it('should return 201 when calling nft contract endpoint and both nft and application found', async () => {
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
                .post('/nfts/123/contracts/456')
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
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: true
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: true
            })
        })

        it('should return 404 when calling nft contract endpoint and nft not found', async () => {
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
                .post('/nfts/123/contracts/456')
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

        it('should return 404 when calling nft contract endpoint and asset type not valid', async () => {
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
                .post('/nfts/123/contracts/456')
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

        it('should return 404 when calling nft contract endpoint and application not found', async () => {
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
                .post('/nfts/123/contracts/456')
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
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: false
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: false
            })
        })

        it('should return 404 when calling nfts contract endpoint and application approval program not valid', async () => {
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
                .post('/nfts/123/contracts/456')
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
                assetPrice: '10',
                assetPriceUnit: 'ALGO',
                verified: false
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                contractVerified: false
            })
        })

        it('should return 400 when calling nft contract endpoint and contract info missing', async () => {
            const response = await request(app.callback())
                .post('/nfts/123/contracts/456')
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

        it('should return 400 when calling nft contract endpoint and seller address missing', async () => {
            const response = await request(app.callback())
                .post('/nfts/123/contracts/456')
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

        it('should return 400 when calling nft contract endpoint and asset price missing', async () => {
            const response = await request(app.callback())
                .post('/nfts/123/contracts/456')
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

        it('should return 400 when calling nft contract endpoint and asset price unit missing', async () => {
            const response = await request(app.callback())
                .post('/nfts/123/contracts/456')
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

        it('should return 400 when calling nft contract endpoint and request body missing', async () => {
            const response = await request(app.callback())
                .post('/nfts/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).not.toHaveBeenCalled()
            expect(mockTokenRepository.putTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'contractInfo must be specified'
            })
        })
    })

    describe('delete nft contract endpoint', function () {
        it('should return 204 when calling nft contract endpoint and nft found and application not running', async () => {
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

            const response = await request(app.callback()).delete('/nfts/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).toHaveBeenCalledTimes(1)
            expect(mockTokenRepository.deleteTokenContract).toHaveBeenCalledWith('123')

            expect(response.status).toBe(204)
        })

        it('should return 404 when calling nft contract endpoint and nft not found', async () => {
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

            const response = await request(app.callback()).delete('/nfts/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 404 when calling nft contract endpoint and asset not valid', async () => {
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

            const response = await request(app.callback()).delete('/nfts/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(404)
        })

        it('should return 400 when calling nft contract endpoint and application still running', async () => {
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
                                    id: '456',
                                    params: {
                                        'approval-program': 'meh'
                                    }
                                }
                            }
                        })
                }
            })

            const response = await request(app.callback()).delete('/nfts/123/contracts/456')

            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledTimes(2)
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('assets/123')
            expect(mockAlgoIndexer.callAlgonodeIndexerEndpoint).toHaveBeenCalledWith('applications/456')

            expect(mockTokenRepository.deleteTokenContract).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'ApplicationStillRunningError',
                message: 'Application specified is still running'
            })
        })
    })

    describe('get spp endpoint', function () {
        it('should return 200 when calling spp endpoind', async () => {
            mockTokenRepository.getSpp.mockImplementation(() => Promise.resolve({
                capacity: 123,
                output: 456
            }))

            const response = await request(app.callback()).get('/spp')

            expect(mockTokenRepository.getSpp).toHaveBeenCalledTimes(1)

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                capacity: 123,
                output: 456
            })
        })
    })

    describe('post ipfs files endpoint', function () {
        it('should return 201 when calling ipfs files endpoint and s3 file is found', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockS3Repository.getFileReadStream.mockImplementation(() => {
                return Promise.resolve({
                    fileStream: 'fileStream',
                    contentType: 'content/type'
                })
            })

            mockIpfsRepository.pinFile.mockImplementation(() => {
                return Promise.resolve({
                    IpfsHash: 'FileIpfsHash'
                })
            })

            mockIpfsRepository.pinJson.mockImplementation(() => {
                return Promise.resolve({
                    IpfsHash: 'JsonIpfsHash',
                    assetName: 'asset-name',
                    integrity: 'json-integrity'
                })
            })

            const response = await request(app.callback())
                .post('/ipfs/files')
                .send({
                    assetName: 'asset name',
                    assetDescription: 'asset description',
                    fileName: 'filename'
                })

            expect(mockS3Repository.getFileReadStream).toHaveBeenCalledTimes(1)
            expect(mockS3Repository.getFileReadStream).toHaveBeenCalledWith('filename')

            expect(mockIpfsRepository.pinFile).toHaveBeenCalledTimes(1)
            expect(mockIpfsRepository.pinFile).toHaveBeenCalledWith('fileStream')

            expect(mockIpfsRepository.pinJson).toHaveBeenCalledTimes(1)
            expect(mockIpfsRepository.pinJson).toHaveBeenCalledWith({
                assetName: 'asset name',
                assetDescription: 'asset description',
                fileIpfsHash: 'FileIpfsHash',
                fileName: 'filename',
                fileMimetype: 'content/type'
            })

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                assetName: 'asset-name',
                url: 'ipfs://JsonIpfsHash',
                integrity: 'json-integrity'
            })
        })

        it('should return 400 when calling ipfs files endpoint and asset name info missing', async () => {
            const response = await request(app.callback())
                .post('/ipfs/files')
                .send({
                    assetDescription: 'asset description',
                    fileName: 'filename'
                })

            expect(mockS3Repository.getFileReadStream).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinFile).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinJson).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'assetName must be specified'
            })
        })

        it('should return 400 when calling ipfs files endpoint and asset description info missing', async () => {
            const response = await request(app.callback())
                .post('/ipfs/files')
                .send({
                    assetName: 'asset name',
                    fileName: 'filename'
                })

            expect(mockS3Repository.getFileReadStream).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinFile).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinJson).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'assetDescription must be specified'
            })
        })

        it('should return 400 when calling ipfs files endpoint and file name info missing', async () => {
            const response = await request(app.callback())
                .post('/ipfs/files')
                .send({
                    assetName: 'asset name',
                    assetDescription: 'asset description'
                })

            expect(mockS3Repository.getFileReadStream).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinFile).not.toHaveBeenCalled()
            expect(mockIpfsRepository.pinJson).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'fileName must be specified'
            })
        })
    })

    describe('post files upload endpoint', function () {
        it('should return 201 when calling files upload endpoint', async () => {
            process.env.ALGO_APP_APPROVAL = 'approval_program_value'

            mockS3Repository.getUploadSignedUrl.mockImplementation(() => {
                return Promise.resolve({
                    id: 'id',
                    url: 'url'
                })
            })

            const response = await request(app.callback())
                .post('/files/upload')
                .send({
                    contentType: 'content/type'
                })

            expect(mockS3Repository.getUploadSignedUrl).toHaveBeenCalledTimes(1)
            expect(mockS3Repository.getUploadSignedUrl).toHaveBeenCalledWith('content/type')

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                id: 'id',
                url: 'url'
            })
        })

        it('should return 400 when calling files upload endpoint and content type info missing', async () => {
            const response = await request(app.callback())
                .post('/files/upload')
                .send({})

            expect(mockS3Repository.getUploadSignedUrl).not.toHaveBeenCalled()

            expect(response.status).toBe(400)
            expect(response.body).toEqual({
                error: 'MissingParameterError',
                message: 'contentType must be specified'
            })
        })
    })
})
