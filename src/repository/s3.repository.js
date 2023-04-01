import { GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import S3KeyNotFoundError from '../error/s3-key-not-found-error.js'
import S3ReadError from '../error/s3-read-error.js'
import uuid from '../utils/uuid.js'

export default class S3Repository {
    s3
    bucket

    constructor() {
        this.s3 = new S3Client({ region: process.env.S3_REGION })
        this.bucket = 'org-terragrids-images'
    }

    async testConnection() {
        try {
            const command = new HeadBucketCommand({
                Bucket: this.bucket
            })
            const response = await this.s3.send(command)
            return response.$metadata.httpStatusCode === 200
        } catch (e) {
            return { error: e.$metadata.httpStatusCode }
        }
    }

    async getFileReadStream(fileName) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: fileName
        })

        try {
            const response = await this.s3.send(command)
            if (response.$metadata.httpStatusCode === 200) {
                return {
                    contentType: response.ContentType,
                    contentLength: response.ContentLength,
                    fileStream: response.Body
                }
            } else {
                throw new S3ReadError()
            }
        } catch (e) {
            if (e.$metadata.httpStatusCode === 404) {
                throw new S3KeyNotFoundError()
            } else {
                throw new S3ReadError()
            }
        }
    }

    async getFileMetadata(fileName) {
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: fileName
        })

        try {
            const response = await this.s3.send(command)
            if (response.$metadata.httpStatusCode === 200) {
                return {
                    contentType: response.ContentType,
                    contentLength: response.ContentLength
                }
            } else {
                throw new S3ReadError()
            }
        } catch (e) {
            if (e.$metadata.httpStatusCode === 404) {
                throw new S3KeyNotFoundError()
            } else {
                throw new S3ReadError()
            }
        }
    }

    async getUploadSignedUrl(contentType) {
        const imageId = uuid()

        const parameters = {
            Bucket: this.bucket,
            Key: imageId,
            ContentType: contentType,
            CacheControl: 'max-age=7776000', // instructs CloudFront to cache for 90 days
            ACL: 'private',
            Metadata: {
                imageId
            }
        }

        const fiveMinutes = 300
        const command = new PutObjectCommand(parameters)
        const url = await getSignedUrl(this.s3, command, { expiresIn: fiveMinutes })

        return {
            id: imageId,
            url: url
        }
    }
}
