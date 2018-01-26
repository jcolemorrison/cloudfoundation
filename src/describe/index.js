const chk = require('chalk')
const inq = require('inquirer')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getStackFile,
  configAWS,
} = require('../utils')

const { selectStackName, displayStack } = require('../utils/stacks')
const { _getProfile } = require('../profiles')

exports.describeAll = async function describeAll (env, opts) {
  const cwd = process.cwd()
  let templateName = env && checkValidTemplate(env)
  let profile = opts && opts.profile

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to update?')

  const templateDir = `${cwd}/src/${templateName}`
  const stackFile = getStackFile(templateDir)
  const stacks = Object.entries(stackFile)

  const validProfiles = stacks
    .reduce((list, [, stack]) => {
      if (!list.find(p => p.name === stack.profile.name)) list.push({ ...stack.profile, value: stack.profile })
      return list
    }, [])
  
  if (profile && !validProfiles.find(p => p.name === profile)) {
    throw new Error(`${chk.cyan(profile)} is not used for any of ${chk.cyan(templateName)}'s stacks.`)
  } else {
    profile = await inq.prompt({
      type: 'list',
      message: 'Which profile\'s stacks would you like to describe?',
      name: 'use',
      choices: validProfiles,
    })

    if (profile.use) profile = profile.use
  }

  console.log(profile)

  return true
}

exports.describe = async function describe (env, opts) {
  const cwd = process.cwd()
  const {
    status,
    parameters,
    outputs,
    tags,
    info,
  } = opts

  let templateName = env && checkValidTemplate(env)
  let columns

  if (status || parameters || outputs || tags || info) {
    columns = {
      status,
      parameters,
      outputs,
      tags,
      info,
    }
  }

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to update?')

  const templateDir = `${cwd}/src/${templateName}`
  const stackFile = getStackFile(templateDir)

  const stackName = opts && opts.stackname
    ? opts.stackname
    : await selectStackName(templateName, stackFile)

  const stack = stackFile[stackName]
  const region = stack.region

  const profile = _getProfile(stack.profile.name)
  const aws = configAWS(profile || 'default')

  const cfn = new aws.CloudFormation({ region })
  log.p()
  log.i('Fetching stack info...\n')
  const { Stacks } = await cfn.describeStacks({ StackName: stackName }).promise()

  return displayStack(Stacks[0], columns)
}
