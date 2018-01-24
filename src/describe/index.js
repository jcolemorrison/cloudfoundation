const inq = require('inquirer')
const chk = require('chalk')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getStackFile,
  writeStackFile,
  getTemplateAsObject,
  selectStackParams,
  configAWS,
} = require('../utils')

const { selectStackOptions, selectStackName } = require('../utils/stacks')
const { checkValidProfile, _getProfile } = require('../profiles')

module.exports = async function describe (env, opts) {
  const cwd = process.cwd()
  let templateName = env && checkValidTemplate(env)
  let template
  let stackRegion // may differ from profile default region
  let useExisting

  if (!templateName) templateName = await inquireTemplateName('Which template has the stack you want to update?')

  const templateDir = `${cwd}/src/${templateName}`
  const stackFile = getStackFile(templateDir)

  const stackName = opts && opts.stackname
    ? opts.stackname
    : await selectStackName(templateName, stackFile)

  const stack = stackFile[stackName]

  const profile = _getProfile(stack.profile.name)
  const aws = configAWS(profile || 'default')
  console.log(aws.config)

  // now we have the stack name AND the template name AND the template dir.. etc.
  // what next?
  // Now we need to make the AWS sdk call
}
