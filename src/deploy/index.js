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
  writeRcFile,
} = require('../utils')

const { selectStackOptions, confirmStack, createStack } = require('../utils/stacks')

const {
  checkValidProfile,
  selectProfile,
  _getProfile,
  getFromAllProfiles,
  selectFromAllProfiles,
} = require('../profiles/utils')

const { configAWS } = require('../utils/aws.js')

const { cyan } = chk

async function deployOld (env, opts) {
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
      templateName = await inquireTemplateName('Which template would you like to deploy a stack for?')
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
        throw new Error(chk.red(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`cfdn update ${templateName} --stackname ${stackName}`)} to modify it.`))
      }

      const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`
      useExisting = await confirmStack(templateName, stackName, stackFile[stackName], msg, 'Deploy')

      if (useExisting) {
        stack = stackFile[stackName]

        checkValidProfile(stack.profile.name)

        profile = _getProfile(stack.profile.name)
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
    template = getTemplateAsObject(templateName)
  } catch (error) {
    throw error
  }

  // If they aren't using a stack already configured, build one
  if (!stack) {
    try {
      stackRegion = await selectRegion(profile, 'Which region would you like to deploy this stack to?')

      log.p()
      const params = await selectStackParams(template.Parameters, stackRegion, aws)

      log.p()
      const options = await selectStackOptions(stackRegion, aws)

      stack = {
        profile: { name: profile.name, type: profile.type },
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
      if (!await confirmStack(templateName, stackName, stack, false, 'Deploy')) return false

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
      writeRcFile(templateDir, saveSettings)
    }

    // DEPLOY GOES HERE
    const stackId = await createStack(template, stackName, stack, aws)

    // and then after deploy
    if (useExisting || saveSettings) {
      saveSettings[stackName].deployed = true
      saveSettings[stackName].stackId = stackId
      writeRcFile(templateDir, saveSettings)
    }

    log.p()
    log.s(`Stack ${chk.cyan(stackName)} successfully deployed!`)
    return log.i(`StackId: ${chk.cyan(stackId)}\n`)
  } catch (error) {
    throw error
  }
}

module.exports = async function deploy (env, opts = {}) {
  const cwd = process.cwd()
  let templateName = env
  let profile = opts.profile
  let stackName = opts.stackname
  let stack
  let region
  let saveSettings
  let useExisting

  if (templateName) checkValidTemplate(templateName)
  else templateName = await inquireTemplateName('Which template would you like to deploy a stack for?')

  const templateDir = `${cwd}/src/${templateName}`

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)
  rc.templates = rc.templates || {}

  if (!stackName) {
    const stackInq = await inq.prompt({
      type: 'input',
      name: 'name',
      message: `What do you want to name the stack being deployed from template ${chk.cyan(templateName)}?`,
      validate (input) {
        if (!input) return 'A name for the stack is required!'
        if (!/^[a-zA-Z0-9-]+$/.test(input)) return 'Stack names can only contain alphanumeric characters and hyphens'
        if (input.length > 128) return 'Stack names can only be 128 characters long'
        return true
      },
    })

    if (stackInq && stackInq.name) stackName = stackInq.name
  }

  stack = rc.templates[templateName] && rc.templates[templateName][stackName]

  // Load predefined stack settings if available
  if (stack) {
    if (stack.stackId) {
      throw new Error(chk.red(`Stack ${cyan(stackName)} already exists.  Run ${cyan(`cfdn update ${templateName} --stackname ${stackName}`)} to modify it.`))
    }

    const msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`
    useExisting = await confirmStack(templateName, stackName, stack, msg, 'Deploy')

    if (useExisting) profile = stack.profile
    else return log.e(`Stack ${cyan(stackName)} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`)
  }

  if (!profile) profile = await selectFromAllProfiles('Which profile would you like to use to deploy this stack?')
  else profile = getFromAllProfiles(profile)

  const aws = configAWS(profile)
  const template = getTemplateAsObject(templateDir)

  // Create stack settings if unavailable
  if (!stack) {
    region = await selectRegion(profile, 'Which region would you like to deploy this stack to?')

    log.p()
    const params = await selectStackParams(template.Parameters, region, aws)

    log.p()
    const options = await selectStackOptions(region, aws)

    stack = {
      profile: profile.name,
      region,
      options,
      parameters: params,
    }
  }

  if (!useExisting) {
    if (!await confirmStack(templateName, stackName, stack, false, 'Deploy')) return false

    saveSettings = await inq.prompt({
      type: 'confirm',
      name: 'yes',
      message: 'Would you like to save these options for later deploys and updates?',
      default: true,
    })
  }

  // Write the stack file first, in case something fails, user won't have to re-input
  if (useExisting || saveSettings) {
    // This all need to chagne to write hte newly created stack to the RC file. .cfdnrc[TemplateName][StackName] = stack
    saveSettings = { ...rc }
    saveSettings.templates[templateName] = {
      [stackName]: { ...stack },
    }
    writeStackFile(cwd, saveSettings)
  }

  // DEPLOY GOES HERE
  const stackId = await createStack(template, stackName, stack, aws)

  // and then after deploy
  if (useExisting || saveSettings) {
    saveSettings[templateName][stackName].stackId = stackId
    writeStackFile(cwd, saveSettings)
  }

  log.s(`Stack ${chk.cyan(stackName)} successfully deployed!`)
  return log.i(`StackId: ${chk.cyan(stackId)}`, 3)
}
