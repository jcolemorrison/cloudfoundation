const chk = require('chalk')
const inq = require('inquirer')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getStackFile,
  configAWS,
  writeStackFile,
} = require('../utils')

const { selectStackName } = require('../utils/stacks')
const { _getProfile } = require('../profiles')

module.exports = async function deleteStack (env, opts) {
  const cwd = process.cwd()
  let templateName = env && checkValidTemplate(env)

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to delete?')

  const templateDir = `${cwd}/src/${templateName}`
  const stackFile = getStackFile(templateDir)

  const stackName = opts && opts.stackname
    ? opts.stackname
    : await selectStackName(templateName, stackFile)

  const stack = stackFile[stackName]

  if (!stack) {
    log.p()
    return log.i(`Stack ${stackName} not found.\n`)
  }

  const ensure = await inq.prompt({
    type: 'confirm',
    message: `Are you sure you want to delete Stack ${chk.cyan(stackName)}`,
    name: 'delete',
    default: false,
  })

  if (!ensure.delete) return false

  const region = stack.region

  const profile = _getProfile(stack.profile.name, stack.profile.type)
  const aws = configAWS(profile || 'default')

  const cfn = new aws.CloudFormation({ region })

  await cfn.deleteStack({ StackName: stack.stackId }).promise()

  delete stackFile[stackName]
  writeStackFile(templateDir, stackFile)

  log.p()
  return log.s(`Stack ${chk.cyan(stackName)} is being removed.  Run ${chk.cyan(`cfdn describe ${templateName} -s ${stackName} -a`)} to see the status.\n`)
}
