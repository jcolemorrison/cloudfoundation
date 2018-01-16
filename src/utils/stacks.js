const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')

const { log } = require('./index')

exports.addTag = async () => {
  try {
    const tagName = await inq.prompt({
      type: 'input',
      message: `Tag name ${chk.gray('(leave blank when done)')}:`,
      name: 'value',
    })

    if (!tagName.value) return false

    const tagValue = await inq.prompt({
      type: 'input',
      message: `Tag value for ${chk.cyan(tagName.value)}:`,
      name: 'value',
    })

    return { Key: tagName.value, Value: tagValue.value }
  } catch (error) {
    throw error
  }
}

exports.addTags = async (tags = [], done) => {
  if (!done) {
    try {
      const tag = await this.addTag()

      if (tag) {
        tags.push(tag)

        await this.addTags(tags, false)
      }
    } catch (error) {
      throw error
    }
  }
  return tags
}

exports.addIamRole = async () => {
  try {
    const role = await inq.prompt({
      type: 'input',
      message: 'ARN of IAM Role to use:',
      name: 'arn',
    })

    return role.arn ? role.arn : false
  } catch (error) {
    throw error
  }
}

exports.createSNSTopic = async (region, aws) => {
  try {
    const topic = await inq.prompt([
      {
        type: 'input',
        message: 'Name of SNS Topic:',
        name: 'name',
        validate: i => (i ? true : 'name required!'),
      },
      {
        type: 'list',
        message: 'Type of Subscription for the topic:',
        choices: [
          'http',
          'https',
          'email',
          'email-json',
          'sms',
          'sqs',
          'application',
          'lambda',
        ],
        name: 'protocol',
      },
      {
        type: 'input',
        message: 'Endpoint for the subscription:',
        name: 'endpoint', // not required, since Subscribe doesn't require it.
      },
    ])

    const sns = new aws.SNS({ region })
    log.p()
    log.i('creating SNS Topic...\n')
    const { TopicArn } = await sns.createTopic({ Name: topic.name }).promise()
    await sns.subscribe({ TopicArn, Protocol: topic.protocol, Endpoint: topic.endpoint }).promise()

    return { TopicArn }
  } catch (error) {
    throw error
  }
}

exports.setStackSNS = async (region, aws) => {
  try {
    let sns = await inq.prompt({
      type: 'list',
      message: 'How would you like to set up SNS for the stack?',
      default: 'existing',
      name: 'type',
      choices: [
        { name: 'Use existing SNS topic ARN', value: 'existing' },
        { name: 'Create new SNS topic', value: 'new' },
      ],
    })

    if (sns.type === 'new') {
      sns = await this.createSNSTopic(region, aws)
    } else {
      sns = await inq.prompt({
        type: 'input',
        message: 'ARN of SNS topic:',
        name: 'TopicArn',
      })
    }

    return sns.TopicArn
  } catch (error) {
    throw error
  }
}

exports.selectAdvancedStackOptions = async (region, aws) => {
  const options = {}
  try {
    let sns = await inq.prompt({
      type: 'confirm',
      message: 'Set up an SNS notifications for this stack?',
      default: false,
      name: 'add',
    })

    if (sns) {
      sns = await this.setStackSNS(region, aws)

      if (sns) options.snsTopicArn = sns
    }

    const termination = await inq.prompt({
      type: 'confirm',
      message: 'Enable termination protection?',
      default: false,
      name: 'enable',
    })

    if (termination.enable) options.terminationProtection = true

    const timeout = await inq.prompt({
      type: 'input',
      message: `Set timeout in minutes before stack creation fails ${chk.gray('leave blank for none')}:`,
      name: 'minutes',
      validate: (i) => {
        if (i) {
          if (!/^([+-]?[1-9]\d*|0)$/.test(i)) return 'Value must be an integer'
        }
        return true
      },
    })

    if (timeout.minutes) options.timeout = parseInt(timeout.minutes, 10)

    const onFailure = await inq.prompt({
      type: 'list',
      message: 'Select an action to take on stack creation failure:',
      choices: [
        { name: 'nothing', value: 'DO_NOTHING' },
        { name: 'rollback', value: 'ROLLBACK' },
        { name: 'delete', value: 'DELETE' },
      ],
      name: 'action',
    })

    options.onFailure = onFailure.action
  } catch (error) {
    throw error
  }

  return options
}

exports.selectStackOptions = async (region, aws, prevOpts) => {
  const options = {}

  try {
    let tags = await inq.prompt({
      type: 'confirm',
      message: 'Would you like to add tags to this stack?',
      default: false,
      name: 'add',
    })

    if (tags.add) {
      tags = await this.addTags()

      if (tags && tags.length) options.tags = tags
      log.p()
    }

    let iamRole = await inq.prompt({
      type: 'confirm',
      message: 'Would you like to use a separate IAM role to create / update this stack?',
      default: false,
      name: 'add',
    })

    if (iamRole.add) {
      iamRole = await this.addIamRole()

      if (iamRole) options.iamRole = iamRole
      log.p()
    }

    let advanced = await inq.prompt({
      type: 'confirm',
      message: 'Would you like to configure advanced options for your stack? i.e. notifications',
      default: false,
      name: 'add',
    })

    if (advanced.add) {
      advanced = await this.selectAdvancedStackOptions(region, aws)

      if (advanced) options.advanced = { ...advanced }
      log.p()
    }

    const capabilityIam = await inq.prompt({
      type: 'confirm',
      message: 'Allow stack to create IAM resources?',
      default: true,
      name: 'add',
    })

    if (capabilityIam.add) options.capabilityIam = true
  } catch (error) {
    throw error
  }

  return options
}

exports.reviewStackInfo = (name, stack, message, action) => {
  const {
    profile,
    region,
    options,
    parameters,
  } = stack
  const opts = options || {}
  const info = []

  // TODO: Account for no parameters && missing parameters

  // Add General info
  const generalInfo = `
${chk.green('General')}
------------------------
Stack Name: ${name}
Profile: ${profile.name}
Region: ${region}
`
  info.push(generalInfo)

  // Add Stack Option Info
  const iamRole = opts.iamRole ? opts.iamRole : 'Profile IAM Permissions'
  const capabilityIam = opts.capabilityIam ? 'true' : 'false'
  const optionsInfo = `
${chk.green('Options')}
------------------------
IamRole: ${iamRole}
Create IAM Resources: ${capabilityIam}
`
  info.push(optionsInfo)

  // Add Tags Info
  if (opts.tags) {
    const tags = opts.tags && opts.tags.reduce((s, t) => {
      s += `${t.Key}, ${t.Value}\n`
      return s
    }, '')

    const tagsInfo = `
${chk.green('Tags (Name, Value)')}
------------------------
${tags}`
    info.push(tagsInfo)
  }

  // Add Advanced Settings Info
  if (opts.advanced && Object.keys(opts.advanced).length) {
    const {
      snsTopicArn,
      terminationProtection,
      timeout,
      onFailure,
    } = opts.advanced || {}

    let advancedInfo = `
${chk.green('Advanced')}
------------------------
`
    if (snsTopicArn) advancedInfo += `SNS Notification Topic ARN: ${snsTopicArn}\n`
    if (terminationProtection) advancedInfo += `Termination Protection Enabled: ${terminationProtection}\n`
    if (timeout) advancedInfo += `Timeout in Minutes: ${timeout}\n`
    if (onFailure) advancedInfo += `On Failure Behavior: ${onFailure}\n`

    info.push(advancedInfo)
  }

  // Add Parameter Info
  const pKeys = Object.keys(parameters)
  const params = pKeys.reduce((s, key) => {
    s += `${key} = ${parameters[key]}\n`
    return s
  }, '')
  const paramInfo = `
${chk.green('Parameters')}
------------------------
${params}`
  info.push(paramInfo)

  log.p(info.join('\n'))

  if (message) log.i(message)
  if (action === 'Update') {
    log.i('Termination Protection, Timeout in Minutes, and On Failure Behavior can only be set on creation of stacks.')
    log.i('Stack Name, Profile, and Region cannot be changed on a stack once deployed.\n')
  }
}

exports.confirmStack = async (templateName, name, stack, message, action) => {
  try {
    this.reviewStackInfo(name, stack, message, action)
    // TODO: if update, we need to tell them that some parameters cannot be updated once a stack is deployed

    const use = await inq.prompt({
      type: 'confirm',
      message: `${action} Stack ${chk.cyan(name)} with the above options?`,
      name: 'stack',
      default: true,
    })

    return use.stack
  } catch (error) {
    throw error
  }
}

exports.createStack = async (template, name, stack, aws) => {
  const { region, options, parameters } = stack
  const cfn = new aws.CloudFormation({ region })
  const opts = { StackName: name, TemplateBody: JSON.stringify(template) }

  if (parameters) {
    opts.Parameters = Object.keys(parameters).map(k => ({ ParameterKey: k, ParameterValue: parameters[k].toString() }))
  }

  if (options) {
    const { tags, iamRole, advanced, capabilityIam } = options

    if (tags) opts.Tags = tags
    if (iamRole) opts.RoleArn = iamRole
    if (capabilityIam) opts.Capabilities = ['CAPABILITY_NAMED_IAM']

    if (advanced) {
      const { snsTopicArn, terminationProtection, timeout, onFailure } = advanced

      if (snsTopicArn) opts.NotificationARNs = [snsTopicArn]
      if (onFailure) opts.OnFailure = onFailure
      if (terminationProtection !== undefined) opts.EnableTerminationProtection = terminationProtection
      if (timeout) opts.TimeoutInMinutes = timeout
    }
  }

  try {
    const { StackId } = await cfn.createStack(opts).promise()

    return StackId
  } catch (error) {
    throw error
  }
}
