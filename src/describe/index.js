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
const { _getProfile, parseProfileOption } = require('../profiles')

exports.describeAll = async function describeAll (env, opts) {
  const cwd = process.cwd()
  let templateName = env && checkValidTemplate(env)
  let profile = opts && opts.profile && parseProfileOption(opts.profile)
  let region = opts && opts.region

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to update?')

  const templateDir = `${cwd}/src/${templateName}`
  const stackFile = getStackFile(templateDir)
  const stacks = Object.entries(stackFile)

  const validProfiles = stacks.reduce((profiles, [, stack]) => {
    if (!profiles.find(p => p.name === stack.profile.name)) profiles.push({ ...stack.profile, value: stack.profile })
    return profiles
  }, [])

  if (profile && !validProfiles.find(p => p.name === profile.name)) {
    throw new Error(`${chk.cyan(profile.name)} is not used for any of ${chk.cyan(templateName)}'s stacks.`)
  } else if (!profile) {
    profile = await inq.prompt({
      type: 'list',
      message: 'Which profile\'s stacks would you like to describe?',
      name: 'use',
      choices: validProfiles,
    })

    if (profile.use) profile = profile.use
  }

  const profileStacks = stacks.filter(([, s]) => s.profile.name === profile.name && s.profile.type === profile.type)
  const validRegions = stacks.reduce((regions, [, stack]) => {
    if (profileStacks.find(([, ps]) => ps.profile.name === stack.profile.name)) {
      if (!regions.find(r => r === stack.region)) regions.push(stack.region)
    }
    return regions
  }, []).sort()

  if (!validRegions.length) {
    log.p()
    return log.i(`No stacks found for Profile ${chk.cyan(profile.name)}\n`)
  }

  if (region && !validRegions.find(r => r === region)) {
    throw new Error(`${chk.cyan(region)} is not used for any of ${chk.cyan(profile.name)}'s stacks.`)
  } else if (!region) {
    region = await inq.prompt({
      type: 'list',
      message: 'Which region\'s stacks would you like to describe?',
      name: 'use',
      choices: validRegions,
    })

    if (region.use) region = region.use
  }

  profile = _getProfile(profile.name, profile.type)
  const aws = configAWS(profile || 'default')
  const cfn = new aws.CloudFormation({ region })

  log.p()
  log.i('fetching stacks...')
  const { Stacks } = await cfn.describeStacks().promise()

  if (!Stacks.length) {
    log.p()
    return log.i(`No stacks found for Template ${chk.cyan(templateName)} for Profile ${chk.cyan(profile.name)} in Region ${chk.cyan(region)}\n`)
  }

  let info = `
Stacks for Template ${chk.cyan(templateName)} for Profile ${chk.cyan(profile.name)} in Region ${chk.cyan(region)}

Name, Created, Status, Description
----------------------------------`
  Stacks.forEach((s) => {
    info += `
${s.StackName}, ${new Date(s.CreationTime).toLocaleString()}, ${s.StackStatus}, ${s.Description}
`
  })

  log.p(info)

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
