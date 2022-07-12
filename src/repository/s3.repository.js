import { GetObjectCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import S3ReadError from '../error/s3-read-error.js'

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
    }
}