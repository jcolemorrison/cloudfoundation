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
  selectRegion,
  configAWS,
} = require('../utils')

const { selectStackOptions, confirmStack, createStack } = require('../utils/stacks')
const { checkValidProfile, selectProfile, _getProfile } = require('../profiles')
const { cyan } = chk

module.exports = async function update (env, opts) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts && opts.stackname
  let profile = opts && opts.profile
  let templateDir
  let template
  let stackFile
  let stackRegion // may differ from profile default region
  let aws
  let stack
  let useExisting

  if (templateName) {
    try {
      checkValidTemplate(templateName)
      templateDir = `${cwd}/src/${templateName}`
    } catch (error) {
      throw error
    }
  }

  if (!templateName) {
    try {
      templateName = await inquireTemplateName('Which template has the stack you want to update?')
      templateDir = `${cwd}/src/${templateName}`
    } catch (error) {
      throw error
    }
  }

  try {
    stackFile = getStackFile(templateDir)

    if (stackName) {
      if (stackFile[stackName]) {
        if (!stackFile[stackName].deployed) {
          throw new Error(chk.red(`Stack ${cyan(stackName)} has not been deployed yet.  Run ${cyan(`cfdn deploy ${templateName} --stackname ${stackName}`)} to deploy it.`))
        }

        const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}\n`
        useExisting = await confirmStack(templateName, stackName, stackFile[stackName], msg, 'Update')

        if (useExisting) {
          stack = stackFile[stackName]

          checkValidProfile(stack.profile.name)

          profile = _getProfile(stack.profile.name)
        } else {
          return log.e(`Stack ${cyan(stackName)} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`)
        }
      }
    }
  } catch (error) {
    throw error
  }

  if (!stackName) {
    try {
      const choices = Object.keys(stackFile)
      const stackInq = await inq.prompt([
        {
          type: 'list',
          name: 'name',
          message: `Which stack, using template ${chk.cyan(templateName)}, would you like to update?`,
          choices,
        },
      ])

      if (stackInq && stackInq.name) {
        stackName = stackInq.name
        stack = stackFile[stackName]
        checkValidProfile(stack.profile.name)
        profile = _getProfile(stack.profile.name)
      }
    } catch (error) {
      throw error
    }
  }
}
