import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as kds from '@aws-cdk/aws-kinesis';
import * as kdf from '@aws-cdk/aws-kinesisfirehose';
import { KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { LogGroup, LogStream } from '@aws-cdk/aws-logs';
import { PolicyDocument, PolicyStatement, ServicePrincipal, Role } from '@aws-cdk/aws-iam';

export interface KinesisStreamFirehoseS3Props {
    applicationName: string;
    kinesisStreamsLambda: lambda.Function
    accountId?: string,
    region?: string,
    bucketDestinationArn: string;
}

/**
 * Kinesis Stream - Kinesis Firehose - S3
 */
export class KinesisStreamFirehoseS3 extends cdk.Construct {
    public static KINESIS_INTEGRATION: boolean = false;
    public static FIREHOSE: boolean = false;

    public readonly kinesisStreams: kds.IStream;
    public readonly kinesisFirehose: kdf.CfnDeliveryStream;

    private readonly firehoseLogGroup: LogGroup;

    constructor(scope: cdk.Construct, id: string, props: KinesisStreamFirehoseS3Props) {
        super(scope, id);

        this.kinesisStreams = new kds.Stream(this, props.applicationName + 'InputStream', {
            streamName: props.applicationName + '_InputStream',
            shardCount: 1
        });

        // MISSING KINESIS INTEGRATION
        if (KinesisStreamFirehoseS3.KINESIS_INTEGRATION) {
            new KinesisEventSource(this.kinesisStreams, {
                batchSize: 700,
                startingPosition: lambda.StartingPosition.LATEST
            }).bind(props.kinesisStreamsLambda);
        }

        // MISSING KINESIS FIREHOSE
        if (KinesisStreamFirehoseS3.FIREHOSE) {
            const firehoseName: string = props.applicationName + '_Firehose';

            this.firehoseLogGroup = this.createLogGroup(firehoseName, props);

            const firehoseRole: Role = this.buildFirehoseRole(props, this.firehoseLogGroup.logGroupName);

            this.kinesisFirehose = new kdf.CfnDeliveryStream(this, props.applicationName + 'RawData', {
                deliveryStreamType: 'KinesisStreamAsSource',
                deliveryStreamName: firehoseName,
                kinesisStreamSourceConfiguration: {
                    kinesisStreamArn: this.kinesisStreams.streamArn,
                    roleArn: firehoseRole.roleArn
                },
                s3DestinationConfiguration: {
                    bucketArn: props.bucketDestinationArn,
                    bufferingHints: {
                        intervalInSeconds: 300,
                        sizeInMBs: 1
                    },
                    compressionFormat: 'GZIP',
                    roleArn: firehoseRole.roleArn,
                    cloudWatchLoggingOptions: {
                        enabled: true,
                        logGroupName: this.firehoseLogGroup.logGroupName,
                        logStreamName: this.firehoseLogGroup.logGroupName
                    }
                }
            });

            this.kinesisFirehose.node.addDependency(this.firehoseLogGroup);
        }
    }

    private createLogGroup(firehoseName: string, props: KinesisStreamFirehoseS3Props): LogGroup {
        let firehoseLogGroupName = '/aws/kinesisfirehose/' + firehoseName;

        const logGroup: LogGroup = new LogGroup(this, props.applicationName + 'firehoseloggroup', {
            logGroupName: firehoseLogGroupName
        });
        new LogStream(this, props.applicationName + 'firehoselogstream', {
            logGroup: this.firehoseLogGroup,
            logStreamName: "error"
        });

        return logGroup;
    }

    private buildFirehoseRole(props: KinesisStreamFirehoseS3Props, firehoseLogGroupName: string): Role {
        return new Role(this, props.applicationName + 'FirehoseToStreamsRole', {
            roleName: props.applicationName + 'FirehoseToStreamsRole',
            assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
            inlinePolicies: {
                'GluePermissions': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [
                                "glue:GetTableVersions"
                            ],
                            resources: ["*"]
                        })
                    ]
                }),
                'S3RawDataPermission': new PolicyDocument({
                    statements: [
                        new PolicyStatement(
                            {
                                actions: [
                                    's3:AbortMultipartUpload',
                                    's3:GetBucketLocation',
                                    's3:GetObject',
                                    's3:ListBucket',
                                    's3:ListBucketMultipartUploads',
                                    's3:PutObject',
                                ],
                                resources: [
                                    props.bucketDestinationArn,
                                    props.bucketDestinationArn + '/*'
                                ]
                            }
                        )
                    ]
                }),
                'DefaultFirehoseLambda': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [
                                "lambda:InvokeFunction",
                                "lambda:GetFunctionConfiguration"
                            ],
                            resources: [
                                "arn:aws:lambda:" + props.region + ":" + props.accountId + ":function:%FIREHOSE_DEFAULT_FUNCTION%:%FIREHOSE_DEFAULT_VERSION%"
                            ]
                        })
                    ]
                }),
                'InputStreamReadPermissions': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [
                                'kinesis:DescribeStream',
                                'kinesis:GetShardIterator',
                                'kinesis:GetRecords'
                            ],
                            resources: [
                                this.kinesisStreams.streamArn
                            ]
                        })
                    ]
                }),
                'CloudWatchLogsPermissions': new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: ['logs:PutLogEvents'],
                            resources: [
                                'arn:aws:logs:' + props.region + ':' + props.accountId + ':log-group:/' + firehoseLogGroupName + ':log-stream:*'
                            ]
                        })
                    ]
                })
            }
        });
    }
}
