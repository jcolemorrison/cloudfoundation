const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getStackFile,
  configAWS,
} = require('../utils')

const { selectStackName, displayStack } = require('../utils/stacks')
const { _getProfile } = require('../profiles')

module.exports = async function describe (env, opts) {
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
