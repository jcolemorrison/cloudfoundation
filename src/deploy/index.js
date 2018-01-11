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
  useExistingStack,
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
        throw new Error(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`update ${stackName}`)} to modify it.`)
      }

      stack = await useExistingStack(templateName, stackName, stackFile[stackName])
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

  // We need to get the region finally

  try {
    stackRegion = await selectRegion(profile, 'Which region would you like to deploy this stack to?')
    aws = configAWS(profile || 'default')
  } catch (error) {
    throw error
  }

  // Now we have the valid profile, stackname, and stackfile.  Things are validated against proper rules.
  // What we need to do now...

  try {
    const template = getTemplateAsObject(templateName)

    log.p()
    const params = await selectStackParams(template.Parameters, stackRegion, aws)

    log.p()
    const options = await selectStackOptions(stackRegion, aws)

    stack = {
      [stackName]: {
        profile: profile.name,
        region: stackRegion,
        options,
        parameters: params,
      },
    }

    console.log(stack)
    writeStackFile(templateDir, { ...stack, ...stackFile })
  } catch (error) {
    throw error
  }

  // log.p(templateName, stackName, profile, stackFile)
  // first we need to handle if there's a template and stack name

  // furthermore, let's not write anything until the entire thing is done - this way we can avoid unnecessary midway clean up
}
