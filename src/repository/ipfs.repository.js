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

    async pinJson({ assetName, assetDescription, assetProperties, fileIpfsHash, fileName, fileMimetype, options = {} }) {
        try {
            const fileIntegrity = this.convertIpfsCidV0ToByte32(fileIpfsHash)
            const imageIntegrity = `sha256-${fileIntegrity}`

            const metadata = {
                name: assetName,
                description: assetDescription,
                image: `ipfs://${fileIpfsHash}`,
                image_integrity: imageIntegrity,
                image_mimetype: fileMimetype,
                properties: {
                    file_url: fileName,
                    file_url_integrity: imageIntegrity,
                    file_url_mimetype: fileMimetype,
                    ...(assetProperties.price && {
                        base_price: {
                            name: 'base price',
                            value: assetProperties.price,
                            display_value: `${assetProperties.price} ALGO`
                        }
                    }),
                    ...(assetProperties.rarity && {
                        rarity: {
                            name: 'rarity',
                            value: assetProperties.rarity,
                            display_value: assetProperties.rarity
                        }
                    }),
                    ...(assetProperties.author && {
                        author: {
                            name: 'author',
                            value: assetProperties.author,
                            display_value: assetProperties.author
                        }
                    }),
                    ...(assetProperties.power && {
                        power: {
                            name: 'power',
                            value: assetProperties.power,
                            display_value: `${assetProperties.power} TRW`
                        }
                    }),
                    ...(assetProperties.budget && {
                        budget: {
                            name: 'budget',
                            value: assetProperties.budget,
                            display_value: `${assetProperties.budget} ALGO`
                        }
                    })
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
