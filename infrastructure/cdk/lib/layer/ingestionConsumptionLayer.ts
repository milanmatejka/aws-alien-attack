// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from '@aws-cdk/core';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack'

import IAM = require('@aws-cdk/aws-iam');
import APIGTW = require('@aws-cdk/aws-apigateway');
import { Table } from '@aws-cdk/aws-dynamodb';
import Lambda = require('@aws-cdk/aws-lambda');

import { KinesisStreamFirehoseS3 } from '../construct/kinesis-stream-firehose-s3';
import { ApiSsmConfig } from '../construct/api-ssm-config';
import { SSM } from './../construct/ssm'

export class IngestionConsumptionLayer extends ResourceAwareConstruct {

    private kinesis: KinesisStreamFirehoseS3;

    private readonly rawbucketarn: string;

    private userpool: string;
    private api: APIGTW.CfnRestApi;

    constructor(parent: Construct, name: string, props: IParameterAwareProps) {
        super(parent, name, props);
        
        // Checking if we want to have the Kinesis Data Streams integration deployed
        if (props && props.getParameter("kinesisintegration")) {
            KinesisStreamFirehoseS3.KINESIS_INTEGRATION = true;
        }
        // Checking if we want to have the Kinesis Firehose depployed
        if (props && props.getParameter("firehose")) {
            KinesisStreamFirehoseS3.FIREHOSE = true;
            this.rawbucketarn = props.getParameter('rawbucketarn')
        }
        
        this.userpool = props.getParameter('userpool');
        this.createKinesis(props);
        this.createAPIGateway(props);
        this.updateUsersRoles(props);
    }

    createKinesis(props: IParameterAwareProps) {
        this.kinesis = new KinesisStreamFirehoseS3(this, props.getApplicationName() + "stream-firehose-s3", {
            applicationName: props.getApplicationName(),
            kinesisStreamsLambda: <Lambda.Function> props.getParameter('lambda.scoreboard'),
            accountId: props.accountId,
            region: props.region,
            bucketDestinationArn: this.rawbucketarn,
        });
    }

    createAPIGateway(props: IParameterAwareProps) {

        let apirole = new IAM.Role(this, props.getApplicationName() + 'APIRole', {
            roleName: props.getApplicationName() + 'API',
            assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com')
        });
        apirole.addToPolicy(
            new IAM.PolicyStatement({
                actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
                resources: ['arn:aws:lambda:' + props.region + ':' + props.accountId + ':function:' + props.getApplicationName() + '*']
            })
        );
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: [
                "ssm:GetParameterHistory",
                "ssm:GetParametersByPath",
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            resources: ['arn:aws:ssm:'.concat(props.region!, ':', props.accountId!, ':parameter/', props.getApplicationName().toLowerCase(), '/*')]
        }));
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: ['dynamodb:GetItem'],
            resources: [
                (<Table>props.getParameter('table.session')).tableArn
                , (<Table>props.getParameter('table.sessiontopx')).tableArn
            ]
        }));
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: ['kinesis:PutRecord', 'kinesis:PutRecords'],
            resources: [this.kinesis.kinesisStreams.streamArn]
        }));
        apirole.addManagedPolicy(IAM.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonAPIGatewayPushToCloudWatchLogs"));

        this.api = new APIGTW.CfnRestApi(this, props.getApplicationName() + "API", {
            name: props.getApplicationName().toLowerCase()
            , description: 'API supporting the application ' + props.getApplicationName()
        });

        new APIGTW.CfnGatewayResponse(this, props.getApplicationName() + 'GTWResponse', {
            restApiId: this.api.ref
            , responseType: 'DEFAULT_4XX'
            , responseParameters: {
                "gatewayresponse.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                "gatewayresponse.header.Access-Control-Allow-Methods": "'*'",
                "gatewayresponse.header.Access-Control-Allow-Origin": "'*'"
            }
            , responseTemplates: {
                "application/json": "{\"message\":$context.error.messageString}"
            }
        }).addDependsOn(this.api);

        let authorizer = new APIGTW.CfnAuthorizer(this, props.getApplicationName() + "Authorizer", {
            name: props.getApplicationName().toLowerCase() + 'Authorizer'
            , restApiId: this.api.ref
            , type: 'COGNITO_USER_POOLS'
            , identitySource: 'method.request.header.Authorization'
            , providerArns: [
                this.userpool
            ]
        });

        let apiModelScoreboardResponse = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelScoreboardResponseModel', {
            contentType: 'application/json'
            , description: 'Scoreboard response model (for /scoreboard/GET)'
            , name: 'ScoreboardResponseModel'
            , restApiId: this.api.ref
            , schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "ScoreboardResponseModel",
                "type": "object",
                "properties": {
                    "Scoreboard": {
                        "type": "array",
                        "items": {
                            "$ref": "#/definitions/GamerScore"
                        }
                    }
                },
                "definitions": {
                    "GamerScore": {
                        "type": "object",
                        "properties": {
                            "Name": { "type": "integer" },
                            "Score": { "type": "integer" },
                            "Level": { "type": "integer" },
                            "Shots": { "type": "integer" },
                            "Nickname": { "type": "string" },
                            "Lives": { "type": "integer" }
                        }
                    }
                }
            }
        });

        let apiModelGetParametersRequest = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelGetParametersRequest', {
            contentType: 'application/json'
            , description: 'Model to request SSM:GetParameters'
            , name: 'GetParametersRequest'
            , restApiId: this.api.ref
            , schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "GetParametersRequest",
                "type": "object",
                "properties": {
                    "names": { "type": "array" }
                }
            }
        });

        //Version 1 of the API
        let v1 = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1", {
            parentId: this.api.attrRootResourceId
            , pathPart: 'v1'
            , restApiId: this.api.ref
        });




        /**
         * SESSION resource /session
         * GET {no parameter} - returns session data from ssm.parameter /ssm/session
         * 
         */
        let session = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1session", {
            parentId: v1.ref
            , pathPart: 'session'
            , restApiId: this.api.ref
        });

        let sessionGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionGET", {
            restApiId: this.api.ref
            , resourceId: session.ref
            , authorizationType: APIGTW.AuthorizationType.COGNITO
            , authorizerId: authorizer.ref
            , httpMethod: 'GET'
            , requestParameters: {
                'method.request.querystring.Name': true
                , 'method.request.header.Authentication': true
            }
            , requestModels: undefined
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter'
                , credentials: apirole.roleArn
                , requestParameters: {
                    'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/session'"
                    , 'integration.request.header.Authentication': 'method.request.header.Authentication'
                }
                , requestTemplates: undefined
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });

        // OPTIONS
        let sessionOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionOPTIONS", {
            restApiId: this.api.ref
            , resourceId: session.ref
            , authorizationType: APIGTW.AuthorizationType.NONE
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': '{\"statusCode\": 200}'
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                        , 'method.response.header.Access-Control-Allow-Methods': false
                        , 'method.response.header.Access-Control-Allow-Headers': false
                    }
                    , responseModels: {
                        "application/json": 'Empty'
                    }
                }
            ]
        });

        /**
         * Websocket resource /websocket
         * GET {no parameter} - returns websocketURL data from ssm.parameter /ssm/websocket
         * 
         */
      let websocketResourceOnRESTAPI = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1websocket", {
            parentId:  v1.ref
          , pathPart: 'websocket'
          , restApiId: this.api.ref
      });

      let websocketGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketGET", {
            restApiId: this.api.ref
          , resourceId: websocketResourceOnRESTAPI.ref
          , authorizationType: APIGTW.AuthorizationType.COGNITO
          , authorizerId: authorizer.ref
          , httpMethod: 'GET'
          , requestParameters: {
                'method.request.querystring.Name': true
              , 'method.request.header.Authentication': true
          }
          , requestModels : undefined
          , integration: {
              passthroughBehavior: 'WHEN_NO_MATCH'
              , integrationHttpMethod: 'POST'
              , type: 'AWS'
              , uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter'
              , credentials: apirole.roleArn
              , requestParameters: {
                    'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/websocket'"
                  , 'integration.request.header.Authentication': 'method.request.header.Authentication'
              }
              , requestTemplates : undefined
              , integrationResponses: [
                  {
                      statusCode: '200'
                      , responseParameters: {
                          'method.response.header.Access-Control-Allow-Origin': "'*'"
                      }
                      , responseTemplates: {
                          'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                      }
                  }]
          }
          , methodResponses: [
              {
                  statusCode: '200'
                  , responseParameters: {
                      'method.response.header.Access-Control-Allow-Origin': false
                  }
                  , responseModels: {
                         'application/json': 'Empty'
                  }
              }
          ]
      });

      // OPTIONS
      let websocketOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketOPTIONS", {
          restApiId: this.api.ref
          , resourceId: websocketResourceOnRESTAPI.ref
          , authorizationType: APIGTW.AuthorizationType.NONE
          , httpMethod: 'OPTIONS'
          , integration: {
              passthroughBehavior: 'WHEN_NO_MATCH'
              , type: 'MOCK'
              , requestTemplates: {
                  'application/json': '{\"statusCode\": 200}'
              }
              , integrationResponses: [
                  {
                      statusCode: '200'
                      , responseParameters: {
                          'method.response.header.Access-Control-Allow-Headers' : "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
                          ,'method.response.header.Access-Control-Allow-Methods' : "'*'"
                          ,'method.response.header.Access-Control-Allow-Origin' : "'*'"
                      }
                  }]
          }
          , methodResponses: [
              {
                  statusCode: '200'
                  , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                      , 'method.response.header.Access-Control-Allow-Methods': false
                      , 'method.response.header.Access-Control-Allow-Headers': false
                  }
                  , responseModels: {
                      "application/json": 'Empty'
                  }
              }
          ]
      });

        // TODO: Rename id to use appplication name?
        const configApis = new ApiSsmConfig(this, props.getApplicationName() + "-api-ssm-config", {
            applicationName: props.getApplicationName(),
            parentVersion: v1,
            api: this.api,
            region: props.region,
            apirole: apirole,
            ssm: props.getParameter('ssm')
        });

        /**
         * ALLOCATE 
         * Resource: /allocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let allocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1allocate", {
            parentId: v1.ref
            , pathPart: 'allocate'
            , restApiId: this.api.ref
        });


        let lambdaAllocate = (<Lambda.Function>props.getParameter('lambda.allocate'));

        // POST
        let allocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocatePOST", {
            restApiId: this.api.ref
            , resourceId: allocate.ref
            , authorizationType: APIGTW.AuthorizationType.COGNITO
            , authorizerId: authorizer.ref
            , httpMethod: 'POST'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , integrationHttpMethod: 'POST'
                , type: 'AWS_PROXY'
                , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + lambdaAllocate.functionArn + '/invocations'
                , credentials: apirole.roleArn
                //  , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.allocate') + '/invocations'
            }
            , methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });

        /* TO BE IMPLEMENTED ON CDK
                lambdaAllocate.addEventSource(
                    new ApiEventSource( 'POST','/v1/allocate',{
                           authorizationType : APIGTW.AuthorizationType.COGNITO
                         , authorizerId : authorizer.ref
                    })
                );
        */

        // OPTIONS
        let allocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocateOPTIONS", {
            restApiId: this.api.ref
            , resourceId: allocate.ref
            , authorizationType: APIGTW.AuthorizationType.NONE
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });


        /**
         * DEALLOCATE 
         * Resource: /deallocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let deallocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1deallocate", {
            parentId: v1.ref
            , pathPart: 'deallocate'
            , restApiId: this.api.ref
        });

        // POST
        let deallocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocatePOST", {
            restApiId: this.api.ref
            , resourceId: deallocate.ref
            , authorizationType: APIGTW.AuthorizationType.COGNITO
            , authorizerId: authorizer.ref
            , httpMethod: 'POST'
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS_PROXY'
                , contentHandling: "CONVERT_TO_TEXT"
                , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.deallocate') + '/invocations'
                , credentials: apirole.roleArn
            }
            , methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });


        // OPTIONS
        let deallocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocateOPTIONS", {
            restApiId: this.api.ref
            , resourceId: deallocate.ref
            , authorizationType: APIGTW.AuthorizationType.NONE
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });



        /**
         * SCOREBOARD 
         * Resource: /deallocate
         * Method: GET
         * Request format: 
         *      querystring: sessionId=<<Session Id>>
         * Response format:
         * {
                "Scoreboard": [
                    {
                    "Score": 7055,
                    "Level": 13,
                    "Shots": 942,
                    "Nickname": "PSC",
                    "Lives": 3
                    }..,
                ]
            }
         */
        let scoreboard = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1scoreboard", {
            parentId: v1.ref
            , pathPart: 'scoreboard'
            , restApiId: this.api.ref
        });

        // POST
        let scoreboardPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardPOST", {
            restApiId: this.api.ref
            , resourceId: scoreboard.ref
            , authorizationType: APIGTW.AuthorizationType.COGNITO
            , authorizerId: authorizer.ref
            , httpMethod: 'GET'
            , requestParameters: {
                'method.request.querystring.sessionId': true
            }
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':dynamodb:action/GetItem'
                , credentials: apirole.roleArn
                , requestParameters: {
                    'integration.request.querystring.sessionId': 'method.request.querystring.sessionId'
                }
                , passthroughBehavior: 'WHEN_NO_TEMPLATES'
                , requestTemplates: {
                    'application/json': `{
                        "TableName" : "`+ (<Table>props.getParameter('table.sessiontopx')).tableName + `",
                        "Key" : {
                            "SessionId" : {
                                "S" : "$input.params('sessionId')"
                            }
                        }
                    }`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            // This is going to be tricky to be generalized
                            'application/json':
                                `#set($scoreboard = $input.path('$.Item.TopX.L'))
                                        { 
                                        "Scoreboard" : [
                                                #foreach($gamerScore in $scoreboard)
                                                        {
                                                            "Score" : $gamerScore.M.Score.N ,
                                                            "Level" : $gamerScore.M.Level.N ,
                                                            "Shots" : $gamerScore.M.Shots.N ,
                                                            "Nickname" : "$gamerScore.M.Nickname.S" ,
                                                            "Lives" : $gamerScore.M.Lives.N
                                                        }#if($foreach.hasNext),#end
                                                
                                                #end
                                            ]
                                        }`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                    , responseModels: {
                        'application/json': apiModelScoreboardResponse.ref
                    }
                }
            ]
        });


        // OPTIONS
        let scoreboardOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardOPTIONS", {
            restApiId: this.api.ref
            , resourceId: scoreboard.ref
            , authorizationType: APIGTW.AuthorizationType.NONE
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });


        /**
         * UPDATESTATUS
         * Resource: /updatestatus
         * Method: POST
         * Request format:
         *  body : {
         *       "Level": 1,
         *       "Lives": 3,
         *       "Nickname": "chicobento",
         *       "Score": 251,
         *       "SessionId": "X181001T215808",
         *       "Shots": 4,
         *       "Timestamp": "2018-10-10T23:57:26.137Z"
         *       }
         */
        let updateStatus = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1updatestatus", {
            parentId: v1.ref
            , pathPart: 'updatestatus'
            , restApiId: this.api.ref
        });

        // POST
        let updatestatusPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updatestatusPOST", {
            restApiId: this.api.ref
            , resourceId: updateStatus.ref
            , authorizationType: APIGTW.AuthorizationType.COGNITO
            , authorizerId: authorizer.ref
            , httpMethod: 'POST'
            , requestParameters: {
                'method.request.header.Authentication': true
            }
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':kinesis:action/PutRecord'
                , credentials: apirole.roleArn
                , passthroughBehavior: 'WHEN_NO_TEMPLATES'
                , requestTemplates: {
                    'application/json':
                        `#set($inputRoot = $input.path('$'))
                        {
                            "Data" : "$util.base64Encode("$input.json('$')")",
                            "PartitionKey" : $input.json('$.SessionId'),
                            "StreamName" : "`+ this.kinesis.kinesisStreams.streamName + `"
                        }`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });


        // OPTIONS
        let updatestatusOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updateStatusOPTIONS", {
            restApiId: this.api.ref
            , resourceId: updateStatus.ref
            , authorizationType: APIGTW.AuthorizationType.NONE
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });


        let deployment = new APIGTW.CfnDeployment(this, props.getApplicationName() + "APIDeployment", {
            restApiId: this.api.ref
            , stageName: 'prod'
            , description: 'Production deployment'
        });
        deployment.addDependsOn(sessionGetMethod);
        deployment.addDependsOn(sessionOptionsMethod);
        deployment.addDependsOn(websocketGetMethod);
        deployment.addDependsOn(websocketOptionsMethod);
        deployment.addDependsOn(configApis.configGetMethod);
        deployment.addDependsOn(configApis.configOptionsMethod);
        deployment.addDependsOn(allocatePostMethod);
        deployment.addDependsOn(allocateOptionsMethod);
        deployment.addDependsOn(deallocatePostMethod);
        deployment.addDependsOn(deallocateOptionsMethod);
        deployment.addDependsOn(scoreboardPostMethod);
        deployment.addDependsOn(scoreboardOptionsMethod);
        deployment.addDependsOn(updatestatusPostMethod);
        deployment.addDependsOn(updatestatusOptionsMethod);

        this.addResource("apigtw.url","https://"+this.api.ref+".execute-api."+props.region+".amazonaws.com/prod/v1/");
    }


    updateUsersRoles(props: IParameterAwareProps) {

        let baseArn = 'arn:aws:apigateway:' + props.region + ':' + props.accountId + ':' + this.api.ref + '/prod/*/';
        let baseExecArn = 'arn:aws:execute-api:' + props.region + ':' + props.accountId + ':' + this.api.ref + '/prod/';
        let playerRole = (<IAM.Role>props.getParameter('security.playersrole'));

        playerRole.addToPolicy(
            new IAM.PolicyStatement({
                actions: ['apigateway:GET'],
                resources: [
                    baseArn + 'config',
                    baseArn + 'session',
                    baseArn + 'scoreboard'
                ]
            })
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement(
                {
                    actions: ['execute-api:Invoke'],
                    resources: [
                        baseExecArn + 'GET/config',
                        baseExecArn + 'GET/session',
                        baseExecArn + 'GET/scoreboard'
                    ]
                })
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement(
                {
                    actions: ['apigateway:POST'],
                    resources: [
                        baseArn + 'updatestatus',
                        baseArn + 'allocate',
                        baseArn + 'deallocate'
                    ]
                })
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement({
                actions: ['execute-api:Invoke'],
                resources: [
                    baseExecArn + 'POST/updatestatus',
                    baseExecArn + 'POST/allocate',
                    baseExecArn + 'POST/deallocate'
                ]
            })
        );

        let managerRole = (<IAM.Role>props.getParameter('security.managersrole'));
        managerRole.addToPolicy(
            new IAM.PolicyStatement({
                actions : [
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:PutItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:GetItem"
                ],
                resources : [ "arn:aws:dynamodb:" + props.region + ":" + props.accountId + ":table/" + props.getApplicationName() + "*" ]

            })
        );
        managerRole.addToPolicy(
            new IAM.PolicyStatement({    
                actions : [
                    "ssm:GetParameters",
                    "ssm:GetParameter",
                    "ssm:DeleteParameters",
                    "ssm:PutParameter",
                    "ssm:DeleteParameter"
                ],
                resources : [
                    "arn:aws:ssm:" + props.region + ":" + props.accountId + ":parameter/" + props.getApplicationName().toLowerCase() + "/*"
                ]
            })
        );
        managerRole.addToPolicy(
            new IAM.PolicyStatement({
                actions : [
                    "kinesis:GetShardIterator",
                    "kinesis:DescribeStream",
                    "kinesis:GetRecords"
                ],
                resources : [ this.kinesis.kinesisStreams.streamArn ]
            })
        );

        managerRole.addToPolicy(
            new IAM.PolicyStatement({
                actions: [ 'apigateway:*' ],
                resources : [ baseArn + '*' ]
            })
        );
    }

}