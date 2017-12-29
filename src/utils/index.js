const fs = require('fs-extra')
const chk = require('chalk')
const glob = require('glob')
const path = require('path')
const os = require('os')
const AWS = require('aws-sdk')
const inq = require('inquirer')

const { NO_AWS_CREDENTIALS, AWS_REGIONS } = require('./constants')

const { log } = console
const { cyan } = chk

exports.log = {
  p: log,
  e (msg) {
    log(chk.red(`  Error - ${msg}`))
  },
  s (msg) {
    log(chk.green(`  Success - ${msg}`))
  },
  i (msg) {
    log(chk.magenta(`  Info - ${chk.whiteBright(msg)}`))
  },
  m: log.bind(this, '    '),
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
  return action(env, opts).catch(e => exports.log.p(e))
}

exports.inquireTemplateName = async (action) => {
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
        message: `Which template would you like to ${action}?`,
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

const buildNumberInquiry = (param, name) => {
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
    message: Description,
    default: Default,
  }

  let type = NoEcho ? 'password' : 'input'

  if (AllowedValues) {
    type = 'list'
    inquiry.choices = AllowedValues
  }

  if (type === 'input' || type === 'password') {
    inquiry.validation = (input) => {
      if (!/^-?\d+\.?\d*$/.test(input)) {
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

exports.buildNumberInquiry = buildNumberInquiry

const buildStringInquiry = (param, name) => {
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
    message: Description,
    default: Default,
  }

  let type = NoEcho ? 'password' : 'input'

  if (AllowedValues) {
    type = 'list'
    inquiry.choices = AllowedValues
  }


  if (type === 'input' || type === 'password') {
    inquiry.validation = (input) => {
      if (MaxLength && input.length > parseInt(MaxLength, 10)) {
        return `${name} can be no greater than ${MaxLength}!`
      }

      if (MinLength && input.length > parseInt(MinLength, 10)) {
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

exports.buildStringInquiry = buildStringInquiry

const buildNumberListInquiry = (param, name) => {
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
    message: Description,
    default: Default,
  }

  if (type === 'input') {
    inquiry.validation = (input) => {
      if (!input) return true

      if (input) {
        const r = /^(?:\s*-?\d+(?:\.\d+)?)(?:\s*,\s*-?\d+(?:\.\d+)?)*$/g
        if (!r.test(input)) {
          return ConstraintDescription || `${name} must be a comma separated list of numbers i.e 1,2,3.14,-5`
        }
      }

      return true
    }

    inquiry.filter = input => input.replace(/\s/g, '')
  }

  if (type === 'checkbox') {
    inquiry.choices = AllowedValues
    inquiry.filter = input => input //TODO: test and turn into proper comma separated number list
  }

  return inquiry
}

exports.buildNumberListInquiry = buildNumberListInquiry

exports.buildParamInquiry = (param, name) => {
  let inquiry

  // Now we need to match all the different conditions as in the notes

  switch (param.Type) {
    case 'String':
      inquiry = buildStringInquiry(param, name)
      break

    case 'Number':
      inquiry = buildNumberInquiry(param, name)
      break

    case 'List<number>':
      inquiry = buildNumberListInquiry(param, name)
      break

    case 'CommaDelimitedList':
      break

    case 'AWS::EC2::AvailabilityZone::Name':
      break

    case 'AWS::EC2::Image::Id':
      break

    case 'AWS::EC2::Instance::Id':
      break

    case 'AWS::EC2::KeyPair::KeyName':
      break

    case 'AWS::EC2::SecurityGroup::GroupName':
      break

    case 'AWS::EC2::SecurityGroup::Id':
      break

    case 'AWS::EC2::Subnet::Id':
      break

    case 'AWS::EC2::Volume::Id':
      break

    case 'AWS::EC2::VPC::Id':
      break

    case 'AWS::Route53::HostedZone::Id':
      break

    case 'List<AWS::EC2::AvailabilityZone::Name>':
      break

    case 'List<AWS::EC2::Image::Id>':
      break

    case 'List<AWS::EC2::Instance::Id>':
      break

    case 'List<AWS::EC2::SecurityGroup::GroupName>':
      break

    case 'List<AWS::EC2::SecurityGroup::Id>':
      break

    case 'List<AWS::EC2::Subnet::Id>':
      break

    case 'List<AWS::EC2::Volume::Id>':
      break

    case 'List<AWS::EC2::VPC::Id>':
      break

    case 'List<AWS::Route53::HostedZone::Id>':
      break

    default:
      throw new Error(`Invalid type ${Type}`)
  }
  log(param)
}

exports.selectStackParams = (Parameters, profile, region) => {
  const paramNames = Parameters && Object.keys(Parameters)

  if (paramNames && paramNames.length < 1) return false

  const paramInq = []

  paramNames.forEach(name => {
    return paramInq.push(exports.buildParamInquiry(Parameters[name], name))
  })

  log(paramInq)
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

exports.configAWS = () => {
  let rc
  // TODO: Add parameter to allow for using a profile
  // TODO: Configure to check for the .cfdn directory

  try {
    rc = fs.readFileSync(`${process.cwd()}/.cfdnrc`, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('.cfdnrc file not found!')
    throw error
  }

  // TODO: Grab the damn profile and use it's data here.
  rc = JSON.parse(rc)

  if (rc.AWS_ACCESS_KEY_ID && rc.AWS_SECRET_ACCESS_KEY) {
    AWS.config.update({
      accessKeyId: rc.AWS_ACCESS_KEY_ID,
      secretAccessKey: rc.AWS_SECRET_ACCESS_KEY,
    })
  }

  if (rc.AWS_REGION) {
    AWS.config.update({ region: rc.AWS_REGION })
  } else if (!process.env.AWS_REGION) {
    throw new Error(`${chk.red('error')}: Region required for AWS - Either set ${chk.cyan('AWS_REGION')} in your .cfdnrc file
    OR set the env variable in your shell session i.e. ${chk.cyan('export AWS_REGION=us-east-1')}`)
  }

  if (!AWS.config.credentials.accessKeyId) {
    log()
    const msg = `${chk.cyan('cfdn validate | deploy | update')} all require AWS Credentials to be set.\n\n    ${chk.white(`Please use ${chk.cyan('cfdn profiles')} to set up credentials OR configure the AWS CLI credentials.`)}\n`
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
