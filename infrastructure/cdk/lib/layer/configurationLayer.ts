// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from '@aws-cdk/core';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack'
import { SSM } from '../construct/ssm';

/**
 * Configuration Layer is a construct designed to acquire and store configuration
 * data to be used by the system
 */
export class ConfigurationLayer extends ResourceAwareConstruct {

    public readonly ssm: SSM;

    constructor(parent: Construct, name: string, props: IParameterAwareProps) {
        super(parent, name, props);
        if (props && props.getParameter('ssmParameters')) {

            const appName = props.getApplicationName()
            const baseName = '/' + appName.toLowerCase();

            this.ssm = new SSM(this, props.getApplicationName() + '-ssm', {});

            props.getParameter('ssmParameters').forEach((value: any, key: string) => {

                const ssmParam = this.ssm.addParameter({
                    id: 'SSMParameter' + appName + key,
                    name: baseName + '/' + key.toLowerCase(),
                    value: value
                });

                this.addResource('parameter.' + key, ssmParam);
            });
        }
    }
}
