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

    async pinJson({ assetName, assetDescription, fileIpfsHash, fileName, fileMimetype, options = {} }) {
        try {
            const fileIntegrity = this.convertIpfsCidV0ToByte32(fileIpfsHash)
            const assetName = `${assetName}@arc3`

            const metadata = {
                name: assetName,
                description: assetDescription,
                image: `ipfs://${fileIpfsHash}`,
                image_integrity: `sha256-${fileIntegrity}`,
                image_mimetype: fileMimetype,
                properties: {
                    file_url: fileName,
                    file_url_integrity: `sha256-${fileIntegrity}`,
                    file_url_mimetype: fileMimetype
                }
            }

            const result = await this.pinata.pinJSONToIPFS(metadata, options)
            const jsonIntegrity = this.convertIpfsCidV0ToByte32(result.IpfsHash)

            return {
                ...result,
                assetName,
                integrity: jsonIntegrity
            }
        } catch (e) {
            throw new IpfsJsonPinningError(e.message)
        }
    }

    convertIpfsCidV0ToByte32(cid) {
        const uint8Array = bs58.decode(cid).slice(2)
        return Buffer.from(uint8Array).toString('base64')
    }
}
