"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiSsmConfig = void 0;
const cdk = require("@aws-cdk/core");
const api = require("@aws-cdk/aws-apigateway");
class ApiSsmConfig extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /**
         * CONFIG
         * Resource: /config
         * Method: GET
         * Request Parameters : none
         * Response format:
            {
            "Parameters": [
                {
                "Name": "/<app>/clientid",
                "Value": "4tfe5l26kdp59tc4k4v0b688nm"
                },
                {
                "Name": "/<app>/identitypoolid",
                "Value": "<region>:17092df6-7e3a-4893-4d85-c6de33cdfabc"
                },
                {
                "Name": "/<app>>/userpoolid",
                "Value": "<region>_ueLfdaSXi"
                },
                {
                "Name": "/<app>>/userpoolurl",
                "Value": "cognito-idp.<region>>.amazonaws.com/<region>_ueLfdaSXi"
                }
            ]
            }
         */
        this.config = this.createConfig(props);
        // GET
        const apiModelGetParametersRequest = this.createModel(props);
        this.configGetMethod = this.createGetConfigMethod(props, apiModelGetParametersRequest);
        // OPTIONS
        this.configOptionsMethod = this.createOptionConfigMethod(props);
    }
    createConfig(props) {
        return new api.CfnResource(this, props.applicationName + "APIv1config", {
            parentId: props.parentVersion.ref,
            pathPart: 'config',
            restApiId: props.api.ref
        });
    }
    createModel(props) {
        return new api.CfnModel(this, props.applicationName + 'APIModelGetParametersRequest', {
            contentType: 'application/json',
            description: 'Model to request SSM:GetParameters',
            name: 'GetParametersRequest',
            restApiId: props.api.ref,
            schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "GetParametersRequest",
                "type": "object",
                "properties": { "names": { "type": "array" } }
            }
        });
    }
    createParameterUrls(ssm, applicationName) {
        return ssm.listParameters().map(p => '"/' + applicationName.toLowerCase() + '/' + p + '"').join(',');
    }
    createGetConfigMethod(props, apiModelGetParametersRequest) {
        return new api.CfnMethod(this, props.applicationName + "APIv1configGET", {
            restApiId: props.api.ref,
            resourceId: this.config.ref,
            authorizationType: api.AuthorizationType.NONE,
            httpMethod: 'GET',
            requestParameters: {
                'method.request.header.Content-Type': true,
                'method.request.header.X-Amz-Target': true
            },
            requestModels: {
                'application/json': apiModelGetParametersRequest.ref
            },
            integration: {
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':ssm:path//',
                credentials: props.apirole.roleArn,
                requestParameters: {
                    'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
                    'integration.request.header.X-Amz-Target': "'AmazonSSM.GetParameters'"
                },
                requestTemplates: {
                    'application/json': '{"Names" : [' + this.createParameterUrls(props.ssm, props.applicationName) + ']}'
                },
                passthroughBehavior: 'WHEN_NO_TEMPLATES',
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                        responseTemplates: {
                            'application/json': `
                                        #set($inputRoot = $input.path('$'))
                                        {
                                            "Parameters" : [
                                                #foreach($elem in $inputRoot.Parameters)
                                                {
                                                    "Name" : "$elem.Name",
                                                    "Value" :  "$util.escapeJavaScript("$elem.Value").replaceAll("'",'"')"
                                                } 
                                                #if($foreach.hasNext),#end
                                            #end
                                        ]
                                        }`
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: { 'method.response.header.Access-Control-Allow-Origin': true },
                    responseModels: { 'application/json': 'Empty' }
                }
            ]
        });
    }
    createOptionConfigMethod(props) {
        return new api.CfnMethod(this, props.applicationName + "APIv1configOPTIONS", {
            restApiId: props.api.ref,
            resourceId: this.config.ref,
            authorizationType: api.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'when_no_match',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': '{"statusCode": 200}'
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: { 'application/json': 'Empty' }
                }
            ]
        });
    }
}
exports.ApiSsmConfig = ApiSsmConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXNzbS1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktc3NtLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsK0NBQStDO0FBYS9DLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBTzNDLFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7V0EwQkc7UUFFSCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsTUFBTTtRQUNOLE1BQU0sNEJBQTRCLEdBQWlCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDdkYsVUFBVTtRQUNWLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUF3QjtRQUN6QyxPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGVBQWUsR0FBRyxhQUFhLEVBQUU7WUFDcEUsUUFBUSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRztZQUNqQyxRQUFRLEVBQUUsUUFBUTtZQUNsQixTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHO1NBQzNCLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBd0I7UUFDeEMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsOEJBQThC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QUFpQixFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1lBQzdDLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLFdBQVcsRUFBRTtnQkFDVCxtQkFBbUIsRUFBRSxlQUFlO2dCQUNwQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixnQkFBZ0IsRUFBRTtvQkFDZCxrQkFBa0IsRUFBRSxxQkFBcUI7aUJBQzVDO2dCQUNELG9CQUFvQixFQUFFO29CQUNsQjt3QkFDSSxVQUFVLEVBQUUsS0FBSzt3QkFDakIsa0JBQWtCLEVBQUU7NEJBQ2hCLG9EQUFvRCxFQUFFLEtBQUs7NEJBQzNELHFEQUFxRCxFQUFFLEtBQUs7NEJBQzVELHFEQUFxRCxFQUFFLHdFQUF3RTt5QkFDbEk7cUJBQ0o7aUJBQUM7YUFDVDtZQUNELGVBQWUsRUFBRTtnQkFDYjtvQkFDSSxVQUFVLEVBQUUsS0FBSztvQkFDakIsa0JBQWtCLEVBQUU7d0JBQ2hCLG9EQUFvRCxFQUFFLElBQUk7d0JBQzFELHFEQUFxRCxFQUFFLElBQUk7d0JBQzNELHFEQUFxRCxFQUFFLElBQUk7cUJBQzlEO29CQUNELGNBQWMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRTtpQkFDbEQ7YUFDSjtTQUNKLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQXJLRCxvQ0FxS0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0IHsgU1NNIH0gZnJvbSAnLi9zc20nXG5pbXBvcnQgeyBSb2xlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSdcblxuZXhwb3J0IGludGVyZmFjZSBBUElTU01Db25maWdQcm9wcyB7XG4gICAgYXBwbGljYXRpb25OYW1lOiBzdHJpbmcsXG4gICAgcGFyZW50VmVyc2lvbjogYXBpLkNmblJlc291cmNlLFxuICAgIGFwaTogYXBpLkNmblJlc3RBcGksXG4gICAgcmVnaW9uPzogc3RyaW5nLFxuICAgIGFwaXJvbGU6IFJvbGUsXG4gICAgc3NtOiBTU01cbn1cblxuZXhwb3J0IGNsYXNzIEFwaVNzbUNvbmZpZyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuXG4gICAgcHVibGljIHJlYWRvbmx5IGNvbmZpZ0dldE1ldGhvZDogYXBpLkNmbk1ldGhvZDtcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29uZmlnT3B0aW9uc01ldGhvZDogYXBpLkNmbk1ldGhvZDtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBhcGkuQ2ZuUmVzb3VyY2VcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQVBJU1NNQ29uZmlnUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ09ORklHIFxuICAgICAgICAgKiBSZXNvdXJjZTogL2NvbmZpZ1xuICAgICAgICAgKiBNZXRob2Q6IEdFVCBcbiAgICAgICAgICogUmVxdWVzdCBQYXJhbWV0ZXJzIDogbm9uZVxuICAgICAgICAgKiBSZXNwb25zZSBmb3JtYXQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICBcIlBhcmFtZXRlcnNcIjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIk5hbWVcIjogXCIvPGFwcD4vY2xpZW50aWRcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlXCI6IFwiNHRmZTVsMjZrZHA1OXRjNGs0djBiNjg4bm1cIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiTmFtZVwiOiBcIi88YXBwPi9pZGVudGl0eXBvb2xpZFwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWVcIjogXCI8cmVnaW9uPjoxNzA5MmRmNi03ZTNhLTQ4OTMtNGQ4NS1jNmRlMzNjZGZhYmNcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiTmFtZVwiOiBcIi88YXBwPj4vdXNlcnBvb2xpZFwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWVcIjogXCI8cmVnaW9uPl91ZUxmZGFTWGlcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiTmFtZVwiOiBcIi88YXBwPj4vdXNlcnBvb2x1cmxcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlXCI6IFwiY29nbml0by1pZHAuPHJlZ2lvbj4+LmFtYXpvbmF3cy5jb20vPHJlZ2lvbj5fdWVMZmRhU1hpXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgICAqL1xuXG4gICAgICAgIHRoaXMuY29uZmlnID0gdGhpcy5jcmVhdGVDb25maWcocHJvcHMpO1xuICAgICAgICAvLyBHRVRcbiAgICAgICAgY29uc3QgYXBpTW9kZWxHZXRQYXJhbWV0ZXJzUmVxdWVzdDogYXBpLkNmbk1vZGVsID0gdGhpcy5jcmVhdGVNb2RlbChwcm9wcyk7XG4gICAgICAgIHRoaXMuY29uZmlnR2V0TWV0aG9kID0gdGhpcy5jcmVhdGVHZXRDb25maWdNZXRob2QocHJvcHMsIGFwaU1vZGVsR2V0UGFyYW1ldGVyc1JlcXVlc3QpO1xuICAgICAgICAvLyBPUFRJT05TXG4gICAgICAgIHRoaXMuY29uZmlnT3B0aW9uc01ldGhvZCA9IHRoaXMuY3JlYXRlT3B0aW9uQ29uZmlnTWV0aG9kKHByb3BzKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZUNvbmZpZyhwcm9wczogQVBJU1NNQ29uZmlnUHJvcHMpOiBhcGkuQ2ZuUmVzb3VyY2Uge1xuICAgICAgICByZXR1cm4gbmV3IGFwaS5DZm5SZXNvdXJjZSh0aGlzLCBwcm9wcy5hcHBsaWNhdGlvbk5hbWUgKyBcIkFQSXYxY29uZmlnXCIsIHtcbiAgICAgICAgICAgIHBhcmVudElkOiBwcm9wcy5wYXJlbnRWZXJzaW9uLnJlZixcbiAgICAgICAgICAgIHBhdGhQYXJ0OiAnY29uZmlnJyxcbiAgICAgICAgICAgIHJlc3RBcGlJZDogcHJvcHMuYXBpLnJlZlxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZU1vZGVsKHByb3BzOiBBUElTU01Db25maWdQcm9wcyk6IGFwaS5DZm5Nb2RlbCB7XG4gICAgICAgIHJldHVybiBuZXcgYXBpLkNmbk1vZGVsKHRoaXMsIHByb3BzLmFwcGxpY2F0aW9uTmFtZSArICdBUElNb2RlbEdldFBhcmFtZXRlcnNSZXF1ZXN0Jywge1xuICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTW9kZWwgdG8gcmVxdWVzdCBTU006R2V0UGFyYW1ldGVycycsXG4gICAgICAgICAgICBuYW1lOiAnR2V0UGFyYW1ldGVyc1JlcXVlc3QnLFxuICAgICAgICAgICAgcmVzdEFwaUlkOiBwcm9wcy5hcGkucmVmLFxuICAgICAgICAgICAgc2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNC9zY2hlbWEjXCIsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiBcIkdldFBhcmFtZXRlcnNSZXF1ZXN0XCIsXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHsgXCJuYW1lc1wiOiB7IFwidHlwZVwiOiBcImFycmF5XCIgfSB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRlUGFyYW1ldGVyVXJscyhzc206IFNTTSwgYXBwbGljYXRpb25OYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gc3NtLmxpc3RQYXJhbWV0ZXJzKCkubWFwKHAgPT4gJ1wiLycgKyBhcHBsaWNhdGlvbk5hbWUudG9Mb3dlckNhc2UoKSArICcvJyArIHAgKyAnXCInKS5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVHZXRDb25maWdNZXRob2QocHJvcHM6IEFQSVNTTUNvbmZpZ1Byb3BzLCBhcGlNb2RlbEdldFBhcmFtZXRlcnNSZXF1ZXN0OiBhcGkuQ2ZuTW9kZWwpOiBhcGkuQ2ZuTWV0aG9kIHtcbiAgICAgICAgcmV0dXJuIG5ldyBhcGkuQ2ZuTWV0aG9kKHRoaXMsIHByb3BzLmFwcGxpY2F0aW9uTmFtZSArIFwiQVBJdjFjb25maWdHRVRcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiBwcm9wcy5hcGkucmVmLFxuICAgICAgICAgICAgcmVzb3VyY2VJZDogdGhpcy5jb25maWcucmVmLFxuICAgICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaS5BdXRob3JpemF0aW9uVHlwZS5OT05FLFxuICAgICAgICAgICAgaHR0cE1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQ29udGVudC1UeXBlJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLlgtQW16LVRhcmdldCc6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXF1ZXN0TW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlNb2RlbEdldFBhcmFtZXRlcnNSZXF1ZXN0LnJlZlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb25IdHRwTWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgdHlwZTogJ0FXUycsXG4gICAgICAgICAgICAgICAgdXJpOiAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOnNzbTpwYXRoLy8nLFxuICAgICAgICAgICAgICAgIGNyZWRlbnRpYWxzOiBwcm9wcy5hcGlyb2xlLnJvbGVBcm4sXG4gICAgICAgICAgICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2ludGVncmF0aW9uLnJlcXVlc3QuaGVhZGVyLkNvbnRlbnQtVHlwZSc6IFwiJ2FwcGxpY2F0aW9uL3gtYW16LWpzb24tMS4xJ1wiLFxuICAgICAgICAgICAgICAgICAgICAnaW50ZWdyYXRpb24ucmVxdWVzdC5oZWFkZXIuWC1BbXotVGFyZ2V0JzogXCInQW1hem9uU1NNLkdldFBhcmFtZXRlcnMnXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wiTmFtZXNcIiA6IFsnICsgdGhpcy5jcmVhdGVQYXJhbWV0ZXJVcmxzKHByb3BzLnNzbSwgcHJvcHMuYXBwbGljYXRpb25OYW1lKSArICddfSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6ICdXSEVOX05PX1RFTVBMQVRFUycsXG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHsgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjc2V0KCRpbnB1dFJvb3QgPSAkaW5wdXQucGF0aCgnJCcpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYXJhbWV0ZXJzXCIgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjZm9yZWFjaCgkZWxlbSBpbiAkaW5wdXRSb290LlBhcmFtZXRlcnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOYW1lXCIgOiBcIiRlbGVtLk5hbWVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlZhbHVlXCIgOiAgXCIkdXRpbC5lc2NhcGVKYXZhU2NyaXB0KFwiJGVsZW0uVmFsdWVcIikucmVwbGFjZUFsbChcIidcIiwnXCInKVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI2lmKCRmb3JlYWNoLmhhc05leHQpLCNlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI2VuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczogeyAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7ICdhcHBsaWNhdGlvbi9qc29uJzogJ0VtcHR5JyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZU9wdGlvbkNvbmZpZ01ldGhvZChwcm9wczogQVBJU1NNQ29uZmlnUHJvcHMpOiBhcGkuQ2ZuTWV0aG9kIHtcbiAgICAgICAgcmV0dXJuIG5ldyBhcGkuQ2ZuTWV0aG9kKHRoaXMsIHByb3BzLmFwcGxpY2F0aW9uTmFtZSArIFwiQVBJdjFjb25maWdPUFRJT05TXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogcHJvcHMuYXBpLnJlZixcbiAgICAgICAgICAgIHJlc291cmNlSWQ6IHRoaXMuY29uZmlnLnJlZixcbiAgICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdPUFRJT05TJyxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogJ3doZW5fbm9fbWF0Y2gnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdNT0NLJyxcbiAgICAgICAgICAgICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInKidcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24sWC1BbXotRGF0ZSxYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7ICdhcHBsaWNhdGlvbi9qc29uJzogJ0VtcHR5JyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICB9XG59XG4iXX0=