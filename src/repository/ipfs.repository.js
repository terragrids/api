import pinataSDK from '@pinata/sdk'

export default class IpfsRepository {
    pinata

    constructor() {
        this.pinata = pinataSDK(process.env.PINATA_IPFS_API_KEY, process.env.PINATA_IPFS_API_SECRET)
    }

    async testConnection() {
        try {
            const response = await this.pinata.testAuthentication()
            return response.authenticated === true ? true : false
        } catch (e) {
            return { error: e }
        }
    }
}