const fs = require('fs-extra')
const chk = require('chalk')
const glob = require('glob')
const path = require('path')
const os = require('os')
const AWS = require('aws-sdk')
const inq = require('inquirer')

const { NO_AWS_CREDENTIALS, AWS_REGIONS } = require('./constants')

const { log, error } = console
const { cyan, whiteBright } = chk

exports.log = {
  p: log,
  e (msg) {
    log(chk.red(`Error - ${msg}`))
  },
  s (msg) {
    log(chk.green(`Success - ${msg}`))
  },
  i (msg) {
    log(chk.magenta(`Info - ${chk.whiteBright(msg)}`))
  },
  m: log.bind(this, '  '),
}

exports.getCfnPropType = (prop) => {
  if (!prop) throw new Error('a cloudformation property type is required')

  const validProps = [
    'conditions',
    'description',
    'mappings',
    'metadata',
    'outputs',
    'parameters',
    'resources',
  ]

  const name = prop.substr(prop.lastIndexOf('/') + 1).split('.')[0].toLowerCase()

  if (validProps.lastIndexOf(name) === -1) {
    throw new Error(`${chk.red('error')}: "${name}" is not a valid CFN top level template property.\n
      Template top level directory must be one of:\n
      conditions/ or conditions.json\n
      description/ or description.json\n
      mappings/ or mappings.json\n
      metadata/ or metadata.json\n
      outputs/ or outputs.json\n
      parameters/ or parameters.json\n
      resources/ or resources.json
    `)
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

exports._reduceTemplateProps = (dir) => {
  return glob.sync(`${dir}/**/*.+(js|json)`).reduce((files, file) => (
    Object.assign(files, require(path.resolve(file)))
  ), {})
}

exports.getTemplateFiles = (name) => {
  const templateDir = `${process.cwd()}/src/${name}`

  if (!fs.existsSync(templateDir)) throw new Error(`${chk.cyan(name)} not found!`)

  const files = glob.sync(`${templateDir}/*`)

  if (!files) throw new Error(`${chk.cyan(name)} has no files in it!`)

  return files
}

exports.getTemplateAsObject = (name) => {
  const templateDir = `${process.cwd()}/src/${name}`

  if (!fs.existsSync(templateDir)) {
    throw new Error(`${chk.cyan(name)} not found!`)
  }
  // iterate over the folder and lint every js / json file
  // to do so, I need to get the relevant path
  // inside, get the TOP level paths.  Only those
  // then we start another loop through each of the top level paths
  // and we import those.
  //
  // so from the build file we're
  const template = { AWSTemplateFormatVersion: '2010-09-09' }

  try {
    glob.sync(`${templateDir}/*`).forEach((dir) => {
      const isDir = fs.lstatSync(dir).isDirectory()
      const cfnProp = exports.getCfnPropType(dir)

      // so no we're just finishing out the loop from the create tpls method
      // where we need to deal with the Description template
      // deal with the description template as directory
      //

      // if it's not a directory and it's not the Descriptoin, we're done, it's a json object of what we need
      if (!isDir && cfnProp !== 'Description') {
        template[cfnProp] = require(path.resolve(dir))

      // other wise if it's not a dir but it is Description then we have the description.json
      } else if (!isDir && cfnProp === 'Description') {
        template[cfnProp] = require(path.resolve(dir)).Description

      // otherwise it's a dir, and it's named Description, we tell them, hey, this is the only one that has to be
      // a fuckin regular json object and can't be a directory
      } else if (isDir && cfnProp === 'Description') {
        throw new Error(`${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)

      // otherwise, it's a whole thing of of related json, so we smash it together
      } else {
        template[cfnProp] = exports._reduceTemplateProps(dir)
      }
    })
  } catch (error) {
    throw error
  }

  // so we have the top level sections, now we need to ensure they're the right type
  // from bulid this is like calling the createTpls... kind of.
  return template
}

exports.validateJSON = (j) => {
  let check

  try {
    check = JSON.parse(j)
    if (check && typeof check === 'object') throw new Error(`${check} is not valid JSON`)
  } catch (error) {
    throw error
  }

  return check
}

exports.checkValidProject = (cmd, action, env, opts) => {
  try {
    if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) throw new Error(`${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  } catch (error) {
    return exports.log.e(error.message)
  }
  return action(env, opts).catch((e) => { error(e) })
}

exports.inquireTemplateName = async (message) => {
  let prompt
  try {
    const templates = glob.sync(`${process.cwd()}/src/*`).map((s) => {
      const p = s.split('/')
      return p[p.length - 1]
    })
    log()
    prompt = await inq.prompt([
      {
        type: 'list',
        name: 'templatename',
        message,
        choices: templates,
      },
    ])
  } catch (error) {
    throw error
  }
  return prompt.templatename
}

exports.checkValidTemplate = (name) => {
  let template
  try {
    template = fs.existsSync(`${process.cwd()}/src/${name}`)
  } catch (error) {
    throw error
  }
  if (!template) throw new Error(`Template ${chk.cyan(name)} does not exist!`)
}

exports.getStackFile = (templateDir) => {
  const stackPath = `${templateDir}/.stacks`
  let stackFile = {}

  const stackFileExists = fs.existsSync(stackPath)

  if (stackFileExists) {
    try {
      stackFile = fs.readJsonSync(stackPath)
    } catch (error) {
      throw error
    }
  }

  return stackFile
}

exports.writeStackFile = (templateDir, stack) => {
  const stackPath = `${templateDir}/.stacks`

  fs.ensureFileSync(stackPath)

  try {
    fs.writeFileSync(stackPath, JSON.stringify(stack, null, 2), 'utf8')
  } catch (error) {
    throw error
  }
}

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
      if (!isNaN(parseFloat(input)) && isFinite(input)) {
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
    let choices
    log()
    this.log.i(`fetching Availability Zones for parameter ${name}...\n`)

    try {
      const zones = await ec2.describeAvailabilityZones().promise()
      choices = zones.AvailabilityZones.map((z) => {
        if (!z.State === 'available') return undefined

        let choice = { name: z.ZoneName, value: z.ZoneName }

        if (type === 'checkbox') choice = this.checkboxDefault(choice, inquiry.default)

        return choice
      })
    } catch (error) {
      throw error
    }

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
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching EC2 Instance IDs for parameter ${name}...\n`)

    try {
      const instances = await ec2.describeInstances().promise()

      choices = instances.Reservations.reduce((sum, reservation) => {
        const instances = reservation.Instances.map((i) => {
          const tagname = i.Tags && i.Tags.filter(t => t.Key === 'Name')[0]
          const subname = tagname ? ` (${tagname.Value})` : ''
          const choice = { name: `${i.InstanceId}${subname}`, value: i.InstanceId }

          if (prevParam && prevParam.indexOf(choice.value) !== -1) choice.checked = true

          return choice
        })
        return sum.concat(instances)
      }, [])
    } catch (error) {
      throw error
    }

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildKeyPairInquiry = (param, name, region, aws, prevParam) => {
  const {
    Description,
  } = param

  const inquiry = {
    type: 'list',
    name,
    message: baseInqMsg(name, Description),
  }

  if (prevParam) inquiry.default = prevParam

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching EC2 Key Pairs for parameter ${name}...\n`)

    try {
      const res = await ec2.describeKeyPairs().promise()

      choices = res.KeyPairs.map(k => k.KeyName)
    } catch (error) {
      throw error
    }

    return choices
  }
  return inquiry
}

exports.buildSecurityGroupInquiry = (param, name, region, aws, property, type, prevParam) => {
  const {
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching EC2 Security Group ${property} for parameter ${name}...\n`)

    try {
      const res = await ec2.describeSecurityGroups().promise()

      choices = res.SecurityGroups.map((sg) => {
        let choice

        if (property === 'GroupId') {
          choice = { name: `${sg[property]} (${sg.GroupName})`, value: sg[property] }
        } else {
          choice = { name: `${sg[property]} (${sg.GroupId})`, value: sg[property] }
        }

        if (type === 'checkbox' && prevParam && prevParam.indexOf(choice.value) !== -1) {
          choice.checked = true
        }

        return choice
      })
    } catch (error) {
      throw error
    }

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  if (type === 'list') inquiry.default = prevParam

  return inquiry
}

exports.buildSubnetInquiry = (param, name, region, aws, type) => {
  const {
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching VPC Subnets for parameter ${name}...\n`)

    try {
      const res = await ec2.describeSubnets().promise()

      choices = res.Subnets.map((s) => {
        const tagname = s.Tags && s.Tags.filter(t => t.Key === 'Name')[0]
        const subname = tagname ? ` (${tagname.Value})` : ''

        return { name: `${s.SubnetId}${subname} | ${s.VpcId}`, value: s.SubnetId }
      })
    } catch (error) {
      throw error
    }

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildVolumeInquiry = (param, name, region, aws, type) => {
  const {
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching EC2 Volume IDs for parameter ${name}...\n`)

    try {
      const res = await ec2.describeVolumes().promise()

      choices = res.Volumes.map(v => v.VolumeId)
    } catch (error) {
      throw error
    }

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildVpcInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const ec2 = new aws.EC2({ region })
    let choices
    log()
    this.log.i(`fetching VPCs for parameter ${name}...\n`)

    try {
      const res = await ec2.describeVpcs().promise()

      choices = res.Vpcs.map((v) => {
        const tagname = v.Tags && v.Tags.filter(t => t.Key === 'Name')[0]
        const subname = tagname ? ` (${tagname.Value})` : ''

        const choice = { name: `${v.VpcId}${subname}`, value: v.VpcId }

        if (prevParam && prevParam.indexOf(choice.value) !== -1) choice.checked = true

        return choice
      })
    } catch (error) {
      throw error
    }

    return choices
  }

  if (type === 'checkbox') inquiry.filter = input => input.join(',')

  return inquiry
}

exports.buildHostedZoneInquiry = (param, name, region, aws, type, prevParam) => {
  const {
    Description,
  } = param

  const inquiry = {
    type,
    name,
    message: baseInqMsg(name, Description),
  }

  inquiry.choices = async () => {
    const r53 = new aws.Route53({ region })
    let choices
    log()
    this.log.i(`fetching EC2 Volume IDs for parameter ${name}...\n`)

    try {
      const res = await r53.listHostedZones().promise()

      choices = res.HostedZones.map((z) => {
        const id = z.Id.split('/')[2]
        const choice = {
          name: `${z.Name} (${id})`,
          value: id, // CFN requires only the number from `/hostedzone/:number`
        }

        if (prevParam && prevParam.indexOf(id) !== -1) choice.checked = true

        return choice
      })
    } catch (error) {
      throw error
    }

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

  // Now we need to match all the different conditions as in the notes

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
      inquiry = this.buildSubnetInquiry(param, name, region, aws, 'list')
      break

    case 'AWS::EC2::Volume::Id':
      inquiry = this.buildVolumeInquiry(param, name, region, aws, 'list')
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
      inquiry = this.buildSubnetInquiry(param, name, region, aws, 'checkbox')
      break

    case 'List<AWS::EC2::Volume::Id>':
      inquiry = this.buildVolumeInquiry(param, name, region, aws, 'checkbox')
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

exports.selectStackParams = async (Parameters, region, aws, prevParams) => {
  const paramNames = Parameters && Object.keys(Parameters)

  if (paramNames && paramNames.length < 1) return false

  const paramInq = []

  paramNames.forEach(name => (
    paramInq.push(exports.buildParamInquiry(Parameters[name], name, region, aws, prevParams && prevParams[name]))
  ))

  try {
    log(chk.bold.whiteBright('Parameter Values to be used for the stack...'))
    const choices = await inq.prompt(paramInq)
    return choices
  } catch (error) {
    throw error
  }
}

exports.selectRegion = async (profile, message) => {
  let region

  try {
    const regions = await inq.prompt([
      {
        type: 'list',
        message,
        choices: AWS_REGIONS,
        name: 'selected',
        default: profile.region || 'us-east-1',
      },
    ])

    region = regions.selected
  } catch (error) {
    throw error
  }

  return region
}

exports.configAWS = (profile) => {
  if (profile) {
    AWS.config.update({
      accessKeyId: profile.aws_access_key_id,
      secretAccessKey: profile.aws_secret_access_key,
      region: profile.region,
    })
  }

  if (!AWS.config.credentials.accessKeyId || !AWS.config.region) {
    log()
    const msg = `${chk.cyan('cfdn validate | deploy | update')} all require AWS Credentials (Access Key Id, Secret Key, Region) to be set.

${chk.white(`Please use ${chk.cyan('cfdn profiles')} to set up credentials OR configure the AWS CLI credentials.`)}

Crednetials setup via the AWS CLI are used otherwise, however you must set a region via ${chk.cyan('export AWS_REGION=region')}
`

    throw new Error(msg)
  }

  return AWS
}

exports.hasAWSCreds = (homedir) => {
  const home = homedir || os.homedir()
  const creds = fs.existsSync(`${home}/.aws/credentials`, 'utf8')
  const config = fs.existsSync(`${home}/.aws/config`, 'utf8')
  if (!creds && !config) return false
  return true
}

exports.getAWSCreds = (homedir) => {
  const home = homedir || os.homedir()
  let creds
  let config

  if (!exports.hasAWSCreds(home)) throw new Error(NO_AWS_CREDENTIALS)

  try {
    creds = fs.readFileSync(`${home}/.aws/credentials`, 'utf8')
    config = fs.readFileSync(`${home}/.aws/config`, 'utf8')
  } catch (error) {
    throw error
  }

  return { creds, config }
}
exports.parseAWSCreds = (file, isConfig) => {
  const data = file.split(/\r?\n/)

  let profile

  const profiles = data.reduce((prev, curr, i) => {
    const line = curr.split(/(^|\s)[;#]/)[0]
    const prof = curr.match(/^\s*\[([^[\]]+)\]\s*$/)

    if (prof) {
      let [, p] = prof

      if (isConfig) p = p.replace(/^profile\s/, '')

      profile = p
    } else if (profile) {
      const val = line.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/)

      if (val) {
        const [, k, v] = val

        prev[profile] = prev[profile] || {}

        prev[profile][k] = v
      }
    }

    return prev
  }, {})

  return profiles
}

exports.mergeAWSCreds = (profiles, regions) => {
  const keys = Object.keys(profiles)

  return keys.reduce((prev, curr) => {
    const full = Object.assign({}, profiles[curr], regions[curr])
    prev[curr] = full
    return prev
  }, {})
}

exports.hasConfiguredCfdn = (homedir) => {
  const home = homedir || os.homedir()
  return fs.existsSync(`${home}/.cfdn/profiles.json`)
}
