const fs = require('fs-extra')
const chk = require('chalk')
const glob = require('glob')
const path = require('path')
const AWS = require('aws-sdk')

const { log } = console

exports.log = {
  e: log.bind(this, `${chk.red('error')}: `),
  s: log.bind(this, `${chk.green('success')}: `),
  i: log.bind(this, `${chk.magenta('info')}: `),
}

exports.getCfnProp = (prop) => {
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

exports.getStack = (name) => {
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
  const stack = { AWSTemplateFormatVersion: '010-09-09' }

  try {
    glob.sync(`${stackDir}/*`).forEach((dir) => {
      const isDir = fs.lstatSync(dir).isDirectory()
      const cfnProp = exports.getCfnProp(dir)

      // so no we're just finishing out the loop from the create tpls method
      // where we need to deal with the Description template
      // deal with the description template as directory
      //
      if (!isDir && cfnProp !== 'Description') {
        stack[cfnProp] = require(path.resolve(dir))
      } else if (!isDir && cfnProp === 'Description') {
        stack[cfnProp] = require(path.resolve(dir)).Description
      } else if (isDir && cfnProp === 'Description') {
        throw new Error(`${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)
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

exports.checkValidProject = (cmd) => {
  if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) {
    // TODO: remove the chk red error and have everything using this use log
    throw new Error(`${chk.red('error')}: ${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  }
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
