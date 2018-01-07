const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const {
  log,
  inquireTemplateName,
  checkValidTemplate,
  getStackFile,
  getTemplateAsObject,
  selectStackParams,
  selectRegion,
  configAWS,
} = require('../utils')

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

  // check for either (a) a valid profile passed or (b) that a default profile exists
  // if !a, then throw an error
  // if !b, I guess it doesn't matter, because we just move on and ask them what profile to use.
  // HOWEVER, if there are no profiles at all, we should handle that, and say "you need a valid profile set up to deploy"
  // But again, if !b, we're just going to ask them alter down the road

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
      throw new Error(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`update ${stackName}`)} to modify it.`)
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
  } catch (error) {
    throw error
  }

  aws = configAWS(profile || 'default')

  // Now we have the valid profile, stackname, and stackfile.  Things are validated against proper rules.
  // What we need to do now...

  try {
    const template = getTemplateAsObject(templateName)

    const params = await selectStackParams(template.Parameters, profile, stackRegion, aws)
  } catch (error) {
    throw error
  }

  // log.p(templateName, stackName, profile, stackFile)
  // first we need to handle if there's a template and stack name

  // furthermore, let's not write anything until the entire thing is done - this way we can avoid unnecessary midway clean up
}
