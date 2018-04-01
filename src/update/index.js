const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const paramUtils = require('../utils/params.js')
const stackUtils = require('../utils/stacks.js')
const profileUtils = require('../profiles/utils.js')
const awsUtils = require('../utils/aws.js')

// The following two fns overwrite the stack param, but since the
// calls themselves overwrite a `let` it doesn't matter.
exports.getParamChanges = async (template, stack, aws) => {
  const previousParams = Object.keys(stack.parameters)
  const currentParams = Object.keys(template.Parameters)

  // Check for New Params and allow filling them in
  const newParamKeys = []
  const newParams = currentParams.reduce((sum, p) => {
    if (!previousParams.includes(p)) {
      sum[p] = template.Parameters[p]
      newParamKeys.push(p)
    }
    return sum
  }, {})

  // Remove old params
  previousParams.forEach((p) => {
    if (!currentParams.includes(p)) delete stack.parameters[p]
  })


  if (newParamKeys.length > 0) {
    utils.log.i(`New Parameters ${chk.cyan(newParamKeys.join(', '))} found.`)

    const params = await paramUtils.selectStackParams(newParams, stack.region, aws)

    stack.parameters = {
      ...stack.parameters,
      ...params,
    }
  }

  return stack
}

exports.updateParams = async (templateName, template, stackName, stack, aws) => {
  const update = await inq.prompt({
    type: 'confirm',
    name: 'params',
    message: 'Update stack to use different parameters?',
    default: true,
  })

  if (!update.params) {
    utils.log.e('Either use the existing parameters for an update, or update it to use new ones.')
    return false
  }

  const params = await paramUtils.selectStackParams(template.Parameters, stack.region, aws, stack.parameters)

  const options = await stackUtils.selectStackOptions(stack.region, aws, stack.options, true)

  stack = {
    ...stack,
    options,
    parameters: params,
  }

  const msg = `Use the above options for ${chk.cyan(stackName)} update?`

  const useNew = await stackUtils.confirmStack(templateName, stackName, stack, msg, 'Update')

  if (!useNew) return false

  return stack
}

// Main Command
exports.update = async function update (env, opts = {}) {
  const cwd = process.cwd()
  const templateName = await utils.getValidTemplateName(env, 'Which template has the stack you\'d like to update?')
  let stack

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  if (!rc.templates[templateName]) throw new Error(`Template ${chk.cyan(templateName)} not found!`)

  const stackName = await stackUtils.getValidStackName(opts.stackname, rc.templates, templateName)

  stack = stackUtils.checkStackExists(rc.templates, templateName, stackName)

  const profile = profileUtils.getFromAllProfiles(stack.profile)
  const aws = awsUtils.configAWS(profile)
  const template = utils.getTemplateAsObject(templateName)

  stack = await exports.getParamChanges(template, stack, aws)

  // Ask if they want to use the current parameters
  const msg = `Use the above options for stack ${chk.cyan(stackName)} update?`
  const useExisting = await stackUtils.confirmStack(templateName, stackName, stack, msg, 'Update')

  // Walk though param selection if they want different values
  if (!useExisting) {
    stack = await exports.updateParams(templateName, template, stackName, stack, aws)
    if (!stack) return false
  }

  // Save new stack values
  const saveSettings = utils.createSaveSettings(rc, templateName, stackName, stack)

  utils.writeRcFile(cwd, saveSettings)

  // Deploy the update
  await stackUtils.updateStack(template, stackName, stack, aws)

  return utils.log.s(`Stack ${chk.cyan(stackName)} is updating!`, 2)
}
