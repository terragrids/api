import bs58 from 'bs58'
import { Blob, FormData } from 'formdata-node'
import fetch from 'node-fetch'
import IpfsFilePinningError from '../error/ipfs-file-pinning-error.js'
import IpfsJsonPinningError from '../error/ipfs-json-pinning-error.js'
import BlobFromStream from '../utils/blob-from-stream.js'

export default class IpfsRepository {
    constructor() {
        this.infuraApiUrl = 'https://ipfs.infura.io:5001/api/v0'
        const credentials = `${process.env.INFURA_IPFS_API_KEY}:${process.env.INFURA_IPFS_API_SECRET}`
        this.basicAuthorization = `Basic ${Buffer.from(credentials).toString('base64')}`
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.infuraApiUrl}/version`, {
                method: 'POST',
                headers: { Authorization: this.basicAuthorization }
            })
            return response.status === 200
        } catch (e) {
            return { error: e }
        }
    }

    async pinFile(stream, name, length) {
        try {
            const formData = new FormData()
            formData.set('file', new BlobFromStream(stream, length), name)

            const response = await fetch(`${this.infuraApiUrl}/add`, {
                method: 'POST',
                headers: { Authorization: this.basicAuthorization },
                body: formData
            })

            if (response.status === 200) {
                const json = await response.json()
                return { hash: json.Hash }
            } else throw new Error('Unable to upload file to IPFS')
        } catch (e) {
            throw new IpfsFilePinningError(e)
        }
    }

    async pinJson({ assetName, assetDescription, assetProperties, fileIpfsHash, fileMimetype }) {
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
                    }),
                    ...(assetProperties.type && {
                        placeType: {
                            name: 'place type',
                            value: assetProperties.type.code,
                            display_value: assetProperties.type.name
                        }
                    })
                }
            }

            const formData = new FormData()
            const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            formData.set('metadata', blob)

            const response = await fetch(`${this.infuraApiUrl}/add`, {
                method: 'POST',
                headers: { Authorization: this.basicAuthorization },
                body: formData
            })

            if (response.status === 200) {
                const json = await response.json()
                const integrity = this.convertIpfsCidV0ToByte32(json.Hash)

                return {
                    hash: json.Hash,
                    assetName,
                    integrity
                }
            } else throw new Error('Unable to upload file to IPFS')
        } catch (e) {
            throw new IpfsJsonPinningError(e)
        }
    }

    convertIpfsCidV0ToByte32(cid) {
        const uint8Array = bs58.decode(cid).slice(2)
        return Buffer.from(uint8Array).toString('base64')
    }
}
