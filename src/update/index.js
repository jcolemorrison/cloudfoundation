const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const paramUtils = require('../utils/params.js')
const stackUtils = require('../utils/stacks.js')
const profileUtils = require('../profiles/utils.js')
const awsUtils = require('../utils/aws.js')

const { cyan } = chk

module.exports = async function update (env, opts = {}) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts.stackname
  let stack
  let msg

  if (templateName) utils.checkValidTemplate(templateName)
  else templateName = await utils.inquireTemplateName('Which template would you like to deploy a stack for?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)
  rc.templates = rc.templates || {}

  if (!rc.templates[templateName]) throw new Error(`Template ${chk.cyan(templateName)} not found!`)

  const stackList = Object.keys(rc.templates[templateName])

  if (!stackList.length) throw new Error(`Template ${chk.cyan(templateName)} has no stacks!`)

  if (!stackName) {
    const stackInq = await inq.prompt([
      {
        type: 'list',
        name: 'name',
        message: `Which stack, using template ${chk.cyan(templateName)}, would you like to update?`,
        choices: stackList,
      },
    ])

    stackName = stackInq.name
  }

  if (!stackName) throw new Error('Stack Name is Required')

  stack = rc.templates[templateName][stackName]

  if (!stack) throw new Error(`Stack ${stackName} does not exist!`)
  if (!stack.stackId) throw new Error(`Stack ${stackName} has not been deployed yet. Run ${cyan(`cfdn deploy ${templateName} --stackname ${stackName}`)} to deploy it.`)

  const profile = profileUtils.getFromAllProfiles(stack.profile)
  const aws = awsUtils.configAWS(profile)
  const template = utils.getTemplateAsObject(templateName)

  msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`

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

    msg = `Use the above options for ${chk.cyan(stackName)} update?`
  }

  // Ask if they want to use the current parameters
  const useExisting = await stackUtils.confirmStack(templateName, stackName, stack, msg, 'Update')

  // Walk though param selection if they want different values
  if (!useExisting) {
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

    msg = `Use the above options for ${chk.cyan(stackName)} update?`

    const useNew = await stackUtils.confirmStack(templateName, stackName, stack, msg, 'Update')

    if (!useNew) return false
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
