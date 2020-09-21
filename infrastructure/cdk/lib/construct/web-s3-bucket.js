"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebS3Bucket = void 0;
const cdk = require("@aws-cdk/core");
const aws_s3_1 = require("@aws-cdk/aws-s3");
const core_1 = require("@aws-cdk/core");
/**
 * S3 bucket for websites.
 */
class WebS3Bucket extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const bucketProperties = {
            bucketName: props.bucketName,
            cors: [
                {
                    allowedHeaders: ["*"],
                    allowedMethods: [
                        aws_s3_1.HttpMethods.GET,
                        aws_s3_1.HttpMethods.PUT,
                        aws_s3_1.HttpMethods.DELETE,
                        aws_s3_1.HttpMethods.POST
                    ],
                    allowedOrigins: ["*"]
                }
            ],
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            removalPolicy: props.removalPolicy || core_1.RemovalPolicy.RETAIN
        };
        this.bucket = new aws_s3_1.Bucket(this, props.bucketName, bucketProperties);
    }
}
exports.WebS3Bucket = WebS3Bucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXMzLWJ1Y2tldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYi1zMy1idWNrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUNBQXFDO0FBQ3JDLDRDQUE0RTtBQUM1RSx3Q0FBOEM7QUFVOUM7O0dBRUc7QUFDSCxNQUFhLFdBQVksU0FBUSxHQUFHLENBQUMsU0FBUztJQUcxQyxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQXVCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxnQkFBZ0IsR0FBZ0I7WUFDbEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLElBQUksRUFBRTtnQkFDRjtvQkFDSSxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRTt3QkFDWixvQkFBVyxDQUFDLEdBQUc7d0JBQ2Ysb0JBQVcsQ0FBQyxHQUFHO3dCQUNmLG9CQUFXLENBQUMsTUFBTTt3QkFDbEIsb0JBQVcsQ0FBQyxJQUFJO3FCQUNuQjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3hCO2FBQ0o7WUFDRCxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLG9CQUFvQixFQUFFLFlBQVk7WUFDbEMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLElBQUksb0JBQWEsQ0FBQyxNQUFNO1NBQzdELENBQUE7UUFFQSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDeEUsQ0FBQztDQUNKO0FBM0JELGtDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IElCdWNrZXQsIEJ1Y2tldCwgQnVja2V0UHJvcHMsIEh0dHBNZXRob2RzIH0gZnJvbSAnQGF3cy1jZGsvYXdzLXMzJztcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBXZWJTM0J1Y2tldFByb3BzIHtcbiAgICAvLyBQaHlzaWNhbCBuYW1lIG9mIHRoZSBidWNrZXRcbiAgICBidWNrZXROYW1lOiBzdHJpbmc7XG4gICAgLy8gUG9saWN5IHRvIGFwcGx5IHdoZW4gYnVja2V0IGlzIHJlbW92ZWQuXG4gICAgLy8gRGVmYXVsdCB2YWx1ZTogUmVtb3ZhbFBvbGljeS5SRVRBSU5cbiAgICByZW1vdmFsUG9saWN5PzogUmVtb3ZhbFBvbGljeVxufVxuXG4vKipcbiAqIFMzIGJ1Y2tldCBmb3Igd2Vic2l0ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJTM0J1Y2tldCBleHRlbmRzIGNkay5Db25zdHJ1Y3R7XG4gICAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogSUJ1Y2tldDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2ViUzNCdWNrZXRQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIGNvbnN0IGJ1Y2tldFByb3BlcnRpZXM6IEJ1Y2tldFByb3BzID0ge1xuICAgICAgICAgICAgYnVja2V0TmFtZTogcHJvcHMuYnVja2V0TmFtZSxcbiAgICAgICAgICAgIGNvcnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICAgICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuUE9TVFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBhbGxvd2VkT3JpZ2luczogW1wiKlwiXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdlcnJvci5odG1sJyxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IHByb3BzLnJlbW92YWxQb2xpY3kgfHwgUmVtb3ZhbFBvbGljeS5SRVRBSU5cbiAgICAgICAgfVxuXG4gICAgICAgICB0aGlzLmJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgcHJvcHMuYnVja2V0TmFtZSwgYnVja2V0UHJvcGVydGllcyk7XG4gICAgfVxufVxuIl19