import * as cdk from '@aws-cdk/core';
import * as api from '@aws-cdk/aws-apigateway';
import { SSM } from './ssm'
import { Role } from '@aws-cdk/aws-iam'

export interface APISSMConfigProps {
    applicationName: string,
    parentVersion: api.CfnResource,
    api: api.CfnRestApi,
    region?: string,
    apirole: Role,
    ssm: SSM
}

export class ApiSsmConfig extends cdk.Construct {

    public readonly configGetMethod: api.CfnMethod;
    public readonly configOptionsMethod: api.CfnMethod;

    private readonly config: api.CfnResource

    constructor(scope: cdk.Construct, id: string, props: APISSMConfigProps) {
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
        const apiModelGetParametersRequest: api.CfnModel = this.createModel(props);
        this.configGetMethod = this.createGetConfigMethod(props, apiModelGetParametersRequest);
        // OPTIONS
        this.configOptionsMethod = this.createOptionConfigMethod(props);
    }

    private createConfig(props: APISSMConfigProps): api.CfnResource {
        return new api.CfnResource(this, props.applicationName + "APIv1config", {
            parentId: props.parentVersion.ref,
            pathPart: 'config',
            restApiId: props.api.ref
        });
    }

    private createModel(props: APISSMConfigProps): api.CfnModel {
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

    private createParameterUrls(ssm: SSM, applicationName: string): string {
        return ssm.listParameters().map(p => '"/' + applicationName.toLowerCase() + '/' + p + '"').join(',');
    }

    private createGetConfigMethod(props: APISSMConfigProps, apiModelGetParametersRequest: api.CfnModel): api.CfnMethod {
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
                    }]
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

    private createOptionConfigMethod(props: APISSMConfigProps): api.CfnMethod {
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
                    }]
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
