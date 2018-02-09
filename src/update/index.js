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
  configAWS,
} = require('../utils')

const { selectStackOptions, confirmStack, updateStack } = require('../utils/stacks')
const { checkValidProfile, getFromAllProfiles } = require('../profiles/utils')

const { cyan } = chk

async function updateOld (env, opts) {
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
    let msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`

    aws = configAWS(profile || 'default')
    template = getTemplateAsObject(templateName)

    // check for new params and optionally just let them fill those in and go
    // console.log('current params', stack.parameters)
    // console.log('all params', template.Parameters)
    const existingParams = Object.keys(stack.parameters)
    const newParamKeys = []
    const newParams = Object.keys(template.Parameters).reduce((sum, p) => {
      if (existingParams.indexOf(p) === -1) {
        sum[p] = template.Parameters[p]
        newParamKeys.push(p)
      }
      return sum
    }, {})

    if (newParamKeys.length > 0) {
      log.p()
      log.i(`New Parameters ${chk.cyan(newParamKeys.join(', '))} found.\n`)

      const params = await selectStackParams(newParams, stack.region, aws)

      stack.parameters = {
        ...stack.parameters,
        ...params,
      }

      msg = `Use the above options for ${chk.cyan(stackName)} update?`
    }

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
    const stackId = await updateStack(template, stackName, stack, aws)

    log.p()
    log.s(`Stack ${chk.cyan(stackName)} successfully updated!`)
    return log.i(`StackId: ${chk.cyan(stackId)}\n`)
  } catch (error) {
    throw error
  }
}

module.exports = async function update (env, opts = {}) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts.stackname
  let profileName = opts.profile
  let stack
  let profile
  let aws
  let template
  let msg

  if (templateName) checkValidTemplate(templateName)
  else templateName = await inquireTemplateName('Which template would you like to deploy a stack for?')

  const rc = fs.readJsonSync(`${cwd}/.cfdnrc`)
  rc.templates = rc.templates || {}

  if (!rc.templates[templateName]) throw new Error(`Template ${chk.cyan(templateName)} not found!`)

  const stackList = Object.keys(rc.templates[templateName])

  if (!stackList.length) throw new Error(`Template ${chk.cyan(templateName)} has no stacks!`)
  
  if (!stackName) {
    const stackInq = await inq.prompt([
      {
        type: 'list',
        name: 'name',
        message: `Which stack, using template ${chk.cyan(templateName)}, would you like to update?`,
        choices: stackList,
      },
    ])

    stackName = stackInq.name
  }

  if (!stackName) throw new Error('Stack Name is Required')

  stack = rc.templates[templateName][stackName]

  if (!stack) throw new Error(`Stack ${stackName} does not exist!`)
  if (!stack.stackId) throw new Error(`Stack ${stackName} has not been deployed yet. Run ${cyan(`cfdn deploy ${templateName} --stackname ${stackName}`)} to deploy it.`)

  profile = getFromAllProfiles(stack.profile)
  aws = configAWS(profile)
  template = getTemplateAsObject(templateName)
  msg = `Stack with name ${chk.cyan(stackName)} found for template ${chk.cyan(templateName)}`

  // Check for New Params and allow filling them in
  const existingParams = Object.keys(stack.parameters)
  const newParamKeys = []
  const newParams = Object.keys(template.Parameters).reduce((sum, p) => {
    if (existingParams.indexOf(p) === -1) {
      sum[p] = template.Parameters[p]
      newParamKeys.push(p)
    }
    return sum
  }, {})

  if (newParamKeys.length > 0) {
    log.i(`New Parameters ${chk.cyan(newParamKeys.join(', '))} found.`, 2)

    const params = await selectStackParams(newParams, stack.region, aws)

    stack.parameters = {
      ...stack.parameters,
      ...params,
    }

    msg = `Use the above options for ${chk.cyan(stackName)} update?`
  }

  // Ask if they want to use the current parameters
  useExisting = await confirmStack(templateName, stackName, stack, msg, 'Update')

  // Next we handle if they don't want to use the existing one
}
