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

const { selectStackOptions, confirmStack, updateStack } = require('../utils/stacks')
const { checkValidProfile, _getProfile } = require('../profiles')

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
        stackRegion = stack.region
        checkValidProfile(stack.profile.name)
        profile = _getProfile(stack.profile.name)
      }
    } catch (error) {
      throw error
    }
  } else {
    try {
      if (stackFile[stackName] && !stackFile[stackName].deployed) {
        throw new Error(chk.red(`Stack ${cyan(stackName)} has not been deployed yet.  Run ${cyan(`cfdn deploy ${templateName} --stackname ${stackName}`)} to deploy it.`))
      }

      stack = stackFile[stackName]
      stackRegion = stack.region
      checkValidProfile(stack.profile.name)
      profile = _getProfile(stack.profile.name)
    } catch (error) {
      throw error
    }
  }

  try {
    let msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}\n`

    aws = configAWS(profile || 'default')
    template = getTemplateAsObject(templateName)
    useExisting = await confirmStack(templateName, stackName, stack, msg, 'Update')

    if (!useExisting) {
      // This is where I need to say, you don't want to use these settings - okay would you like to update the params?
      // We also need to get the profile no matter what...
      const update = await inq.prompt({
        type: 'confirm',
        name: 'params',
        message: 'Update stack to use different parameters?',
        default: true,
      })

      if (!update.params) return log.e('Either use the existing parameters for an update, or update it to use new ones.')

      log.p()
      const params = await selectStackParams(template.Parameters, stack.region, aws, stack.parameters)

      log.p()
      const options = await selectStackOptions(stack.region, aws, stack.options, true)

      stack = {
        profile: { name: stack.profile.name, type: stack.profile.type },
        region: stackRegion,
        options,
        parameters: params,
      }

      msg = `Use the above options for ${chk.cyan(stackName)} update?`

      // need to deal with this NOT showing the info a second time when you confirm it
      const useNew = await confirmStack(templateName, stackName, stack, msg, 'Update')

      if (!useNew) return false
    }

    // Save stack, because if the deploy fails it'll be annoying to redo it
    const saveSettings = { ...stackFile, [stackName]: { ...stack } }
    writeStackFile(templateDir, saveSettings)

    // Deploy the update
    return await updateStack(template, stackName, stack, aws)
  } catch (error) {
    throw error
  }
}
