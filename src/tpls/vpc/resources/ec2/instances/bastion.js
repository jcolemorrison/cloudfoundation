const fs = require('fs')

const userData = fs.readFileSync(`${__dirname}/../files/user-data.sh`, 'utf-8')
const awscliConf = fs.readFileSync(`${__dirname}/../files/awscli.conf`, 'utf-8')
const awslogsConf = fs.readFileSync(`${__dirname}/../files/awslogs.conf`, 'utf-8')
const cfnHupConf = fs.readFileSync(`${__dirname}/../files/cfn-hup.conf`, 'utf-8')
const cfnAutoReloaderConf = fs.readFileSync(`${__dirname}/../files/cfn-auto-reloader.conf`, 'utf-8')

// If you wanted your bastion to have access to, for example, the mysql client,
// you'd add it to the "packages" list.  Right now it only pulls in the
// most recent version of awslogs.
// If you update the CloudFormation init, the instance will update itself.  Without
// the usage of cfn-hup, updating the init will do nothing.
module.exports = {
  "BastionInstanceProfile": {
    "Type":"AWS::IAM::InstanceProfile",
    "Properties": {
      "Roles": [
        {
          "Ref": "Ec2LogRole"
        }
      ]
    }
  },
  "BastionInstance": {
    "Type": "AWS::EC2::Instance",
    "Metadata": {
      "AWS::CloudFormation::Init": {
        "configSets": {
          "default": ["tools", "autoupdate"]
        },
        "tools": {
          "packages": {
            "yum": {
              "awslogs": [],
              "mysql": []
            }
          },
          "files": {
            "/etc/awslogs/awscli.conf": {
              "content": {
                "Fn::Sub": awscliConf
              },
              "mode": "000644",
              "owner": "root",
              "group": "root"
            },
            "/etc/awslogs/awslogs.conf": {
              "content": {
                "Fn::Sub": awslogsConf
              },
              "mode": "000644",
              "owner": "root",
              "group": "root"
            }
          },
          "services": {
            "sysvinit": {
              "awslogs": {
                "enabled": true,
                "ensureRunning": true,
                "files": [
                  "/etc/awslogs/awscli.conf",
                  "/etc/awslogs/awslogs.conf"
                ],
                "packages": {
                  "yum": ["awslogs"]
                }
              }
            }
          }
        },
        "autoupdate": {
          "files": {
            "/etc/cfn/cfn-hup.conf": {
              "content": {
                "Fn::Sub": cfnHupConf
              },
              "mode": "000400",
              "owner": "root",
              "group": "root"
            },
            "/etc/cfn/hooks.d/cfn-auto-reloader.conf": {
              "content": {
                "Fn::Sub": cfnAutoReloaderConf
              }
            }
          },
          "services": {
            "sysvinit": {
              "cfn-hup": {
                "enabled": true,
                "ensureRunning": true,
                "files": [
                  "/etc/cfn/cfn-hup.conf",
                  "/etc/cfn/hooks.d/cfn-auto-reloader.conf"
                ]
              }
            }
          }
        }
      }
    },
    "Properties": {
      "ImageId": {
        "Fn::FindInMap": [
          "MapBastionAMI",
          {
            "Ref": "AWS::Region"
          },
          "ID"
        ]
      },
      "InstanceType": { "Ref": "ParamBastionInstanceType" },
      "KeyName": { "Ref": "ParamBastionKeyPair" },
      "SubnetId": { "Ref": "PublicSubnetA" },
      "SecurityGroupIds": [
        { "Ref": "BastionSecurityGroup" }
      ],
      "UserData": { "Fn::Base64": { "Fn::Sub": userData } },
      "IamInstanceProfile": { "Ref": "BastionInstanceProfile" },
      "Tags": [
        {
          "Key": "Name",
          "Value": {
            "Fn::Sub": "${AWS::StackName}-bastion"
          }
        },
        {
          "Key": "Owner",
          "Value": { "Ref": "ParamAuthorName" }
        }
      ]
    }
  }
}