// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct, RemovalPolicy } from '@aws-cdk/core';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack'
import { IBucket, Bucket, BucketProps, HttpMethods } from '@aws-cdk/aws-s3';
import { WebS3Bucket } from '../construct/web-s3-bucket';

interface IBucketCreationProps {
    bucketName : string,
    isWeb? : boolean,
    alreadyExists: boolean,
    retain : boolean
}

/**
 * StorageLayer is a construct that describes the required resources
 * to store the static data. That includes both S3 and SystemsManager.
 */
export class StorageLayer extends ResourceAwareConstruct {

    constructor(parent: Construct, name: string, props: IParameterAwareProps) {
        super(parent, name, props);
        this.createBuckets();
    }

    /**
     * This function receives the desired bucket configuration
     * and then creates (or imports) the bucket
     */
    private createBucket(props: IBucketCreationProps): IBucket {
        if (props.alreadyExists) {
            return Bucket.fromBucketArn(this, props.bucketName, 'arn:aws:s3:::' + props.bucketName);
        }

        if (props.isWeb) {
            const webBucket = new WebS3Bucket(this, props.bucketName, {
                bucketName: props.bucketName
            });

            return webBucket.bucket;
        }

        var bucketProperties: BucketProps = {
            bucketName: props.bucketName,
            removalPolicy: props.retain ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
        };

        return new Bucket(this, props.bucketName, bucketProperties);
    }

    createBuckets() {
        let appBucketName = this.properties.getApplicationName().toLowerCase() + '.app';
        let rawDataBucketName = this.properties.getApplicationName().toLowerCase() + '.raw';

        let appBucket = this.createBucket( {
             bucketName : appBucketName
            ,isWeb : true
            ,alreadyExists : this.properties.getParameter('existingbuckets').includes(appBucketName)
            ,retain : true
        });
        this.addResource('appBucket',appBucket);


        let rawDataBucket = this.createBucket({
             bucketName : rawDataBucketName
            ,alreadyExists : this.properties.getParameter('existingbuckets').includes(rawDataBucketName)
            ,retain : true
        });
        this.addResource('rawDataBucket',rawDataBucket);
    }

    getRawDataBucketArn() : string {
        let rawDataBucketName = this.properties.getApplicationName().toLowerCase() + '.raw';
        return 'arn:aws:s3:::'+rawDataBucketName;
    }
}