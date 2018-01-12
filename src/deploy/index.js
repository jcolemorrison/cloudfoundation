const fs = require('fs-extra')
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

const {
  selectStackOptions,
  confirmStack,
} = require('../utils/stacks')

const { checkValidProfile, selectProfile, _getProfile } = require('../profiles')

const { cyan } = chk

module.exports = async function deploy (env, opts) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts && opts.stackname
  let profile = opts && opts.profile
  let templateDir
  let stackFile
  let stackRegion // may differ from profile default region
  let aws
  let stack
  let useExisting

  log.p('the env', env)
  log.p('the stackname', opts && opts.stackname)

  // Check for valid Template Name and Valid Stack Name

  if (templateName) {
    try {
      checkValidTemplate(templateName)
      templateDir = `${cwd}/src/${templateName}`
    } catch (error) {
      log.e(error.message)
      throw error
    }
  }

  if (profile) {
    try {
      checkValidProfile(profile)
      profile = _getProfile(profile)
    } catch (error) {
      throw error
    }
  }

  if (!templateName) {
    try {
      templateName = await inquireTemplateName('deploy')
      templateDir = `${cwd}/src/${templateName}`
    } catch (error) {
      log.e(error.message)
      throw error
    }
  }

  // We now 100% have the template name.
  // Now we need to make sure that the stadck doesn't already exist

  // TODO: if stackname, then we need to check that it doesn't have a 'deployed: true' property
  // if it doesn't, grab the values from it, show them, and ask if they want to use this one

  if (!stackName) {
    try {
      const stackInq = await inq.prompt([
        {
          type: 'input',
          name: 'name',
          message: `What do you want to name the stack being deployed from template ${chk.cyan(templateName)}?`,
          validate (input) {
            if (!input) return 'A name for the stack is required!'
            if (!/^[a-zA-Z0-9-]+$/.test(input)) return 'Stack names can only contain alphanumeric characters and hyphens'
            if (input.length > 128) return 'Stack names can only be 128 characters long'
            return true
          },
        },
      ])

      if (stackInq && stackInq.name) stackName = stackInq.name
    } catch (error) {
      log.e(error.message)
      throw error
    }
  }

  try {
    stackFile = getStackFile(templateDir)

    if (stackFile[stackName]) {
      if (stackFile[stackName].deployed) {
        throw new Error(chk.red(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`update ${stackName}`)} to modify it.`))
      }

      const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}\n`
      useExisting = await confirmStack(templateName, stackName, stackFile[stackName], msg)

      if (useExisting) {
        stack = stackFile[stackName]

        checkValidProfile(stack.profile)

        profile = _getProfile(stack.profile)
      } else {
        return log.e(`Stack ${cyan(stackName)} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`)
      }
    }
  } catch (error) {
    throw error
  }

  // At this point, we know there's not already a stack, we know what they want to call it
  // we are safe to start writing nd grabbing values

  // Let's go ahead and ask what profile they want to use if they haven't passed one
  if (!profile) {
    try {
      profile = await selectProfile('use')
    } catch (error) {
      throw error
    }
  }

  try {
    aws = configAWS(profile || 'default')
  } catch (error) {
    throw error
  }

  // If they aren't using a stack already configured, build one
  if (!stack) {
    try {
      stackRegion = await selectRegion(profile, 'Which region would you like to deploy this stack to?')

      const template = getTemplateAsObject(templateName)

      log.p()
      const params = await selectStackParams(template.Parameters, stackRegion, aws)

      log.p()
      const options = await selectStackOptions(stackRegion, aws)

      stack = {
        profile: profile.name,
        region: stackRegion,
        options,
        parameters: params,
      }
    } catch (error) {
      throw error
    }
  }

  try {
    let saveSettings
    // Now we need to (a) confirm that they want to deploy the stack, and show them the values (DONE)
    // (b) deploy the fucking stack
    // (c) ask if they want to save the values for later usage (DONE)
    // if (c) then save them to the stacks file.  Mark the stack as deployed. (DONE)
    if (!useExisting) {
      if (!await confirmStack(templateName, stackName, stack)) return false

      saveSettings = await inq.prompt({
        type: 'confirm',
        name: 'yes',
        message: 'Would you like to save these options for later deploys and updates?',
        default: true,
      })
    }

    // THIS SHOULD COME AFTER THE DEPLOY - or at least setting deployed true should... maybe we just write this twice?
    // so once here without deployed true, and then after the successful deploy with deployed: true.  That way if it errors,
    // They don't have to do this shit again.
    if (useExisting || saveSettings) {
      saveSettings = { ...stackFile, [stackName]: { ...stack } }
      writeStackFile(templateDir, saveSettings)
    }

    // DEPLOY GOES HERE

    // and then after deploy
    if (useExisting || saveSettings) {
      saveSettings[stackName].deployed = true
      writeStackFile(templateDir, saveSettings)
    }
  } catch (error) {
    throw error
  }

  return log.p(stack)

  // log.p(templateName, stackName, profile, stackFile)
  // first we need to handle if there's a template and stack name

  // furthermore, let's not write anything until the entire thing is done - this way we can avoid unnecessary midway clean up
}
