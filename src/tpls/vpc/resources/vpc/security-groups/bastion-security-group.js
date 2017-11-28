// If you'd like to allow from more than one SSH address, you'll have to:
// 
// a) add more SSH ranges via Parameters and add them here
// or
// b) modify it custom from the console
// 
// This bastion server is the only thing that can SSH into private and db subnets
module.exports = {
  "BastionSecurityGroup": {
    "Type": "AWS::EC2::SecurityGroup",
    "Properties": {
      "GroupDescription": "Security group for Bastion instance",
      "VpcId": { "Ref": "VPC" },
      "Tags": [
        {
          "Key": "Name",
          "Value": "Bastion Instance Security Group"
        },
        {
          "Key": "Owner",
          "Value": { "Ref": "ParamAuthorName" }
        }
      ],
      "SecurityGroupIngress": [
        {
          "IpProtocol":"tcp",
          "FromPort":"22",
          "ToPort":"22",
          "CidrIp": { "Ref": "ParamAllowSSHFromRange" }
        }
      ]
    }
  }
}