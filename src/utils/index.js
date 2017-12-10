const fs = require('fs-extra')
const chk = require('chalk')
const glob = require('glob')
const path = require('path')
const AWS = require('aws-sdk')
const inq = require('inquirer')

const { log } = console

exports.log = {
  p: log,
  e: log.bind(this, `  ${chk.red('error')}: `),
  s: log.bind(this, `  ${chk.green('success')}: `),
  i: log.bind(this, `  ${chk.magenta('info')}: `),
}

exports.getCfnPropType = (prop) => {
  if (!prop) throw new Error('a cloudformation property type is required')

  const validProps = [
    'conditions',
    'description',
    'mappings',
    'metadata',
    'outputs',
    'parameters',
    'resources',
  ]

  const name = prop.substr(prop.lastIndexOf('/') + 1).split('.')[0].toLowerCase()

  if (validProps.lastIndexOf(name) === -1) {
    throw new Error(`${chk.red('error')}: "${name}" is not a valid CFN top level template property.\n
      Template top level directory must be one of:\n
      conditions/ or conditions.json\n
      description/ or description.json\n
      mappings/ or mappings.json\n
      metadata/ or metadata.json\n
      outputs/ or outputs.json\n
      parameters/ or parameters.json\n
      resources/ or resources.json
    `)
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

exports._reduceStackProps = (dir) => {
  return glob.sync(`${dir}/**/*.+(js|json)`).reduce((files, file) => (
    Object.assign(files, require(path.resolve(file)))
  ), {})
}

exports.getStackFiles = (name) => {
  const stackDir = `${process.cwd()}/src/${name}`

  if (!fs.existsSync(stackDir)) throw new Error(`${chk.cyan(name)} not found!`)

  const files = glob.sync(`${stackDir}/*`)

  if (!files) throw new Error(`${chk.cyan(name)} has no files in it!`)

  return files
}

exports.getStackAsObject = (name) => {
  const stackDir = `${process.cwd()}/src/${name}`

  if (!fs.existsSync(stackDir)) {
    throw new Error(`${chk.cyan(name)} not found!`)
  }
  // iterate over the folder and lint every js / json file
  // to do so, I need to get the relevant path
  // inside, get the TOP level paths.  Only those
  // then we start another loop through each of the top level paths
  // and we import those.
  //
  // so from the build file we're
  const stack = { AWSTemplateFormatVersion: '2010-09-09' }

  try {
    glob.sync(`${stackDir}/*`).forEach((dir) => {
      const isDir = fs.lstatSync(dir).isDirectory()
      const cfnProp = exports.getCfnPropType(dir)

      // so no we're just finishing out the loop from the create tpls method
      // where we need to deal with the Description template
      // deal with the description template as directory
      //

      // if it's not a directory and it's not the Descriptoin, we're done, it's a json object of what we need
      if (!isDir && cfnProp !== 'Description') {
        stack[cfnProp] = require(path.resolve(dir))

      // other wise if it's not a dir but it is Description then we have the description.json
      } else if (!isDir && cfnProp === 'Description') {
        stack[cfnProp] = require(path.resolve(dir)).Description

      // otherwise it's a dir, and it's named Description, we tell them, hey, this is the only one that has to be
      // a fuckin regular json object and can't be a directory
      } else if (isDir && cfnProp === 'Description') {
        throw new Error(`${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)

      // otherwise, it's a whole thing of of related json, so we smash it together
      } else {
        stack[cfnProp] = exports._reduceStackProps(dir)
      }
    })
  } catch (error) {
    throw error
  }

  // so we have the top level sections, now we need to ensure they're the right type
  // from bulid this is like calling the createTpls... kind of.
  return stack
}

exports.validateJSON = (j) => {
  let check

  try {
    check = JSON.parse(j)
    if (check && typeof check === 'object') throw new Error(`${check} is not valid JSON`)
  } catch (error) {
    throw error
  }

  return check
}

exports.checkValidProject = (cmd, action, env, opts) => {
  try {
    if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) throw new Error(`${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  } catch (error) {
    return exports.log.e(error.message)
  }
  return action(env, opts)
}

exports.inquireStackName = async () => {
  let prompt
  try {
    const stacks = glob.sync(`${process.cwd()}/src/*`).map((s) => {
      const p = s.split('/')
      return p[p.length - 1]
    })
    log()
    prompt = await inq.prompt([
      {
        type: 'list',
        name: 'stackname',
        message: 'Which stack would you like to validate?',
        choices: stacks,
      },
    ])
  } catch (error) {
    throw error
  }
  return prompt.stackname
}

exports.configAWS = () => {
  let rc

  try {
    rc = fs.readFileSync(`${process.cwd()}/.cfdnrc`, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('.cfdnrc file not found!')
    throw error
  }

  rc = JSON.parse(rc)

  if (rc.AWS_ACCESS_KEY_ID && rc.AWS_SECRET_ACCESS_KEY) {
    AWS.config.update({
      accessKeyId: rc.AWS_ACCESS_KEY_ID,
      secretAccessKey: rc.AWS_SECRET_ACCESS_KEY,
    })
  }

  if (rc.AWS_REGION) {
    AWS.config.update({ region: rc.AWS_REGION })
  } else if (!process.env.AWS_REGION) {
    throw new Error(`${chk.red('error')}: Region required for AWS - Either set ${chk.cyan('AWS_REGION')} in your .cfdnrc file
    OR set the env variable in your shell session i.e. ${chk.cyan('export AWS_REGION=us-east-1')}`) 
  }

  return AWS
}
