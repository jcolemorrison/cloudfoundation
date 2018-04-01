<div align="center">
  <img src="https://s3-us-west-1.amazonaws.com/www.jcolemorrison.com/cloudfoundation/images/cfdn-logo-t.png" width="400" alt="CloudFoundation: The CLI tool for creating, managing, and deploying large CloudFormation templates and projects." />
  <br />
  <div style="border-bottom: 1px solid #eeeeff;" />
  <img src="https://circleci.com/gh/jcolemorrison/cloudfoundation.svg?style=svg" />
  <br />
  <p align="center">The CLI tool for creating, managing, and deploying large CloudFormation templates and projects.</p>
</div>

## Table of Contents

1. [Intro](#intro)
2. [Getting Started](#getting-started)
3. [Quick Start Guide](#quick-start-guide)
4. [Usage](#usage)
    * [init](#cfdn-init)
    * [create](#cfdn-create-template-name)
    * [build](#cfdn-build-template-name)
    * [build-all](#cfdn-build-all)
    * [validate](#cfdn-validate-options-template-name)
    * [deploy](#cfdn-deploy-options-template-name)
    * [describe](#cfdn-describe-options-template-name)
    * [describe-all](#cfdn-describe-all-options-template-name)
    * [delete](#cfdn-delete-options-template-name)
5. [Profiles](#profiles)
    * [add-profile](#cfdn-add-profile-options-profile-name)
    * [update-profile](#cfdn-update-profile-options-profile-name)
    * [remove-profile](#cfdn-remove-profile-options-profile-name)
    * [list-profiles](#cfdn-list-profiles-options)
    * [import-profiles](#cfdn-import-profiles)
6. [Template Directories](#template-directories)
7. [.cfdnrc File](#cfdnrc-file)
8. [Included CloudFormation Templates](#included-cloudformation-templates)
    * [VPC Template Details](#vpc-template-details)
    * [DB Template Details](#db-template-details)
9. [Suggested Template Management Strategy](#suggested-template-management-strategy)
10. [Using JS instead of JSON](#using-js-instead-of-json)
11. [Contributing](#contributing)

## Intro

CloudFoundation is a CLI tool for:

- creating and managing large CloudFormation templates
- splitting templates into more managable pieces
- validating templates for JSON and CloudFormation syntax errors
- deploying templates as stacks to CloudFormation by declaring options in a file or through prompts
- managing AWS credentials used to deploy / manage various templates in various AWS accounts

It should be viewed as the in-between option for those who need to work with CloudFormation but do not want to work in one, long file (plain templates) or learn an entirely new framework and syntax (terraform/troposphere).

## Getting Started

### Requirements

The CloudFoundation CLI requires Node >= v8.9.1.

The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) is not required.  If installed, you can use AWS CLI profiles and credentials with CloudFoundation.

### Installation

```shell
npm install -g cloudfoundation
```

This will make the command `cfdn` available globally.  To ensure that it's installed run:

```shell
cfdn --version
```

### Quick Start Guide

Create a new directory for your project and `cd` into it:

```shell
mkdir project && cd $_
```

To initialize a new project:

```shell
cfdn init
```

This will walk you through a series of questions to scaffold out your project.

To create a new template:

```shell
cfdn create [name of template]
```

To build the template:

```shell
cfdn build [name of template]
```

To setup and deploy a stack from a created template:

```shell
cfdn deploy
```

Note: `deploy` requires set up of [profiles](#profiles)

## Usage

### `cfdn init`

Creates a new CloudFoundation project.  Can only be run in an empty directory.

Running will prompt with questions that will determine how the project is scaffolded:

##### `What is the name of your new project?`

The name of your project.

##### `Would you like a production VPC template included?`

Includes a multi-az VPC template in the project.

##### `Would you like an encrypted, multi-AZ RDS Aurora Database template included?`

Includes an encrypted, multi-az RDS Aurora Database template in the project.

##### `Would you like to set up a Local or Global Profile?`

Add either a [local](#profiles) or [global](#profiles) profile to the project.  Profiles are sets of AWS credentials used to interact with AWS.  Local are available only to the project.  Global can be used with any project.

##### `Which type of profile would you like to add?`

After selecting [local](#profiles) or [global](#profiles), either import existing credentials setup via the AWS CLI, or input a new set.  Profiles imported and added do NOT modify AWS CLI set up credentials and are scoped only to CloudFoundation.

See [Profiles](#profiles) for more information.

#### Project Structure

Running `cfdn init` will create a new project with the following structure (assuming all default templates are included):

```
project
├── README.md
├── package.json
├── .gitignore
├── .cfdnrc
└── src
    └── db
    └── vpc
```

Directories within the `src` folder represent sets of files that will be built down into ONE CloudFormation template.  In a fully initialized project, we have two directories in `src` - the [`db`](#db-template-details) template and the [`vpc`](#vpc-template-details) template.  Each of these [Template Directories](#template-directories) are compiled down into separate templates.

#### Examples

Scaffold a new project:

```
cfdn init
```

### `cfdn create [template name]`

Creates a new template within an existing CloudFoundation project.  Can only be run inside a valid CloudFoundation project.

Optionally accepts a `[template name]`.  If `[template name]` isn't specified via CLI, you'll be prompted for a name.

#### Explanation

This will create a new directory with the default template structure inside of the project's `src` folder:

```
src
└── new-template
    ├── resources
    │   └── index.json
    ├── conditions/
    │   └── index.json
    ├── mappings/
    │   └── index.json
    ├── metadata/
    │   └── index.json
    ├── outputs/
    │   └── index.json
    ├── parameters/
    │   └── index.json
    └── description.json
```

This is the default structure, however the sections of a template directory can be either a single file containing all CloudFormation declarations OR a directory containing any number of sub directories and files with the declarations.

See [Template Directories](#template-directories) for more information.  Also, take a look at the default included [vpc](#vpc-template-details) and [db](#db-template-details) templates to see larger organization implementations.


### `cfdn build [template name]`

Builds down a given template down into two files: `name-of-template.json` and `name-of-template.min.json` in your project's `dist` folder.

### `cfdn build-all`

Builds down ALL templates in `src` into sets of two files: `name-of-template.json` and `name-of-template.min.json` in your project's `dist` folder.

### `cfdn validate [options] [template name]`

Validates a template against both JSON syntax AND CloudFormation.  A valid [profile](#profiles) is required to validate against CloudFormation.

#### Options

##### `-p, --profile <name of profile>`

The AWS or CFDN profile that has the credentials you'd like to use.

### `cfdn deploy [options] [template name]`

Deploys a template to CloudFormation.  A valid [profile](#profiles) is required to deploy templates to CloudFormation.

#### Options

##### `-p, --profile <name of profile>`

The AWS or CFDN profile that has the credentials you'd like to use.

##### `-s, --stackname <name of stack>`

Name of stack to deploy the template as.  If no stack name option is included, you'll be prompted to name the stack.

#### Explanation

When deploying, a series prompts are inquired to gather the following information:

- Parameter values based on definitions in the template's `parameters.json` or `parameters/` directory
- Basic options for the deploy such as stack tags, IAM Roles, and IAM Capabilities
- Advanced options such as setting up SNS Notifications, on failure actions, stack timeouts, and termination protection

Upon successful deploy, if you opt to save your settings, the `.cfdnrc` file is appended with your stack settings for later use.  **The `.cfdnrc` file is `.gitignore`'d by default AND SHOULD NOT be checked in to version control.**

You can also pre-define all options in your stack for a template and then deploy it without going through all of the inquries.  Example:

```json
{
  "project": "cloudfoundation-project",
  "profiles": {
    "local-profile": {
      "aws_access_key_id": "abcd",
      "aws_secret_access_key": "efgh",
      "region": "us-east-1"
    }
  },
  "templates": {
    "new-template": {
      "new-stack": {
        "profile": "local-profile", // global or local profile name for use
        "region": "us-east-1", // region to deploy template to
        "options": {
          "tags": [ // CloudFormation Stack TAgs
            {
              "Key": "Name",
              "Value": "cfdntest"
            }
          ],
          "advanced": {
            "snsTopicArn": "arn:of:sns:topic", // notifications for stack
            "timeout": 10, // stack timeout
            "onFailure": "ROLLBACK", // action to take on failure
            "terminationProtection": true, // enable termination protection
          },
          "iamRole": "arn:of:role", // custom iam role arn to deploy with
          "capabilityIam": true
        },
        "parameters": { // param values used when deploying template
          "ParamOneString": "String Param",
          "ParamSubnetId": "Valid Subnet Id"
        }
      }
    }
  }
}
```

See the [`.cfdnrc` file section](#cfdnrc-file) for more information.

#### Examples

Given the `.cfdnrc` file in the previous example, running the following:

```
cfdn deploy new-template --stackname new-stack
```

A stack named `new-stack` would be deployed to CloudFormation using the `new-template` template and all of the above defined options and parameters.

To deploy a template and select all options via prompts:

```
cfdn deploy
```


### `cfdn update [options] [template name]`

Updates and existing, deployed template on CloudFormation.  A valid [profile](#profiles) is required to update deployed templates on CloudFormation.

#### Options

##### `-p, --profile <name of profile>`

The AWS or CFDN profile that has the credentials you'd like to use.

##### `-s, --stackname <name of stack>`

Name of stack to update. If no stack name option is included, you'll be prompted to choose an existing stack.

#### Explanation

When updating an existing stack created from a template, the values defined in the [`.cfdnrc` file](#cfdnrc-file) for the stack will be prompted for usage.  You can change these values in the file before running the update to have the stack updated to use them.

If you choose to not reuse the values in the `.cfdnrc` file, you'll be given the option to go through the inquiry prompts and select / create new values.

Upon successful upate, the new values that the stack is updated with will be saved ot the `.cfdnrc` file.

#### Examples

Update an existing stack `new-stack` created from template `new-template`:

```
cfdn update -s new-stack new-template
```

Update an existing stack by selecting it via prompts:

```
cfdn update
```

### `cfdn describe [options] [template name]`

Describes a deployed stack.  A valid [profile](#profiles) is required to describe stacks on CloudFormation.

#### Options

##### `-s, --stackname <stack name>`

Name of the stack to describe.  If no stack name option is included, you'll be prompted to choose an existing stack.

##### `-a, --status`

Show status information about the stack

##### `-p, --parameters`

Show parameters information about the stack

##### `-i, --info`

Show advanced information about the stack.

##### `-t, --tags`

Show tags attached to the stack.

##### `-o, --outputs`

Show output information from the stack.

#### Explanation

This fetches stack information from CloudFormation and displays it.  If no options are passed ALL information is returned and displayed.  You can use individual options to see limited information.  For example, to only see the current stack status and tag information:

```
cfdn describe -ai
```

This will propmt you for the template name, the stack of the template and then output only the stack status and tag information.

#### Examples

Describe all information for the stack `new-stack` from template `new-template`

```
cfdn describe -s new-stack new-template
```

Select a stack from a template via prompts and only show parameter and output information:

```
cfdn describe -po
```

### `cfdn describe-all [options] [template name]`

Describe all a stacks created from `[template name]` template for a given profile and region. A valid [profile](#profiles) is required to describe stacks on CloudFormation.

#### Options

##### `-p, --profile <profile name>`

The AWS or CFDN profile with the stacks to describe.

##### `-r, --region <region>`

The AWS region with the stacks to describe.

#### Examples

Describe all deployed stacks for the profile `cloudfoundation` in the region `us-east-1`:

```
cfdn describe-all -p cloudfoundation -r us-east-1
```

### `cfdn delete [options] [template name]`

Delete a deployed stack created from `[template name]`.  A valid [profile](#profiles) is required to delete stacks on CloudFormation.

#### Options

##### `-s, --stackname <stack name>`

Name of the stack to delete.  If no stack name option is included, you'll be prompted to choose an existing stack.

#### Explanation

Deletes a stack deployed to CloudFormation.  This removes the stack and all of its resources from AWS.  It does NOT delete the template but DOES delete the saved stack information in the `.cfdnrc` file.

#### Examples

Delete a stack `new-stack` created from the template `new-template`:

```
cfdn delete -s new-stack new-template
```

## Profiles

Profiles are sets of AWS credentials used to interact with AWS from CloudFoundation.  There are two types:

*Global* - profiles configured to be used with ANY CloudFoundation project on your machine.

*Local* - profiles configured to be used with only the current CloudFoundation project.

There are two ways to add a profile:

*1) Import from AWS Shared Credentials*

If you have the AWS CLI installed, you can pull in profiles to be used with CloudFoundation.  Once imported, they are managed separately so that changes in CFDN do not affect the AWS CLI and vice versa.

*2) Set up a CFDN Profile*

Input AWS Credentials to only be used with CloudFoundation.  Requires a valid [AWS Access Key ID and Secret Access Key](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys).

Profiles are kept either contained to the local project's `.cfdnrc` file or in your global `.cfdn` settings.  For security considerations, the `.cfdnrc` file should never be checked into version control or made public.

##### Using AWS CLI Credentials without CloudFoundation Profiles

Though using AWS CLI Shared Credentials directly with CloudFoundation isn't currently supported for `deploy` and `update`, you can use them to `validate` your templates.  To do so, without configuring a CloudFoundation profile, ensure that your AWS CLI has a default profile set up and make an AWS region available in yoru shell via:

```
export AWS_REGION=us-east-1
```

### `cfdn add-profile [options] [profile name]`

Add a new profile for usage with CFDN.

#### Options

##### `-a, --aws`

Import an AWS profile from the AWS CLI shared credentials.

##### `-c, --cfdn`

Add a standalone (CFDN) profile

##### `-l, --local`

Add the profile only to the current project

##### `-g, --global`

Make the profile available for global usage

_Notes:_

- only one of `--aws` or `--cfdn` can be given
- only one of `--local` or `--global` can be given

#### Examples

Set up a profile by answering prompts:

```
cfdn add-profile
```

Set up a profile named `my-profile` that is imported from AWS and available globally:

```
cfdn add-profile -ag my-profile
```

### `cfdn update-profile [options] [profile name]`

Updates an existing profile.

#### Options

##### `-l, --local`

Update a profile that exists locally

##### `-g, --global`

Update a profile that exists globally

_Note: only one of `--local` or `--global` can be used at a time._

#### Examples

Update a profile by selecting via prompts

```
cfdn update-profile
```

Update a local profile named `my-profile`:

```
cfdn update-profile -l my-profile
```

### `cfdn remove-profile [options] [profile name]`

Removes an existing profile.  Only removes CFDN profiles.  While imported AWS profiles are removed from CFDN, they are NOT removed from the AWS CLI shared credentials.

#### Options

##### `-l, --local`

Update a profile that exists locally

##### `-g, --global`

Update a profile that exists globally

_Note: only one of `--local` or `--global` can be used at a time._

#### Examples

Remove a profile by selecting via prompts

```
cfdn remove-profile
```

Remove a local profile named `my-profile`:

```
cfdn remove-profile -l my-profile
```

### `cfdn list-profiles [options]`

List all configured profiles for CloudFoundation usage

#### Options

##### `-l, --local`

List profiles local to the current project

##### `-g, --global`

List profiles available for global use

#### Examples

List all profiles available for use:

```
cfdn list-profiles
```

### `cfdn import-profiles`

Import all profiles from AWS CLI to be used globslly with CloudFoundation.

_Note: this does not affect credentials set up for the AWS CLI in anyway._

#### Examples

```
cfdn import-profiles
```

---

## Template Directories

Directories within the `src` folder represent sets of files that will be built down into ONE CloudFormation template.  For example, a newly built template via...

```
cfdn create new-template
```

...will create a project structure like so:

```
project
├── README.md
├── package.json
├── .gitignore
├── .cfdnrc
└── src
    ├── db
    ├── vpc
    └── new-template <-- the new template directory
        ├── resources
        │  └── index.json
        ├── conditions
        ├── mappings
        ├── metadata
        ├── outputs
        ├── parameters
        └── description.json
```

A template directory consists of 7 files OR directories each representing a part of the [Cloudformation Template Anatomy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html).  

These can be ONE file or ONE directory.  The file or directory must be named after one of the [Template Sections](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html#w2ab2c17c15b9):

`resources/` or `resources.json`

`conditions/` or `conditions.json`

`description.json` (must be ONE file with one property "Description")

`mappings/` or `mappings.json`

`metadata/` or `metadata.json`

`outputs/` or `outputs.json`

`parameters/` or `parameters.json`

(`AWSTemplateFormatVersion` is set for you and `Transform` is not yet supported.)

If the Template Section is a directory, it can have any number of sub-directories and files **but must have at least ONE `.json` or `.js` file and that file, at bare minimum, must have an empty object `{}`.**

Example of the `resources` template section split into folders:

```
project
└── src
    └── new-template
      └── resources
          └── vpc
              ├── network-acls
              │   └── ...
              ├── route-tables
              │   └── ...
              ├── security-groups
              │   └── ...
              ├── subnets
              │   └── ...
              ├── vpc.json
              ├── nat-gateway.json
              └── internet-gateway.json
```

In the above example, the different CloudFormation resources are split amongst various files.

`vpc.json`:

```json
{
  "VPC": {
    "Type": "AWS::EC2::VPC",
    "Properties":  {
        // ...
    }
  }
}
```

`internet-gateway.json`:

```json
{
  "InternetGateway": {
    "Type": "AWS::EC2::InternetGateway",
    "Properties": {
      // ...
    }
  },
  "InternetGatewayAttachment": {
    "Type": "AWS::EC2::VPCGatewayAttachment",
    "Properties": {
      // ..
    }
  }
}
```

This is the would be the same as keeping all resources in one file or folder.

Example of tempalte resources in one folder and file:

```
project
└── src
    └── new-template
      └── resources
          └── index.json
```

`index.json`:

```json
{
  "VPC": {
    "Type": "AWS::EC2::VPC",
    "Properties":  {
        // ...
    }
  },
  "InternetGateway": {
    "Type": "AWS::EC2::InternetGateway",
    "Properties": {
      // ...
    }
  },
  "InternetGatewayAttachment": {
    "Type": "AWS::EC2::VPCGatewayAttachment",
    "Properties": {
      // ..
    }
  }
}
```

For an indepth example, take a look at the [included templates](#included-cloudformation-templates).

## .cfdnrc file

A `.cfdnrc` file is created for every new CloudFoundation project.  It tracks two things:

1) Profiles imported / created to only be used for the current project

2) Parameter and Options sets for stacks created from templates

It's structure is the following:

```json
{
  "project": "name-of-project",
  "profiles": {
    "nameOfLocalProfile": {
      "aws_access_key_id": "abcd",
      "aws_secret_access_key": "efgh",
      "region": "us-east-1"
    }
  },
  "templates": {
    "newTemplate": {
      "newStack": {
        // .. stack options and parameters
      }
    },
    "vpc": {
      "network": {
        // .. stack created from the included VPC template
      }
    }
  }
}
```

##### `profiles`

Local profiles made available for use in just this project

##### `templates`

Each key represents a template created in the current project (template directories in the `src`).  The value of of a key in the `templates` object represents `stacks` created from that template.

##### `stacks`

Nested under the `templates` keys, `stacks` are all of the options, settings, and parameters for a deployed stack.

#### Example `.cfdnrc`

```json
{
  "project": "cloudfoundation-project",
  "profiles": {
    "local-profile": { // local profile only available for this project
      "aws_access_key_id": "abcd",
      "aws_secret_access_key": "efgh",
      "region": "us-east-1"
    }
  },
  "templates": {
    "new-template": {
      // a stack named `new-stack` deployed from the template `new-template`
      "new-stack": {
        "profile": "local-profile", // global or local profile name for use
        "region": "us-east-1", // region to deploy template to
        "options": {
          "tags": [ // CloudFormation Stack TAgs
            {
              "Key": "Name",
              "Value": "cfdntest"
            }
          ],
          "advanced": {
            "snsTopicArn": "arn:of:sns:topic", // notifications for stack
            "timeout": 10, // stack timeout
            "onFailure": "ROLLBACK", // action to take on failure
            "terminationProtection": true, // enable termination protection
          },
          "iamRole": "arn:of:role", // custom iam role arn to deploy with
          "capabilityIam": true
        },
        "parameters": { // param values used when deploying template
          "ParamOneString": "String Param",
          "ParamSubnetId": "Valid Subnet Id"
        }
      }
    },
    // another template named `other-template`
    "other-template": {
      // a stack named `other-stack` created from the template `other-template`
      "other-stack": {
        "profile": "global-profile", // uses a global profile called `global-profile`
        "region": "us-west-2",
        "options": { // less defined options
          "capabilityIam": true,
        },
        "parameters": { // param values used when deploying template
          "ParamOneString": "String Param",
          "ParamSubnetId": "Valid Subnet Id"
        },
        "stackId": "arn:of:deployed:stack",
      }
    }
  }
}
```

This `.cfdnrc` references two templates - `new-template` and `other-template`:

`new-template` has one stack called `new-stack` that has yet to be deployed.  The stack uses all possible options and a local profile.

`other-template` has one stack called `other-stack`.  The stack has already been deployed, determined by the existence of `stackId`, uses a global profile, and minimal options.


## Included CloudFormation Templates

When running [`cfdn init`](#cfdn-init), you have the option to include two predefined templates:

`vpc` - a multi-az VPC template.

`db` - an encrypted, multi-az RDS Aurora Database.

Both are set up to be used together and both are created with the intention of production usage.  Neither are required to use CloudFoundation or to make your own templates, but are intended to be easily used with other templates.

Regardless of whether or not you plan to use them, take a look at how the templates are structured for [template management](#suggested-template-management-strategy) in your own templates.

### VPC Template Details

The VPC template deploys a production ready VPC into CloudFormation.  It also sets up a Bastion Server to control access into the VPC and a NAT Gateway (optional) to enable internet access for resources located in Private Subnets.

The VPC template does the following:

- multi-az: one private, public, and db subnet per AZ
- works in any region
- includes a bastion server
- structured following the [template management strategy](#suggested-template-management-strategy)
- outputs all needed values to use the VPC in other templates for [cross-stack reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-crossstackref.html)

### DB Template Details

The DB template deploys an encrypted, multi-az RDS Aurora Database to the VPC created from the VPC template.  It includes an optional read-replica and also sets up a variety of CloudWatch dashboards for easy monitoring.

- requires the included VPC template
- includes an optional read-replica (more than one can be configured manually)
- sets up SNS notifications about the db
- creates an entire suite of CloudWatch Alarms and Dashboards for monitoring and alerts
- encrypts all data at rest with AWS KMS
- works with existing DB Snapshots

The last point means that if you have a current RDS Aurora compatible snapshot, you can use that to create this DB instead of creating a new one.


## Suggested Template Management Strategy

Base template **resources** structure and organization on the AWS Console's views.  The optional VPC and DB templates follow this structure.  The VPC template's resources for example:

```
new-template
  └── resources
      └── cloudwatch
      │   └── logs.json
      ├── ec2
      │   ├── files
      │   │   ├── awscli.conf 
      │   │   ├── awslogs.conf 
      │   │   ├── cfn-auto-reloader.conf 
      │   │   ├── cfn-hup.conf 
      │   │   └── user-data.sh 
      │   └── instances
      │       └── bastion.js
      ├── iam
      │   └── roles
      │       └── log-role.json
      └── vpc
          ├── network-acls
          │   ├── nacl-private.json
          │   └── nacl-public.json
          ├── route-tables
          │   ├── route-table-db.json
          │   ├── route-table-private.json
          │   └── route-table-public.json
          ├── security-groups
          │   └── bastion-security-group.js
          ├── subnets
          │   ├── six-azs.json
          │   └── two-three-azx.json
          ├── vpc.json
          ├── nat-gateway.json
          └── internet-gateway.json
```

In the AWS Console, to create a role you would navigate to **IAM** -> **Roles**.  Therefore, in the CloudFormation template, the definition for the `log-role` exists at `iam/roles/`.  Similarly, EC2 instances exist in the console at **EC2** -> **Instances**, therefore the bastion instance in the above template structure is located at `ec2/instances/`.

This type of structure affords te following:

- less thought about where to put resources (just follow the console)
- easy understanding for developers unfamiliar with CloudFormation but familiar with the AWS Console
- pairs the visual of the AWS Console to the Template structure for easy reference

This is purely a suggestion and is NOT enforced.  The only requirement of the CloudFoundation structure is that the immediate directories of a template directory must be one of the 7 CloudFormation template sections.  [More information here](#template-directories).

## Using JS instead of JSON

If a section of your template requires dynamic processing that the CloudFormation JSON Syntax cannot handle, you can also make your resource definitions in JavaScript.  For example, if we have a template structure like so...

```
src
└── my-template
    └── resources
        └── ...
```

... and we want to make an EC2 instance, we can do so with JSON or with JS.

1) JSON

```
src
└── my-template
    └── resources
        └── instance.json
```

In `instance.json`:

```json
{
  "EC2Instance": {
    "Type": "AWS::EC2::Instance",
    // ... other properties
  }
}
```

or

2) JS

```
src
└── my-template
    └── resources
        └── instance.js
```

In `instance.js`:

```js
const fs = require('fs')
const userData = fs.readFileSync(`${__dirname}/../files/user-data.sh`, 'utf-8')

module.exports = {
  "EC2Instance": {
    "Type": "AWS::EC2::Instance",
    // ... other properties
    "Properties": {
      "UserData": { "Fn::Base64": { "Fn::Sub": userData } },
    }
  }
}
```

Both the included [vpc](#vpc-template) and [db](#db-template) templates have examples of using JS to export dynamic resource definitions.

## Parameter Enforcement

## Contributing

- Ensure that test coverage remains at 100%
- Follow style guidelines included in the `.eslintrc` file
- Preference human readability and clarity over terse and clever code style
- Leave commentary in PRs for faster review
