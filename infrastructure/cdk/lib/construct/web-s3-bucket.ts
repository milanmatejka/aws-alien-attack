import * as cdk from '@aws-cdk/core';
import { IBucket, Bucket, BucketProps, HttpMethods } from '@aws-cdk/aws-s3';
import { RemovalPolicy } from '@aws-cdk/core';

export interface WebS3BucketProps {
    // Physical name of the bucket
    bucketName: string;
    // Policy to apply when bucket is removed.
    // Default value: RemovalPolicy.RETAIN
    removalPolicy?: RemovalPolicy
}

/**
 * S3 bucket for websites.
 */
export class WebS3Bucket extends cdk.Construct{
    public readonly bucket: IBucket;

    constructor(scope: cdk.Construct, id: string, props: WebS3BucketProps) {
        super(scope, id);

        const bucketProperties: BucketProps = {
            bucketName: props.bucketName,
            cors: [
                {
                    allowedHeaders: ["*"],
                    allowedMethods: [
                        HttpMethods.GET,
                        HttpMethods.PUT,
                        HttpMethods.DELETE,
                        HttpMethods.POST
                    ],
                    allowedOrigins: ["*"]
                }
            ],
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN
        }

         this.bucket = new Bucket(this, props.bucketName, bucketProperties);
    }
}
