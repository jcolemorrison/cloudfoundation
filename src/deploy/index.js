const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  checkValidStack,
} = require('../utils')

module.exports = async function deploy (env, opts) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts && opts.stackname
  log.p('the env', env)
  log.p('the opts', opts && opts.stackname)

  // Check for valid Template Name and Valid Stack Name

  if (templateName) {
    try {
      checkValidTemplate(templateName)
    } catch (error) {
      return log.e(error.message)
    }
  }

  if (!templateName) {
    try {
      templateName = await inquireTemplateName()
    } catch (error) {
      return log.e(error.message)
    }
  }

  if (stackName) {
    checkValidStack('thing', true)
  }

  if (!stackName) {
    try {
      const stackInq = await inq.prompt([
        {
          type: 'input',
          name: 'name',
          message: `What do you want to name the stack being deployed from template ${chk.cyan(templateName)}?`,
        },
      ])

      if (stackInq && stackInq.name) stackName = stackInq.name
    } catch (error) {
      return log.e(error.rmessage)
    }
  }

  log.p(templateName, stackName)
  // first we need to handle if there's a template and stack name
}
