const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const paramUtils = require('../utils/params.js')
const stackUtils = require('../utils/stacks')
const profileUtils = require('../profiles/utils')
const awsUtils = require('../utils/aws.js')

const { cyan } = chk

exports.inqStackName = async (templateName) => {
  const stack = await inq.prompt({
    type: 'input',
    name: 'name',
    message: `What do you want to name the stack being deployed from template ${chk.cyan(templateName)}?`,
    validate (input) {
      if (!input) return 'A name for the stack is required!'
      if (!/^[a-zA-Z0-9-]+$/.test(input)) return 'Stack names can only contain alphanumeric characters and hyphens'
      if (input.length > 128) return 'Stack names can only be 128 characters long'
      return true
    },
  })

  return stack.name
}

exports.useExistingDeploy = async (stack, stackName, templateName) => {
  if (stack.stackId) {
    throw new Error(chk.red(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`cfdn update ${templateName} --stackname ${stackName}`)} to modify it.`))
  }

  const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`

  return stackUtils.confirmStack(templateName, stackName, stack, msg, 'Deploy')
}

exports.createStackSettings = async (profile, templateParams, aws) => {
  const region = await utils.selectRegion(profile, 'Which region would you like to deploy this stack to?')

  const params = await paramUtils.selectStackParams(templateParams, region, aws)

  const options = await stackUtils.selectStackOptions(region, aws)

  return {
    profile: profile.name,
    region,
    options,
    parameters: params,
  }
}

exports.deploy = async function deploy (env, opts = {}) {
  const cwd = process.cwd()
  let templateName = env
  let profile = opts.profile
  let stackName = opts.stackname
  let stack
  let saveSettings
  let useExisting

  if (templateName) utils.checkValidTemplate(templateName)
  else templateName = await utils.inquireTemplateName('Which template would you like to deploy a stack for?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)
  rc.templates = rc.templates || {}

  if (!stackName) stackName = await exports.inqStackName(templateName)

  stack = rc.templates[templateName] && rc.templates[templateName][stackName]

  // Load predefined stack settings if available
  if (stack) {
    useExisting = await exports.useExistingDeploy(stack, stackName, templateName)

    if (useExisting) profile = stack.profile
    else return utils.log.e(`Stack ${cyan(stackName)} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`)
  }

  // Get profile for AWS usage
  if (!profile) profile = await profileUtils.selectFromAllProfiles('Which profile would you like to use to deploy this stack?')
  else profile = profileUtils.getFromAllProfiles(profile)

  const aws = awsUtils.configAWS(profile)
  const template = utils.getTemplateAsObject(templateName)

  // Create stack settings if unavailable
  if (!stack) stack = await exports.createStackSettings(profile, template.Parameters, aws)

  // Go through param set up if not using pre-defined settings.
  if (!useExisting) {
    if (!await stackUtils.confirmStack(templateName, stackName, stack, false, 'Deploy')) return false

    saveSettings = await inq.prompt({
      type: 'confirm',
      name: 'use',
      message: 'Would you like to save these options for later deploys and updates?',
      default: true,
    })
  }

  // Write the updated RC file first, in case something fails, user won't have to re-input
  if (useExisting || saveSettings.use) {
    const settings = utils.createSaveSettings(rc, templateName, stackName, stack)
    utils.writeRcFile(cwd, settings)
  }

  const stackId = await stackUtils.createStack(template, stackName, stack, aws)

  // and then after deploy write the new stackId
  if (useExisting || saveSettings.use) {
    const settings = utils.createSaveSettings(rc, templateName, stackName, stack)
    settings.templates[templateName][stackName].stackId = stackId
    utils.writeRcFile(cwd, settings)
  }

  utils.log.s(`Stack ${chk.cyan(stackName)} is deploying!`)
  return utils.log.i(`StackId: ${chk.cyan(stackId)}`, 3)
}
