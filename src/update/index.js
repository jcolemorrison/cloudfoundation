const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const paramUtils = require('../utils/params.js')
const stackUtils = require('../utils/stacks.js')
const profileUtils = require('../profiles/utils.js')
const awsUtils = require('../utils/aws.js')

const { cyan } = chk

exports.getValidTemplate = async (templateName) => {
  let tplName = templateName

  if (tplName) utils.checkValidTemplate(templateName)
  else tplName = await utils.inquireTemplateName('Which template would you like to deploy a stack for?')

  return tplName
}

// ultimately return a valid stackname
exports.getValidStackName = async (stackName, rcTemplates, templateName) => {
  let name = stackName

  const stackList = Object.keys(rcTemplates[templateName])

  if (!stackList.length) throw new Error(`Template ${chk.cyan(templateName)} has no stacks!`)

  if (!name) {
    const stackInq = await inq.prompt([
      {
        type: 'list',
        name: 'name',
        message: `Which stack, using template ${chk.cyan(templateName)}, would you like to update?`,
        choices: stackList,
      },
    ])

    name = stackInq.name
  }

  return name
}

exports.checkStackExists = (rcTemplates, templateName, stackName) => {
  const stack = rcTemplates[templateName][stackName]

  if (!stack) throw new Error(`Stack ${stackName} does not exist!`)
  if (!stack.stackId) throw new Error(`Stack ${stackName} has not been deployed yet. Run ${cyan(`cfdn deploy ${templateName} --stackname ${stackName}`)} to deploy it.`)

  return stack
}

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

  if (!update.params) return utils.log.e('Either use the existing parameters for an update, or update it to use new ones.')

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
  const templateName = exports.getValidTemplate(env)
  let stack

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  if (!rc.templates[templateName]) throw new Error(`Template ${chk.cyan(templateName)} not found!`)

  const stackName = await exports.getValidStackName(opts.stackname, rc.templates, templateName)

  stack = exports.checkStackExists(rc.templates, templateName, stackName)

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
  const saveSettings = { ...rc }
  saveSettings.templates[templateName] = {
    ...saveSettings.templates[templateName],
    [stackName]: { ...stack },
  }
  utils.writeRcFile(cwd, saveSettings)

  // Deploy the update
  await stackUtils.updateStack(template, stackName, stack, aws)

  return utils.log.s(`Stack ${chk.cyan(stackName)} successfully updated!`, 2)
}
