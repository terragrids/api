import pinataSDK from '@pinata/sdk'
import bs58 from 'bs58'
import IpfsFilePinningError from '../error/ipfs-file-pinning-error.js'
import IpfsJsonPinningError from '../error/ipfs-json-pinning-error.js'

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

    async pinFile(fileStream, options = {}) {
        try {
            return await this.pinata.pinFileToIPFS(fileStream, options)
        } catch (e) {
            throw new IpfsFilePinningError(e.message)
        }
    }

    async pinJson({ assetName, assetDescription, ipfsHash, fileName, fileMimetype, options = {} }) {
        try {
            const integrity = this.convertIpfsCidV0ToByte32(ipfsHash)

            const metadata = {
                name: `${assetName}@arc3`,
                description: assetDescription,
                image: `ipfs://${ipfsHash}`,
                image_integrity: `sha256-${integrity}`,
                image_mimetype: fileMimetype,
                properties: {
                    file_url: fileName,
                    file_url_integrity: `sha256-${integrity}`,
                    file_url_mimetype: fileMimetype
                }
            }

            return await this.pinata.pinJSONToIPFS(metadata, options)
        } catch (e) {
            throw new IpfsJsonPinningError(e.message)
        }
    }

    convertIpfsCidV0ToByte32(cid) {
        const uint8Array = bs58.decode(cid).slice(2)
        return Buffer.from(uint8Array).toString('base64')
    }
}