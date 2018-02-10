const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getTemplateAsObject,
  selectRegion,
  writeRcFile,
} = require('../utils')
const { selectStackParams } = require('../utils/params.js')
const { selectStackOptions, confirmStack, createStack } = require('../utils/stacks')
const {
  getFromAllProfiles,
  selectFromAllProfiles,
} = require('../profiles/utils')
const { configAWS } = require('../utils/aws.js')

const { cyan } = chk

module.exports = async function deploy (env, opts = {}) {
  const cwd = process.cwd()
  let templateName = env
  let profile = opts.profile
  let stackName = opts.stackname
  let stack
  let region
  let saveSettings
  let useExisting

  if (templateName) checkValidTemplate(templateName)
  else templateName = await inquireTemplateName('Which template would you like to deploy a stack for?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)
  rc.templates = rc.templates || {}

  if (!stackName) {
    const stackInq = await inq.prompt({
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

    if (stackInq && stackInq.name) stackName = stackInq.name
  }

  stack = rc.templates[templateName] && rc.templates[templateName][stackName]

  // Load predefined stack settings if available
  if (stack) {
    if (stack.stackId) {
      throw new Error(chk.red(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`cfdn update ${templateName} --stackname ${stackName}`)} to modify it.`))
    }

    const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`
    useExisting = await confirmStack(templateName, stackName, stack, msg, 'Deploy')

    if (useExisting) profile = stack.profile
    else return log.e(`Stack ${cyan(stackName)} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`)
  }

  if (!profile) profile = await selectFromAllProfiles('Which profile would you like to use to deploy this stack?')
  else profile = getFromAllProfiles(profile)

  const aws = configAWS(profile)
  const template = getTemplateAsObject(templateName)

  // Create stack settings if unavailable
  if (!stack) {
    region = await selectRegion(profile, 'Which region would you like to deploy this stack to?')

    const params = await selectStackParams(template.Parameters, region, aws)

    const options = await selectStackOptions(region, aws)

    stack = {
      profile: profile.name,
      region,
      options,
      parameters: params,
    }
  }

  if (!useExisting) {
    if (!await confirmStack(templateName, stackName, stack, false, 'Deploy')) return false

    saveSettings = await inq.prompt({
      type: 'confirm',
      name: 'yes',
      message: 'Would you like to save these options for later deploys and updates?',
      default: true,
    })
  }

  // Write the stack file first, in case something fails, user won't have to re-input
  if (useExisting || saveSettings) {
    saveSettings = { ...rc }
    saveSettings.templates[templateName] = {
      ...saveSettings.templates[templateName],
      [stackName]: { ...stack },
    }
    writeRcFile(cwd, saveSettings)
  }

  const stackId = await createStack(template, stackName, stack, aws)

  // and then after deploy write the new stackId
  if (useExisting || saveSettings) {
    saveSettings.templates[templateName][stackName].stackId = stackId
    writeRcFile(cwd, saveSettings)
  }

  log.s(`Stack ${chk.cyan(stackName)} successfully deployed!`)
  return log.i(`StackId: ${chk.cyan(stackId)}`, 3)
}
