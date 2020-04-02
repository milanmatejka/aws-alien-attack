#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
echo CONFIGURING THE ENVIRONMENT
echo #############################
echo Updating the attached instance
sudo yum update -y
echo --
echo Updating node to the latest version
#node_version=$(nvm ls-remote --lts | grep Latest | tail -1 | grep -o 'v[.0-9]*' | sed 's/\x1b\[[0-9;]*m//g')
#node_version=${node_version:1}
node_version="10.15.3"
nvm install $node_version
nvm alias latest $node_version
nvm alias default latest
nvm use $node_version
echo --
echo Installing Typescript
npm install -g typescript@3.7.2
echo --
echo Installing CDK
npm install -g aws-cdk@1.10.1
echo --
echo Bootstraping CDK
account=$(aws sts get-caller-identity --output text --query 'Account')
region=$(aws configure get region)
cdk bootstrap $account/$region
echo --
echo Installing dependencies
cd cdk
npm install
[[ $(grep "nvm use latest" ~/.bash_profile) ]] || echo nvm use latest >> ~/.bash_profile
## Calling the environment configuration
source ../envname.sh
echo ### DONE