"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinesisStreamFirehoseS3 = void 0;
const cdk = require("@aws-cdk/core");
const lambda = require("@aws-cdk/aws-lambda");
const kds = require("@aws-cdk/aws-kinesis");
const kdf = require("@aws-cdk/aws-kinesisfirehose");
const aws_lambda_event_sources_1 = require("@aws-cdk/aws-lambda-event-sources");
const aws_logs_1 = require("@aws-cdk/aws-logs");
const aws_iam_1 = require("@aws-cdk/aws-iam");
/**
 * Kinesis Stream - Kinesis Firehose - S3
 */
class KinesisStreamFirehoseS3 extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.kinesisStreams = new kds.Stream(this, props.applicationName + 'InputStream', {
            streamName: props.applicationName + '_InputStream',
            shardCount: 1
        });
        // MISSING KINESIS INTEGRATION
        if (KinesisStreamFirehoseS3.KINESIS_INTEGRATION) {
            new aws_lambda_event_sources_1.KinesisEventSource(this.kinesisStreams, {
                batchSize: 700,
                startingPosition: lambda.StartingPosition.LATEST
            }).bind(props.kinesisStreamsLambda);
        }
        // MISSING KINESIS FIREHOSE
        if (KinesisStreamFirehoseS3.FIREHOSE) {
            const firehoseName = props.applicationName + '_Firehose';
            this.firehoseLogGroup = this.createLogGroup(firehoseName, props);
            const firehoseRole = this.buildFirehoseRole(props, this.firehoseLogGroup.logGroupName);
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
    createLogGroup(firehoseName, props) {
        let firehoseLogGroupName = '/aws/kinesisfirehose/' + firehoseName;
        const logGroup = new aws_logs_1.LogGroup(this, props.applicationName + 'firehoseloggroup', {
            logGroupName: firehoseLogGroupName
        });
        new aws_logs_1.LogStream(this, props.applicationName + 'firehoselogstream', {
            logGroup: this.firehoseLogGroup,
            logStreamName: "error"
        });
        return logGroup;
    }
    buildFirehoseRole(props, firehoseLogGroupName) {
        return new aws_iam_1.Role(this, props.applicationName + 'FirehoseToStreamsRole', {
            roleName: props.applicationName + 'FirehoseToStreamsRole',
            assumedBy: new aws_iam_1.ServicePrincipal('firehose.amazonaws.com'),
            inlinePolicies: {
                'GluePermissions': new aws_iam_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            actions: [
                                "glue:GetTableVersions"
                            ],
                            resources: ["*"]
                        })
                    ]
                }),
                'S3RawDataPermission': new aws_iam_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
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
                        })
                    ]
                }),
                'DefaultFirehoseLambda': new aws_iam_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
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
                'InputStreamReadPermissions': new aws_iam_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
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
                'CloudWatchLogsPermissions': new aws_iam_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
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
exports.KinesisStreamFirehoseS3 = KinesisStreamFirehoseS3;
KinesisStreamFirehoseS3.KINESIS_INTEGRATION = false;
KinesisStreamFirehoseS3.FIREHOSE = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2luZXNpcy1zdHJlYW0tZmlyZWhvc2UtczMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJraW5lc2lzLXN0cmVhbS1maXJlaG9zZS1zMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsOENBQThDO0FBQzlDLDRDQUE0QztBQUM1QyxvREFBb0Q7QUFDcEQsZ0ZBQXVFO0FBQ3ZFLGdEQUF3RDtBQUN4RCw4Q0FBMkY7QUFVM0Y7O0dBRUc7QUFDSCxNQUFhLHVCQUF3QixTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBU3RELFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBbUM7UUFDN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGVBQWUsR0FBRyxhQUFhLEVBQUU7WUFDOUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsY0FBYztZQUNsRCxVQUFVLEVBQUUsQ0FBQztTQUNoQixDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsSUFBSSx1QkFBdUIsQ0FBQyxtQkFBbUIsRUFBRTtZQUM3QyxJQUFJLDZDQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3hDLFNBQVMsRUFBRSxHQUFHO2dCQUNkLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO2FBQ25ELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkM7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLEVBQUU7WUFDbEMsTUFBTSxZQUFZLEdBQVcsS0FBSyxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUM7WUFFakUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLEtBQUss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SSx3QkFBYyxDQUFDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1IsSUFBSSx5QkFBZSxDQUFDOzRCQUNoQixPQUFPLEVBQUU7Z0NBQ0wsdUJBQXVCO2dDQUN2QixpQ0FBaUM7NkJBQ3BDOzRCQUNELFNBQVMsRUFBRTtnQ0FDUCxpQkFBaUIsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsU0FBUyxHQUFHLGtFQUFrRTs2QkFDaEk7eUJBQ0osQ0FBQztxQkFDTDtpQkFDSixDQUFDO2dCQUNGLDRCQUE0QixFQUFFLElBQUksd0JBQWMsQ0FBQztvQkFDN0MsVUFBVSxFQUFFO3dCQUNSLElBQUkseUJBQWUsQ0FBQzs0QkFDaEIsT0FBTyxFQUFFO2dDQUNMLHdCQUF3QjtnQ0FDeEIsMEJBQTBCO2dDQUMxQixvQkFBb0I7NkJBQ3ZCOzRCQUNELFNBQVMsRUFBRTtnQ0FDUCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVM7NkJBQ2hDO3lCQUNKLENBQUM7cUJBQ0w7aUJBQ0osQ0FBQztnQkFDRiwyQkFBMkIsRUFBRSxJQUFJLHdCQUFjLENBQUM7b0JBQzVDLFVBQVUsRUFBRTt3QkFDUixJQUFJLHlCQUFlLENBQUM7NEJBQ2hCLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDOzRCQUM5QixTQUFTLEVBQUU7Z0NBQ1AsZUFBZSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxTQUFTLEdBQUcsY0FBYyxHQUFHLG9CQUFvQixHQUFHLGVBQWU7NkJBQ25IO3lCQUNKLENBQUM7cUJBQ0w7aUJBQ0osQ0FBQzthQUNMO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7QUFwSkwsMERBcUpDO0FBcEppQiwyQ0FBbUIsR0FBWSxLQUFLLENBQUM7QUFDckMsZ0NBQVEsR0FBWSxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnQGF3cy1jZGsvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBrZHMgZnJvbSAnQGF3cy1jZGsvYXdzLWtpbmVzaXMnO1xuaW1wb3J0ICogYXMga2RmIGZyb20gJ0Bhd3MtY2RrL2F3cy1raW5lc2lzZmlyZWhvc2UnO1xuaW1wb3J0IHsgS2luZXNpc0V2ZW50U291cmNlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcbmltcG9ydCB7IExvZ0dyb3VwLCBMb2dTdHJlYW0gfSBmcm9tICdAYXdzLWNkay9hd3MtbG9ncyc7XG5pbXBvcnQgeyBQb2xpY3lEb2N1bWVudCwgUG9saWN5U3RhdGVtZW50LCBTZXJ2aWNlUHJpbmNpcGFsLCBSb2xlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgS2luZXNpc1N0cmVhbUZpcmVob3NlUzNQcm9wcyB7XG4gICAgYXBwbGljYXRpb25OYW1lOiBzdHJpbmc7XG4gICAga2luZXNpc1N0cmVhbXNMYW1iZGE6IGxhbWJkYS5GdW5jdGlvblxuICAgIGFjY291bnRJZD86IHN0cmluZyxcbiAgICByZWdpb24/OiBzdHJpbmcsXG4gICAgYnVja2V0RGVzdGluYXRpb25Bcm46IHN0cmluZztcbn1cblxuLyoqXG4gKiBLaW5lc2lzIFN0cmVhbSAtIEtpbmVzaXMgRmlyZWhvc2UgLSBTM1xuICovXG5leHBvcnQgY2xhc3MgS2luZXNpc1N0cmVhbUZpcmVob3NlUzMgZXh0ZW5kcyBjZGsuQ29uc3RydWN0IHtcbiAgICBwdWJsaWMgc3RhdGljIEtJTkVTSVNfSU5URUdSQVRJT046IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwdWJsaWMgc3RhdGljIEZJUkVIT1NFOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgcmVhZG9ubHkga2luZXNpc1N0cmVhbXM6IGtkcy5JU3RyZWFtO1xuICAgIHB1YmxpYyByZWFkb25seSBraW5lc2lzRmlyZWhvc2U6IGtkZi5DZm5EZWxpdmVyeVN0cmVhbTtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlyZWhvc2VMb2dHcm91cDogTG9nR3JvdXA7XG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEtpbmVzaXNTdHJlYW1GaXJlaG9zZVMzUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgICAgICB0aGlzLmtpbmVzaXNTdHJlYW1zID0gbmV3IGtkcy5TdHJlYW0odGhpcywgcHJvcHMuYXBwbGljYXRpb25OYW1lICsgJ0lucHV0U3RyZWFtJywge1xuICAgICAgICAgICAgc3RyZWFtTmFtZTogcHJvcHMuYXBwbGljYXRpb25OYW1lICsgJ19JbnB1dFN0cmVhbScsXG4gICAgICAgICAgICBzaGFyZENvdW50OiAxXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1JU1NJTkcgS0lORVNJUyBJTlRFR1JBVElPTlxuICAgICAgICBpZiAoS2luZXNpc1N0cmVhbUZpcmVob3NlUzMuS0lORVNJU19JTlRFR1JBVElPTikge1xuICAgICAgICAgICAgbmV3IEtpbmVzaXNFdmVudFNvdXJjZSh0aGlzLmtpbmVzaXNTdHJlYW1zLCB7XG4gICAgICAgICAgICAgICAgYmF0Y2hTaXplOiA3MDAsXG4gICAgICAgICAgICAgICAgc3RhcnRpbmdQb3NpdGlvbjogbGFtYmRhLlN0YXJ0aW5nUG9zaXRpb24uTEFURVNUXG4gICAgICAgICAgICB9KS5iaW5kKHByb3BzLmtpbmVzaXNTdHJlYW1zTGFtYmRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1JU1NJTkcgS0lORVNJUyBGSVJFSE9TRVxuICAgICAgICBpZiAoS2luZXNpc1N0cmVhbUZpcmVob3NlUzMuRklSRUhPU0UpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcmVob3NlTmFtZTogc3RyaW5nID0gcHJvcHMuYXBwbGljYXRpb25OYW1lICsgJ19GaXJlaG9zZSc7XG5cbiAgICAgICAgICAgIHRoaXMuZmlyZWhvc2VMb2dHcm91cCA9IHRoaXMuY3JlYXRlTG9nR3JvdXAoZmlyZWhvc2VOYW1lLCBwcm9wcyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGZpcmVob3NlUm9sZTogUm9sZSA9IHRoaXMuYnVpbGRGaXJlaG9zZVJvbGUocHJvcHMsIHRoaXMuZmlyZWhvc2VMb2dHcm91cC5sb2dHcm91cE5hbWUpO1xuXG4gICAgICAgICAgICB0aGlzLmtpbmVzaXNGaXJlaG9zZSA9IG5ldyBrZGYuQ2ZuRGVsaXZlcnlTdHJlYW0odGhpcywgcHJvcHMuYXBwbGljYXRpb25OYW1lICsgJ1Jhd0RhdGEnLCB7XG4gICAgICAgICAgICAgICAgZGVsaXZlcnlTdHJlYW1UeXBlOiAnS2luZXNpc1N0cmVhbUFzU291cmNlJyxcbiAgICAgICAgICAgICAgICBkZWxpdmVyeVN0cmVhbU5hbWU6IGZpcmVob3NlTmFtZSxcbiAgICAgICAgICAgICAgICBraW5lc2lzU3RyZWFtU291cmNlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBraW5lc2lzU3RyZWFtQXJuOiB0aGlzLmtpbmVzaXNTdHJlYW1zLnN0cmVhbUFybixcbiAgICAgICAgICAgICAgICAgICAgcm9sZUFybjogZmlyZWhvc2VSb2xlLnJvbGVBcm5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldEFybjogcHJvcHMuYnVja2V0RGVzdGluYXRpb25Bcm4sXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcmluZ0hpbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbEluU2Vjb25kczogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZUluTUJzOiAxXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbXByZXNzaW9uRm9ybWF0OiAnR1pJUCcsXG4gICAgICAgICAgICAgICAgICAgIHJvbGVBcm46IGZpcmVob3NlUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgICAgICBjbG91ZFdhdGNoTG9nZ2luZ09wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dHcm91cE5hbWU6IHRoaXMuZmlyZWhvc2VMb2dHcm91cC5sb2dHcm91cE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dTdHJlYW1OYW1lOiB0aGlzLmZpcmVob3NlTG9nR3JvdXAubG9nR3JvdXBOYW1lXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5raW5lc2lzRmlyZWhvc2Uubm9kZS5hZGREZXBlbmRlbmN5KHRoaXMuZmlyZWhvc2VMb2dHcm91cCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZUxvZ0dyb3VwKGZpcmVob3NlTmFtZTogc3RyaW5nLCBwcm9wczogS2luZXNpc1N0cmVhbUZpcmVob3NlUzNQcm9wcyk6IExvZ0dyb3VwIHtcbiAgICAgICAgbGV0IGZpcmVob3NlTG9nR3JvdXBOYW1lID0gJy9hd3Mva2luZXNpc2ZpcmVob3NlLycgKyBmaXJlaG9zZU5hbWU7XG5cbiAgICAgICAgY29uc3QgbG9nR3JvdXA6IExvZ0dyb3VwID0gbmV3IExvZ0dyb3VwKHRoaXMsIHByb3BzLmFwcGxpY2F0aW9uTmFtZSArICdmaXJlaG9zZWxvZ2dyb3VwJywge1xuICAgICAgICAgICAgbG9nR3JvdXBOYW1lOiBmaXJlaG9zZUxvZ0dyb3VwTmFtZVxuICAgICAgICB9KTtcbiAgICAgICAgbmV3IExvZ1N0cmVhbSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnZmlyZWhvc2Vsb2dzdHJlYW0nLCB7XG4gICAgICAgICAgICBsb2dHcm91cDogdGhpcy5maXJlaG9zZUxvZ0dyb3VwLFxuICAgICAgICAgICAgbG9nU3RyZWFtTmFtZTogXCJlcnJvclwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBsb2dHcm91cDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGJ1aWxkRmlyZWhvc2VSb2xlKHByb3BzOiBLaW5lc2lzU3RyZWFtRmlyZWhvc2VTM1Byb3BzLCBmaXJlaG9zZUxvZ0dyb3VwTmFtZTogc3RyaW5nKTogUm9sZSB7XG4gICAgICAgIHJldHVybiBuZXcgUm9sZSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnRmlyZWhvc2VUb1N0cmVhbXNSb2xlJywge1xuICAgICAgICAgICAgcm9sZU5hbWU6IHByb3BzLmFwcGxpY2F0aW9uTmFtZSArICdGaXJlaG9zZVRvU3RyZWFtc1JvbGUnLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnZmlyZWhvc2UuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICAnR2x1ZVBlcm1pc3Npb25zJzogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6R2V0VGFibGVWZXJzaW9uc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAnUzNSYXdEYXRhUGVybWlzc2lvbic6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnczM6QWJvcnRNdWx0aXBhcnRVcGxvYWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXRNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BzLmJ1Y2tldERlc3RpbmF0aW9uQXJuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcHMuYnVja2V0RGVzdGluYXRpb25Bcm4gKyAnLyonXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAnRGVmYXVsdEZpcmVob3NlTGFtYmRhJzogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxhbWJkYTpJbnZva2VGdW5jdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxhbWJkYTpHZXRGdW5jdGlvbkNvbmZpZ3VyYXRpb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXJuOmF3czpsYW1iZGE6XCIgKyBwcm9wcy5yZWdpb24gKyBcIjpcIiArIHByb3BzLmFjY291bnRJZCArIFwiOmZ1bmN0aW9uOiVGSVJFSE9TRV9ERUZBVUxUX0ZVTkNUSU9OJTolRklSRUhPU0VfREVGQVVMVF9WRVJTSU9OJVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICdJbnB1dFN0cmVhbVJlYWRQZXJtaXNzaW9ucyc6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2tpbmVzaXM6RGVzY3JpYmVTdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAna2luZXNpczpHZXRTaGFyZEl0ZXJhdG9yJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2tpbmVzaXM6R2V0UmVjb3JkcydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbmVzaXNTdHJlYW1zLnN0cmVhbUFyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAnQ2xvdWRXYXRjaExvZ3NQZXJtaXNzaW9ucyc6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFsnbG9nczpQdXRMb2dFdmVudHMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Fybjphd3M6bG9nczonICsgcHJvcHMucmVnaW9uICsgJzonICsgcHJvcHMuYWNjb3VudElkICsgJzpsb2ctZ3JvdXA6LycgKyBmaXJlaG9zZUxvZ0dyb3VwTmFtZSArICc6bG9nLXN0cmVhbToqJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=