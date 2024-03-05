import bs58 from 'bs58'
import FormData from 'form-data'
import fetch from 'node-fetch'
import IpfsFilePinningError from '../error/ipfs-file-pinning-error.js'
import IpfsJsonPinningError from '../error/ipfs-json-pinning-error.js'

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

    async pinFile(stream, name /*length*/) {
        try {
            const formData = new FormData()
            // TODO: reintroduce formdata-node when this has been fixed https://github.com/node-fetch/node-fetch/issues/1718
            // formData.set('file', new BlobFromStream(stream, length), name)
            formData.append('file', stream, name)

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

    async pinJson({ name, description, properties, fileIpfsHash, fileMimetype }) {
        try {
            const fileIntegrity = this.convertIpfsCidV0ToByte32(fileIpfsHash)
            const imageIntegrity = `sha256-${fileIntegrity}`

            const metadata = {
                name: name,
                description: description,
                image: `ipfs://${fileIpfsHash}`,
                image_integrity: imageIntegrity,
                image_mimetype: fileMimetype,
                properties: {
                    ...(properties.price && {
                        base_price: {
                            name: 'base price',
                            value: properties.price,
                            display_value: `${properties.price} ALGO`
                        }
                    }),
                    ...(properties.rarity && {
                        rarity: {
                            name: 'rarity',
                            value: properties.rarity,
                            display_value: properties.rarity
                        }
                    }),
                    ...(properties.author && {
                        author: {
                            name: 'author',
                            value: properties.author,
                            display_value: properties.author
                        }
                    }),
                    ...(properties.power && {
                        power: {
                            name: 'power',
                            value: properties.power,
                            display_value: `${properties.power} TRW`
                        }
                    }),
                    ...(properties.budget && {
                        budget: {
                            name: 'budget',
                            value: properties.budget,
                            display_value: `${properties.budget} ALGO`
                        }
                    }),
                    ...(properties.type && {
                        placeType: {
                            name: 'place type',
                            value: properties.type.code,
                            display_value: properties.type.name
                        }
                    })
                }
            }

            const formData = new FormData()
            // TODO: reintroduce formdata-node when this has been fixed https://github.com/node-fetch/node-fetch/issues/1718
            // const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
            formData.append('metadata', JSON.stringify(metadata))

            const response = await fetch(`${this.infuraApiUrl}/add`, {
                method: 'POST',
                headers: { Authorization: this.basicAuthorization },
                body: formData
            })

            if (response.status === 200) {
                const json = await response.json()
                const integrity = this.convertIpfsCidV0ToByte32(json.Hash)

                return {
                    name,
                    hash: json.Hash,
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
