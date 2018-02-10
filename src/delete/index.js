const fs = require('fs-extra')
const chk = require('chalk')
const inq = require('inquirer')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  writeRcFile,
} = require('../utils')

const { selectStackName } = require('../utils/stacks')
const { getFromAllProfiles } = require('../profiles/utils')
const { configAWS } = require('../utils/aws.js')

module.exports = async function deleteStack (env, opts) {
  const cwd = process.cwd()
  let templateName = env && checkValidTemplate(env)

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to delete?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)

  rc.templates = rc.templates || {}

  const stacks = rc.templates[templateName]

  if (!stacks) throw new Error(`No stacks for ${templateName} found.`)

  const stackName = opts && opts.stackname
    ? opts.stackname
    : await selectStackName(templateName, stacks)

  const stack = stacks[stackName]

  if (!stack) return log.e(`Stack ${stackName} not found.`, 2)

  const ensure = await inq.prompt({
    type: 'confirm',
    message: `Are you sure you want to delete Stack ${chk.cyan(stackName)}`,
    name: 'delete',
    default: false,
  })

  if (!ensure.delete) return false

  const region = stack.region

  const profile = getFromAllProfiles(stack.profile)
  const aws = configAWS(profile)

  const cfn = new aws.CloudFormation({ region })

  await cfn.deleteStack({ StackName: stack.stackId }).promise()

  const saveSettings = { ...rc }

  delete saveSettings.templates[templateName][stackName]

  writeRcFile(cwd, saveSettings)

  return log.s(`Stack ${chk.cyan(stackName)} is being removed.`, 2)
}
