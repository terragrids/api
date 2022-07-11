import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

export default class S3Repository {
    s3

    constructor() {
        this.s3 = new S3Client({ region: process.env.S3_REGION })
    }

    async testConnection() {
        try {
            const command = new HeadBucketCommand({
                Bucket: 'org-terragrids-images'
            })
            const response = await this.s3.send(command)
            return response.$metadata.httpStatusCode === 200
        } catch (e) {
            return { error: e.message }
        }
    }
}