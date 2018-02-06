const { log } = require('../index.js')
// PARAMETER INQUIRY TYPES

// All params, when passed via CFN SDK, must be a string.
const stringFilter = input => input.toString()

const baseInqMsg = (name, description) => (`${name}${description ? ` - ${description}` : ''}`)

exports.buildNumberInquiry = (param, name, prevParam) => {
  const {
    AllowedValues,
    ConstraintDescription,
    Default,
    Description,
    MaxValue,
    MinValue,
    NoEcho,
  } = param

  const inquiry = {
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
    filter: stringFilter,
  }

  let type = NoEcho ? 'password' : 'input'

  if (AllowedValues) {
    type = 'list'
    inquiry.choices = AllowedValues.map(d => d.toString())
    inquiry.default = inquiry.default && inquiry.default.toString()
  }

  if (NoEcho && prevParam && inquiry.default) inquiry.default = new Array(inquiry.default.length + 1).join('*')

  if (type === 'input' || type === 'password') {
    inquiry.validate = (input) => {
      if (isNaN(parseFloat(input)) && !isFinite(input)) {
        return ConstraintDescription || `${name} must be an integer or float!`
      }

      if (MaxValue && input.length > parseInt(MaxValue, 10)) {
        return `${name} can be no greater than ${MaxValue}!`
      }

      if (MinValue && input.length > parseInt(MinValue, 10)) {
        return `${name} can be no less than ${MinValue}!`
      }

      return true
    }
  }

  inquiry.type = type

  return inquiry
}

exports.buildStringInquiry = (param, name, prevParam) => {
  const {
    AllowedPattern,
    AllowedValues,
    ConstraintDescription,
    Default,
    Description,
    MaxLength,
    MinLength,
    NoEcho,
  } = param

  const inquiry = {
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
    filter: stringFilter,
  }


  let type = NoEcho ? 'password' : 'input'

  if (AllowedValues) {
    type = 'list'
    inquiry.choices = AllowedValues
  }

  // TODO: deal with edge case where NoEcho + List type
  if (NoEcho && prevParam) inquiry.default = `****${prevParam.slice(-4)}`

  if (type === 'input' || type === 'password') {
    inquiry.validate = (input) => {
      if (MaxLength && input.length > parseInt(MaxLength, 10)) {
        return `${name} can be no greater than ${MaxLength}!`
      }

      if (MinLength && input.length < parseInt(MinLength, 10)) {
        return `${name} can be no less than ${MinLength}!`
      }

      if (AllowedPattern) {
        const r = new RegExp(AllowedPattern, 'g')
        if (!r.test(input)) return ConstraintDescription || `${name} must match ${AllowedPattern}`
      }

      return true
    }
  }

  inquiry.type = type

  return inquiry
}

// CFN doesn't respect AllowedValues + Defaults, so while this is nice for CFDN,
// if you ever upload a template with AllowedValues + Defaults on a List<Number>
// you just get an error
// UNUSED:
exports.buildNumberListInquiryWithCheckbox = (param, name, prevParam) => {
  const {
    AllowedValues,
    ConstraintDescription,
    Default,
    Description,
  } = param

  const type = AllowedValues ? 'checkbox' : 'input'

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  if (type === 'input') {
    if (Default) inquiry.default = Default

    inquiry.validate = (input) => {
      if (!input) return true

      const r = /^(?:\s*-?\d+(?:\.\d+)?)(?:\s*,\s*-?\d+(?:\.\d+)?)*$/g
      if (!r.test(input)) {
        return ConstraintDescription || `${name} must be a comma separated list of numbers i.e 1,2,3.14,-5`
      }

      return true
    }

    inquiry.filter = input => input.toString().replace(/\s/g, '')
  }

  if (type === 'checkbox') {
    let defaults

    if (Default) {
      if (!isNaN(parseFloat(Default)) && isFinite(Default)) {
        defaults = [parseFloat(Default)]
      } else {
        defaults = Default && Default.split(',').map(d => parseFloat(d))
      }
    }

    inquiry.choices = AllowedValues.reduce((sum, val) => {
      val = parseFloat(val)
      const result = {
        name: val,
        value: val,
      }
      if (defaults && defaults.indexOf(val) > -1) result.checked = true
      return sum.concat(result)
    }, [])

    inquiry.filter = input => input.join(',')
  }

  return inquiry
}

exports.buildNumberListInquiry = (param, name, prevParam) => {
  const {
    ConstraintDescription,
    Default,
    Description,
  } = param

  const inquiry = {
    type: 'input',
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.validate = (input) => {
    if (!input) return true

    const r = /^(?:\s*-?\d+(?:\.\d+)?)(?:\s*,\s*-?\d+(?:\.\d+)?)*$/g
    if (!r.test(input)) {
      return ConstraintDescription || `${name} must be a comma separated list of numbers i.e 1,2,3.14,-5`
    }

    return true
  }

  inquiry.filter = input => input.toString().replace(/\s/g, '')

  return inquiry
}

// Once again, CFN does not interpret AllowedValues + Defaults on CommaDelimitedList correctly.
// If you specify them both, you'd expect to be able to select from a number of them.
// Instead specifying AllowedValues only allows you to set ONE option as a Default.
// UNUSED
exports.buildCommaListInquiryWithCheckbox = (param, name) => {
  const {
    AllowedValues,
    ConstraintDescription,
    Default,
    Description,
  } = param

  const type = AllowedValues ? 'checkbox' : 'input'

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  if (type === 'input') {
    if (Default) inquiry.default = Default

    inquiry.validate = (input) => {
      if (input) {
        const r = /^(?:[-\w.@]+)(?:,\s*[-\w.@]+)*$/g
        if (!r.test(input)) {
          return ConstraintDescription || `${name} must be a comma delimited list of strings i.e. testA,testB,testC`
        }
      }
      return true
    }

    inquiry.filter = input => input.toString().replace(/\s/g, '')
  }

  if (type === 'checkbox') {
    const defaults = Default && Default.toString().replace(/\s/g, '').split(',')

    inquiry.choices = AllowedValues.reduce((sum, val) => {
      const choice = {
        name: val,
        value: val,
      }

      if (defaults && defaults.indexOf(val) > -1) choice.checked = true

      return sum.concat(choice)
    }, [])

    inquiry.filter = input => input.join(',')
  }

  return inquiry
}

// TODO: Handle weird AllowedValues + Defaults.
// i.e. Fow AllowedValues: ["a", "b", "c"] one might think that a Default: "a,b" would be valid.
// But it's not.  It's because "a,b" is not in that array of AllowedValues.  If AllowedValues was: ["a,b", "c", "d"] ...
// THEN "a,b" would be a valid default
exports.buildCommaListInquiry = (param, name, prevParam) => {
  const {
    ConstraintDescription,
    Default,
    Description,
  } = param

  const inquiry = {
    type: 'input',
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.validate = (input) => {
    if (input) {
      const r = /^(?:[-\w.@]+)(?:,\s*[-\w.@]+)*$/g
      if (!r.test(input)) {
        return ConstraintDescription || `${name} must be a comma delimited list of strings i.e. testA,testB,testC`
      }
    }
    return true
  }

  inquiry.filter = input => input.toString().replace(/\s/g, '')

  return inquiry
}

exports.checkboxDefault = (choice, defaults) => {
  if (defaults && defaults.indexOf(choice.value) > -1) choice.checked = true
  return choice
}

exports.buildAZInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Description,
    Default,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching Availability Zones for parameter ${name}...`, 2)

    const zones = await ec2.describeAvailabilityZones().promise()

    const choices = zones.AvailabilityZones.map((z) => {
      if (!z.State === 'available') return undefined

      let choice = { name: z.ZoneName, value: z.ZoneName }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

// Like CFN - we won't show an entire drop down of these.  Becuase there's so damn many.
// So this winds up being more or less just like a string:
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-specific-parameter-types-supported
// right under "AWS::EC2::Image::Id"
exports.buildImageInquiry = (param, name, prevParam) => {
  const {
    AllowedValues,
    Default,
    Description,
  } = param

  const inquiry = {
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  let type = AllowedValues ? 'list' : 'input'

  if (AllowedValues) {
    type = 'list'
    inquiry.choices = AllowedValues
  }

  if (type === 'input' || type === 'password') {
    inquiry.filter = input => input.trim()
  }

  inquiry.type = type

  return inquiry
}

exports.buildInstanceInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching EC2 Instance IDs for parameter ${name}...`, 2)

    const instances = await ec2.describeInstances().promise()

    const choices = instances.Reservations.reduce((sum, reservation) => {
      const instances = reservation.Instances.map((i) => {
        const tagname = i.Tags && i.Tags.filter(t => t.Key === 'Name')[0]
        const subname = tagname ? ` (${tagname.Value})` : ''
        let choice = { name: `${i.InstanceId}${subname}`, value: i.InstanceId }

        if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

        return choice
      })
      return sum.concat(instances)
    }, [])

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildKeyPairInquiry = (param, name, region, aws, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type: 'list',
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching EC2 Key Pairs for parameter ${name}...`, 2)

    const res = await ec2.describeKeyPairs().promise()

    const choices = res.KeyPairs.map(k => k.KeyName)

    return choices
  }
  return inquiry
}

exports.buildSecurityGroupInquiry = (param, name, region, aws, property, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching EC2 Security Group ${property} for parameter ${name}...`, 2)

    const res = await ec2.describeSecurityGroups().promise()

    const choices = res.SecurityGroups.map((sg) => {
      let choice

      if (property === 'GroupId') {
        choice = { name: `${sg[property]} (${sg.GroupName})`, value: sg[property] }
      } else {
        choice = { name: `${sg[property]} (${sg.GroupId})`, value: sg[property] }
      }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

// TODO: Allow for Allowed Values
exports.buildSubnetInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching VPC Subnets for parameter ${name}...`, 2)

    const res = await ec2.describeSubnets().promise()

    const choices = res.Subnets.map((s) => {
      const tagname = s.Tags && s.Tags.filter(t => t.Key === 'Name')[0]
      const subname = tagname ? ` (${tagname.Value})` : ''
      let choice = { name: `${s.SubnetId}${subname} | ${s.VpcId}`, value: s.SubnetId }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildVolumeInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching EC2 Volume IDs for parameter ${name}...`, 2)

    const res = await ec2.describeVolumes().promise()

    const choices = res.Volumes.map((v) => {
      const tagname = v.Tags && v.Tags.filter(t => t.Key === 'Name')[0]
      const subname = tagname ? ` (${tagname.Value})` : ''
      let choice = { name: `${v.VolumeId}${subname}`, value: v.VolumeId }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildVpcInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })

    log.i(`fetching VPCs for parameter ${name}...`, 2)

    const res = await ec2.describeVpcs().promise()

    const choices = res.Vpcs.map((v) => {
      const tagname = v.Tags && v.Tags.filter(t => t.Key === 'Name')[0]
      const subname = tagname ? ` (${tagname.Value})` : ''

      let choice = { name: `${v.VpcId}${subname}`, value: v.VpcId }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildHostedZoneInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Default,
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
    default: prevParam || Default,
  }

  inquiry.choices = async () => {
    const r53 = new aws.Route53({ region })

    log.i(`fetching EC2 Volume IDs for parameter ${name}...`, 2)

    const res = await r53.listHostedZones().promise()

    const choices = res.HostedZones.map((z) => {
      const id = z.Id.split('/')[2]
      let choice = {
        name: `${z.Name} (${id})`,
        value: id, // CFN requires only the number from `/hostedzone/:number`
      }

      if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

      return choice
    })

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}


// Accepts an Object in the form of an AWS CFN Parameter i.e.
/*
{
  "ParamDatabaseInstanceType": {
    "Type": "String",
    "Description": "Instance type to be used for the DB instance",
    "Default": "db.r3.large",
    "AllowedValues": [
      "db.t2.small",
      "db.t2.medium",
      "db.r3.large",
      "db.r3.xlarge",
      "db.r3.2xlarge",
      "db.r3.4xlarge",
      "db.r3.8xlarge"
    ]
  },
}
*/
// Requires the name of the param, the region of the stack, and a configured AWS sdk
exports.buildParamInquiry = (param, name, region, aws, prevParam) => {
  let inquiry

  switch (param.Type) {
    case 'String':
      inquiry = this.buildStringInquiry(param, name, prevParam)
      break

    case 'Number':
      inquiry = this.buildNumberInquiry(param, name, prevParam)
      break

    case 'List<Number>':
      inquiry = this.buildNumberListInquiry(param, name, prevParam)
      break

    case 'CommaDelimitedList':
      inquiry = this.buildCommaListInquiry(param, name, prevParam)
      break

    case 'AWS::EC2::AvailabilityZone::Name':
      inquiry = this.buildAZInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'AWS::EC2::Image::Id':
      inquiry = this.buildImageInquiry(param, name, prevParam)
      break

    case 'AWS::EC2::Instance::Id':
      inquiry = this.buildInstanceInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'AWS::EC2::KeyPair::KeyName':
      inquiry = this.buildKeyPairInquiry(param, name, region, aws, prevParam)
      break

    case 'AWS::EC2::SecurityGroup::GroupName':
      inquiry = this.buildSecurityGroupInquiry(param, name, region, aws, 'GroupName', 'list', prevParam)
      break

    case 'AWS::EC2::SecurityGroup::Id':
      inquiry = this.buildSecurityGroupInquiry(param, name, region, aws, 'GroupId', 'list', prevParam)
      break

    case 'AWS::EC2::Subnet::Id':
      inquiry = this.buildSubnetInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'AWS::EC2::Volume::Id':
      inquiry = this.buildVolumeInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'AWS::EC2::VPC::Id':
      inquiry = this.buildVpcInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'AWS::Route53::HostedZone::Id':
      inquiry = this.buildHostedZoneInquiry(param, name, region, aws, 'list', prevParam)
      break

    case 'List<AWS::EC2::AvailabilityZone::Name>':
      inquiry = this.buildAZInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    // Needs to be the same as comma delimited list, since the CFN console also doesn't show all images
    case 'List<AWS::EC2::Image::Id>':
      inquiry = this.buildCommaListInquiry(param, name, prevParam)
      break

    case 'List<AWS::EC2::Instance::Id>':
      inquiry = this.buildInstanceInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    case 'List<AWS::EC2::SecurityGroup::GroupName>':
      inquiry = this.buildSecurityGroupInquiry(param, name, region, aws, 'GroupName', 'checkbox', prevParam)
      break

    case 'List<AWS::EC2::SecurityGroup::Id>':
      inquiry = this.buildSecurityGroupInquiry(param, name, region, aws, 'GroupId', 'checkbox', prevParam)
      break

    case 'List<AWS::EC2::Subnet::Id>':
      inquiry = this.buildSubnetInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    case 'List<AWS::EC2::Volume::Id>':
      inquiry = this.buildVolumeInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    case 'List<AWS::EC2::VPC::Id>':
      inquiry = this.buildVpcInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    case 'List<AWS::Route53::HostedZone::Id>':
      inquiry = this.buildHostedZoneInquiry(param, name, region, aws, 'checkbox', prevParam)
      break

    default:
      throw new Error(`Invalid type ${param.Type}`)
  }

  return inquiry
}
