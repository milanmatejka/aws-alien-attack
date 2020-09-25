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
            const firehoseLogGroupName = this.createLogGroup(firehoseName, props);
            const firehoseRole = this.buildFirehoseRole(props, firehoseLogGroupName);
            this.kinesisFirehose = new kdf.CfnDeliveryStream(this, props.applicationName + 'RawData', {
                deliveryStreamType: 'KinesisStreamAsSource',
                deliveryStreamName: firehoseName,
                kinesisStreamSourceConfiguration: {
                    kinesisStreamArn: this.kinesisStreams.streamArn,
                    roleArn: firehoseRole.roleArn
                },
                s3DestinationConfiguration: {
                    bucketArn: props.rawbucketarn,
                    bufferingHints: {
                        intervalInSeconds: 300,
                        sizeInMBs: 1
                    },
                    compressionFormat: 'GZIP',
                    roleArn: firehoseRole.roleArn,
                    cloudWatchLoggingOptions: {
                        enabled: true,
                        logGroupName: firehoseLogGroupName,
                        logStreamName: firehoseLogGroupName
                    }
                }
            });
            this.kinesisFirehose.node.addDependency(this.firehoseLogGroup);
        }
    }
    createLogGroup(firehoseName, props) {
        let firehoseLogGroupName = '/aws/kinesisfirehose/' + firehoseName;
        this.firehoseLogGroup = new aws_logs_1.LogGroup(this, props.applicationName + 'firehoseloggroup', {
            logGroupName: firehoseLogGroupName
        });
        new aws_logs_1.LogStream(this, props.applicationName + 'firehoselogstream', {
            logGroup: this.firehoseLogGroup,
            logStreamName: "error"
        });
        return firehoseLogGroupName;
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
                                props.rawbucketarn,
                                props.rawbucketarn + '/*'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2luZXNpcy1zdHJlYW0tZmlyZWhvc2UtczMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJraW5lc2lzLXN0cmVhbS1maXJlaG9zZS1zMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsOENBQThDO0FBQzlDLDRDQUE0QztBQUM1QyxvREFBb0Q7QUFDcEQsZ0ZBQXVFO0FBQ3ZFLGdEQUF3RDtBQUN4RCw4Q0FBMkY7QUFVM0Y7O0dBRUc7QUFDSCxNQUFhLHVCQUF3QixTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBU3RELFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBbUM7UUFDN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGVBQWUsR0FBRyxhQUFhLEVBQUU7WUFDOUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsY0FBYztZQUNsRCxVQUFVLEVBQUUsQ0FBQztTQUNoQixDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsSUFBSSx1QkFBdUIsQ0FBQyxtQkFBbUIsRUFBRTtZQUM3QyxJQUFJLDZDQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3hDLFNBQVMsRUFBRSxHQUFHO2dCQUNkLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO2FBQ25ELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDdkM7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLEVBQUU7WUFDbEMsTUFBTSxZQUFZLEdBQVcsS0FBSyxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUM7WUFDakUsTUFBTSxvQkFBb0IsR0FBVyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMs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TyxFQUFFO2dDQUNMLHVCQUF1QjtnQ0FDdkIsaUNBQWlDOzZCQUNwQzs0QkFDRCxTQUFTLEVBQUU7Z0NBQ1AsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsR0FBRyxrRUFBa0U7NkJBQ2hJO3lCQUNKLENBQUM7cUJBQ0w7aUJBQ0osQ0FBQztnQkFDRiw0QkFBNEIsRUFBRSxJQUFJLHdCQUFjLENBQUM7b0JBQzdDLFVBQVUsRUFBRTt3QkFDUixJQUFJLHlCQUFlLENBQUM7NEJBQ2hCLE9BQU8sRUFBRTtnQ0FDTCx3QkFBd0I7Z0NBQ3hCLDBCQUEwQjtnQ0FDMUIsb0JBQW9COzZCQUN2Qjs0QkFDRCxTQUFTLEVBQUU7Z0NBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTOzZCQUNoQzt5QkFDSixDQUFDO3FCQUNMO2lCQUNKLENBQUM7Z0JBQ0YsMkJBQTJCLEVBQUUsSUFBSSx3QkFBYyxDQUFDO29CQUM1QyxVQUFVLEVBQUU7d0JBQ1IsSUFBSSx5QkFBZSxDQUFDOzRCQUNoQixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQzs0QkFDOUIsU0FBUyxFQUFFO2dDQUNQLGVBQWUsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsU0FBUyxHQUFHLGNBQWMsR0FBRyxvQkFBb0IsR0FBRyxlQUFlOzZCQUNuSDt5QkFDSixDQUFDO3FCQUNMO2lCQUNKLENBQUM7YUFDTDtTQUNKLENBQUMsQ0FBQztJQUNQLENBQUM7O0FBbkpMLDBEQW9KQztBQW5KaUIsMkNBQW1CLEdBQVksS0FBSyxDQUFDO0FBQ3JDLGdDQUFRLEdBQVksS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMga2RzIGZyb20gJ0Bhd3MtY2RrL2F3cy1raW5lc2lzJztcbmltcG9ydCAqIGFzIGtkZiBmcm9tICdAYXdzLWNkay9hd3Mta2luZXNpc2ZpcmVob3NlJztcbmltcG9ydCB7IEtpbmVzaXNFdmVudFNvdXJjZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlcyc7XG5pbXBvcnQgeyBMb2dHcm91cCwgTG9nU3RyZWFtIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgUG9saWN5RG9jdW1lbnQsIFBvbGljeVN0YXRlbWVudCwgU2VydmljZVByaW5jaXBhbCwgUm9sZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuXG5leHBvcnQgaW50ZXJmYWNlIEtpbmVzaXNTdHJlYW1GaXJlaG9zZVMzUHJvcHMge1xuICAgIGFwcGxpY2F0aW9uTmFtZTogc3RyaW5nO1xuICAgIGtpbmVzaXNTdHJlYW1zTGFtYmRhOiBsYW1iZGEuRnVuY3Rpb25cbiAgICBhY2NvdW50SWQ/OiBzdHJpbmcsXG4gICAgcmVnaW9uPzogc3RyaW5nLFxuICAgIHJhd2J1Y2tldGFybjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEtpbmVzaXMgU3RyZWFtIC0gS2luZXNpcyBGaXJlaG9zZSAtIFMzXG4gKi9cbmV4cG9ydCBjbGFzcyBLaW5lc2lzU3RyZWFtRmlyZWhvc2VTMyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuICAgIHB1YmxpYyBzdGF0aWMgS0lORVNJU19JTlRFR1JBVElPTjogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHB1YmxpYyBzdGF0aWMgRklSRUhPU0U6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIHB1YmxpYyByZWFkb25seSBraW5lc2lzU3RyZWFtczoga2RzLklTdHJlYW07XG4gICAgcHVibGljIHJlYWRvbmx5IGtpbmVzaXNGaXJlaG9zZToga2RmLkNmbkRlbGl2ZXJ5U3RyZWFtO1xuXG4gICAgcHJpdmF0ZSBmaXJlaG9zZUxvZ0dyb3VwOiBMb2dHcm91cDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogS2luZXNpc1N0cmVhbUZpcmVob3NlUzNQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIHRoaXMua2luZXNpc1N0cmVhbXMgPSBuZXcga2RzLlN0cmVhbSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnSW5wdXRTdHJlYW0nLCB7XG4gICAgICAgICAgICBzdHJlYW1OYW1lOiBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnX0lucHV0U3RyZWFtJyxcbiAgICAgICAgICAgIHNoYXJkQ291bnQ6IDFcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTUlTU0lORyBLSU5FU0lTIElOVEVHUkFUSU9OXG4gICAgICAgIGlmIChLaW5lc2lzU3RyZWFtRmlyZWhvc2VTMy5LSU5FU0lTX0lOVEVHUkFUSU9OKSB7XG4gICAgICAgICAgICBuZXcgS2luZXNpc0V2ZW50U291cmNlKHRoaXMua2luZXNpc1N0cmVhbXMsIHtcbiAgICAgICAgICAgICAgICBiYXRjaFNpemU6IDcwMCxcbiAgICAgICAgICAgICAgICBzdGFydGluZ1Bvc2l0aW9uOiBsYW1iZGEuU3RhcnRpbmdQb3NpdGlvbi5MQVRFU1RcbiAgICAgICAgICAgIH0pLmJpbmQocHJvcHMua2luZXNpc1N0cmVhbXNMYW1iZGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTUlTU0lORyBLSU5FU0lTIEZJUkVIT1NFXG4gICAgICAgIGlmIChLaW5lc2lzU3RyZWFtRmlyZWhvc2VTMy5GSVJFSE9TRSkge1xuICAgICAgICAgICAgY29uc3QgZmlyZWhvc2VOYW1lOiBzdHJpbmcgPSBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnX0ZpcmVob3NlJztcbiAgICAgICAgICAgIGNvbnN0IGZpcmVob3NlTG9nR3JvdXBOYW1lOiBzdHJpbmcgPSB0aGlzLmNyZWF0ZUxvZ0dyb3VwKGZpcmVob3NlTmFtZSwgcHJvcHMpO1xuXG4gICAgICAgICAgICBjb25zdCBmaXJlaG9zZVJvbGU6IFJvbGUgPSB0aGlzLmJ1aWxkRmlyZWhvc2VSb2xlKHByb3BzLCBmaXJlaG9zZUxvZ0dyb3VwTmFtZSk7XG5cbiAgICAgICAgICAgIHRoaXMua2luZXNpc0ZpcmVob3NlID0gbmV3IGtkZi5DZm5EZWxpdmVyeVN0cmVhbSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnUmF3RGF0YScsIHtcbiAgICAgICAgICAgICAgICBkZWxpdmVyeVN0cmVhbVR5cGU6ICdLaW5lc2lzU3RyZWFtQXNTb3VyY2UnLFxuICAgICAgICAgICAgICAgIGRlbGl2ZXJ5U3RyZWFtTmFtZTogZmlyZWhvc2VOYW1lLFxuICAgICAgICAgICAgICAgIGtpbmVzaXNTdHJlYW1Tb3VyY2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmVzaXNTdHJlYW1Bcm46IHRoaXMua2luZXNpc1N0cmVhbXMuc3RyZWFtQXJuLFxuICAgICAgICAgICAgICAgICAgICByb2xlQXJuOiBmaXJlaG9zZVJvbGUucm9sZUFyblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgczNEZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0QXJuOiBwcm9wcy5yYXdidWNrZXRhcm4sXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcmluZ0hpbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbEluU2Vjb25kczogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZUluTUJzOiAxXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbXByZXNzaW9uRm9ybWF0OiAnR1pJUCcsXG4gICAgICAgICAgICAgICAgICAgIHJvbGVBcm46IGZpcmVob3NlUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgICAgICBjbG91ZFdhdGNoTG9nZ2luZ09wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dHcm91cE5hbWU6IGZpcmVob3NlTG9nR3JvdXBOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nU3RyZWFtTmFtZTogZmlyZWhvc2VMb2dHcm91cE5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmtpbmVzaXNGaXJlaG9zZS5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5maXJlaG9zZUxvZ0dyb3VwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRlTG9nR3JvdXAoZmlyZWhvc2VOYW1lOiBzdHJpbmcsIHByb3BzOiBLaW5lc2lzU3RyZWFtRmlyZWhvc2VTM1Byb3BzKTogc3RyaW5nIHtcbiAgICAgICAgbGV0IGZpcmVob3NlTG9nR3JvdXBOYW1lID0gJy9hd3Mva2luZXNpc2ZpcmVob3NlLycgKyBmaXJlaG9zZU5hbWU7XG5cbiAgICAgICAgdGhpcy5maXJlaG9zZUxvZ0dyb3VwID0gbmV3IExvZ0dyb3VwKHRoaXMsIHByb3BzLmFwcGxpY2F0aW9uTmFtZSArICdmaXJlaG9zZWxvZ2dyb3VwJywge1xuICAgICAgICAgICAgbG9nR3JvdXBOYW1lOiBmaXJlaG9zZUxvZ0dyb3VwTmFtZVxuICAgICAgICB9KTtcbiAgICAgICAgbmV3IExvZ1N0cmVhbSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnZmlyZWhvc2Vsb2dzdHJlYW0nLCB7XG4gICAgICAgICAgICBsb2dHcm91cDogdGhpcy5maXJlaG9zZUxvZ0dyb3VwLFxuICAgICAgICAgICAgbG9nU3RyZWFtTmFtZTogXCJlcnJvclwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBmaXJlaG9zZUxvZ0dyb3VwTmFtZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGJ1aWxkRmlyZWhvc2VSb2xlKHByb3BzOiBLaW5lc2lzU3RyZWFtRmlyZWhvc2VTM1Byb3BzLCBmaXJlaG9zZUxvZ0dyb3VwTmFtZTogc3RyaW5nKTogUm9sZSB7XG4gICAgICAgIHJldHVybiBuZXcgUm9sZSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyAnRmlyZWhvc2VUb1N0cmVhbXNSb2xlJywge1xuICAgICAgICAgICAgcm9sZU5hbWU6IHByb3BzLmFwcGxpY2F0aW9uTmFtZSArICdGaXJlaG9zZVRvU3RyZWFtc1JvbGUnLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnZmlyZWhvc2UuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICAnR2x1ZVBlcm1pc3Npb25zJzogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6R2V0VGFibGVWZXJzaW9uc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAnUzNSYXdEYXRhUGVybWlzc2lvbic6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnczM6QWJvcnRNdWx0aXBhcnRVcGxvYWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXRNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BzLnJhd2J1Y2tldGFybixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BzLnJhd2J1Y2tldGFybiArICcvKidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICdEZWZhdWx0RmlyZWhvc2VMYW1iZGEnOiBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibGFtYmRhOkludm9rZUZ1bmN0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibGFtYmRhOkdldEZ1bmN0aW9uQ29uZmlndXJhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhcm46YXdzOmxhbWJkYTpcIiArIHByb3BzLnJlZ2lvbiArIFwiOlwiICsgcHJvcHMuYWNjb3VudElkICsgXCI6ZnVuY3Rpb246JUZJUkVIT1NFX0RFRkFVTFRfRlVOQ1RJT04lOiVGSVJFSE9TRV9ERUZBVUxUX1ZFUlNJT04lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgJ0lucHV0U3RyZWFtUmVhZFBlcm1pc3Npb25zJzogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAna2luZXNpczpEZXNjcmliZVN0cmVhbScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkdldFNoYXJkSXRlcmF0b3InLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAna2luZXNpczpHZXRSZWNvcmRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2luZXNpc1N0cmVhbXMuc3RyZWFtQXJuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICdDbG91ZFdhdGNoTG9nc1Blcm1pc3Npb25zJzogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWydsb2dzOlB1dExvZ0V2ZW50cyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXJuOmF3czpsb2dzOicgKyBwcm9wcy5yZWdpb24gKyAnOicgKyBwcm9wcy5hY2NvdW50SWQgKyAnOmxvZy1ncm91cDovJyArIGZpcmVob3NlTG9nR3JvdXBOYW1lICsgJzpsb2ctc3RyZWFtOionXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==