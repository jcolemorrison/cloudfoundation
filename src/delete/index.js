const fs = require('fs-extra')
const chk = require('chalk')
const inq = require('inquirer')
const utils = require('../utils')
const stackUtils = require('../utils/stacks')
const profileUtils = require('../profiles/utils')
const awsUtils = require('../utils/aws.js')

module.exports = async function deleteStack (env, opts = {}) {
  const cwd = process.cwd()
  const templateName = await utils.getValidTemplateName(env, 'Which template has the stack you want to delete?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  const stacks = rc.templates[templateName]

  if (!stacks) throw new Error(`No stacks for ${templateName} found.`)

  const stackName = opts.stackname || await stackUtils.selectStackName(templateName, stacks)

  const stack = stacks[stackName]

  if (!stack) return utils.log.e(`Stack ${stackName} not found.`, 2)

  const ensure = await inq.prompt({
    type: 'confirm',
    message: `Are you sure you want to delete Stack ${chk.cyan(stackName)}`,
    name: 'delete',
    default: false,
  })

  if (!ensure.delete) return false

  const region = stack.region

  const profile = profileUtils.getFromAllProfiles(stack.profile)
  const aws = awsUtils.configAWS(profile)

  const cfn = new aws.CloudFormation({ region })

  await cfn.deleteStack({ StackName: stack.stackId }).promise()

  const saveSettings = { ...rc }

  delete saveSettings.templates[templateName][stackName]

  utils.writeRcFile(cwd, saveSettings)

  return utils.log.s(`Stack ${chk.cyan(stackName)} is being removed.`, 2)
}
