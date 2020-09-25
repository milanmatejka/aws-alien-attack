import * as cdk from '@aws-cdk/core';
import * as ssm from '@aws-cdk/aws-ssm';

export interface SSMProps {
}

export interface StringParam {
    id: string;
    name: string;
    value: string;
    description?: string;
}

/**
 * System Manager.
 */
export class SSM extends cdk.Construct {

    private readonly ssmParameters: ssm.StringParameter[] = [];

    constructor(scope: cdk.Construct, id: string, props: SSMProps) {
        super(scope, id);
    }

    public addParameter(param: StringParam): ssm.StringParameter {
        const ssmParam: ssm.StringParameter = this.createParameter(param);
        this.ssmParameters.push(ssmParam);

        return ssmParam;
    }

    private createParameter(param: StringParam): ssm.StringParameter {
        return new ssm.StringParameter(this, param.id, {
            description: param.description || '',
            parameterName: param.name,
            stringValue: param.value,
        });
    }
}
