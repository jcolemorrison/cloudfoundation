const fs = require('fs-extra')
const chk = require('chalk')
const inq = require('inquirer')
const utils = require('../utils')

const stackUtils = require('../utils/stacks')
const profileUtils = require('../profiles/utils.js')
const awsUtils = require('../utils/aws.js')

// Given a template with stacks, return a profile that is being used for a stack in the template
exports.getValidTemplateProfile = async (profile, templateName, stacks) => {
  // Profiles actually being used for the template
  const validProfiles = stacks.reduce((profiles, [, stack]) => {
    if (!profiles.find(p => p === stack.profile)) profiles.push(stack.profile)
    return profiles
  }, [])


  if (profile && !validProfiles.find(p => p === profile)) {
    throw new Error(`${chk.cyan(profile)} is not used for any of ${chk.cyan(templateName)}'s stacks.`)
  } else if (!profile) {
    profile = await inq.prompt({
      type: 'list',
      message: 'Which profile\'s stacks would you like to describe?',
      name: 'use',
      choices: validProfiles,
    })

    profile = profile.use
  }

  return profile
}

// Give a valid tempalte profile, select all related regions and let them choose
exports.getValidTemplateRegion = async (region, profile, stacks) => {
  // all stacks that match a profile
  const profileStacks = stacks.filter(([, s]) => s.profile === profile)

  // all regions from stacks that match the given profile
  const validRegions = profileStacks.reduce((regions, [, stack]) => {
    if (!regions.find(r => r === stack.region)) regions.push(stack.region)
    return regions
  }, []).sort()

  if (!validRegions.length) return utils.log.e(`No stacks found for Profile ${chk.cyan(profile)}`, 2)

  if (region && !validRegions.find(r => r === region)) {
    throw new Error(`${chk.cyan(region)} is not used for any of ${chk.cyan(profile)}'s stacks.`)
  } else if (!region) {
    region = await inq.prompt({
      type: 'list',
      message: 'Which region\'s stacks would you like to describe?',
      name: 'use',
      choices: validRegions,
    })

    region = region.use
  }

  return region
}

exports.describeAll = async function describeAll (env, opts = {}) {
  const cwd = process.cwd()
  const templateName = await utils.getValidTemplateName(env, 'Which template\'s stacks would you like to describe?')
  let profile = opts.profile
  let region = opts.region

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  const stacks = rc.templates[templateName] && Object.entries(rc.templates[templateName])

  if (!stacks || !stacks.length) throw new Error(`No stacks for ${templateName} found.`)

  profile = await exports.getValidTemplateProfile(profile, templateName, stacks)

  region = await exports.getValidTemplateRegion(region, profile, stacks)

  profile = profileUtils.getFromAllProfiles(profile)

  const aws = awsUtils.configAWS(profile)
  const cfn = new aws.CloudFormation({ region })

  utils.log.i('fetching stacks...')

  const { Stacks } = await cfn.describeStacks().promise()

  if (!Stacks.length) {
    return utils.log.i(`No stacks found for Template ${chk.cyan(templateName)} for Profile ${chk.cyan(profile.name)} in Region ${chk.cyan(region)}`, 2)
  }

  let info = `
Stacks for Template ${chk.cyan(templateName)} for Profile ${chk.cyan(profile.name)} in Region ${chk.cyan(region)}

${chk.cyan('Name')}, Created, Status, Description
----------------------------------`

  Stacks.forEach((s) => {
    info += `
${chk.cyan(s.StackName)}, ${new Date(s.CreationTime).toLocaleString()}, ${s.StackStatus}, ${s.Description}
`
  })

  return utils.log.p(info)
}

exports.describe = async function describe (env, opts = {}) {
  const cwd = process.cwd()
  const {
    status,
    parameters,
    outputs,
    tags,
    info,
  } = opts

  const templateName = await utils.getValidTemplateName(env, 'Which template has the stack you\'d like to describe?')
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

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  const stacks = rc.templates[templateName]

  if (!stacks) throw new Error(`No stacks for ${templateName} found.`)

  const stackName = opts.stackname || await stackUtils.selectStackName(templateName, stacks)

  const stack = stacks[stackName]

  if (!stack) return utils.log.e(`Stack ${stackName} not found.`, 2)

  const region = stack.region

  const profile = profileUtils.getFromAllProfiles(stack.profile)
  const aws = awsUtils.configAWS(profile)

  const cfn = new aws.CloudFormation({ region })

  utils.log.i('Fetching stack info...', 2)

  const { Stacks } = await cfn.describeStacks({ StackName: stackName }).promise()

  return stackUtils.displayStack(Stacks[0], columns)
}
