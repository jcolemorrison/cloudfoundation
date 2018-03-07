const fs = require('fs-extra')
const chk = require('chalk')
const glob = require('glob')
const path = require('path')
const inq = require('inquirer')
const os = require('os')

const { AWS_REGIONS } = require('./constants')

const { log, error } = console

exports.log = {
  // bef - strip linebreak before; end - stripe linebreak after
  _b (msg, breaks) {
    let m
    switch (breaks) {
      case 0:
        m = msg
        break
      case 1:
        m = `\n${msg}`
        break
      case 2:
        m = `\n${msg}\n`
        break
      case 3:
        m = `${msg}\n`
        break
      default:
        m = `\n${msg}`
        break
    }
    log(m)
  },
  p: log,
  e (msg, breaks) {
    this._b(chk.red(`Error - ${msg}`), breaks)
  },
  s (msg, breaks) {
    this._b(chk.green(`Success - ${msg}`), breaks)
  },
  i (msg, breaks) {
    this._b(chk.magenta(`Info - ${chk.whiteBright(msg)}`), breaks)
  },
  m: log.bind(this, '  '),
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
mappings/ or mappings.json\n
metadata/ or metadata.json\n
outputs/ or outputs.json\n
parameters/ or parameters.json\n
resources/ or resources.json\n
and description.json
`)
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

exports.reduceTemplateProps = dir => (
  glob.sync(`${dir}/**/*.+(js|json)`).reduce((files, file) => (
    Object.assign(files, require(path.resolve(file)))
  ), {})
)

exports.checkValidProject = (cmd, action, env, opts, isGlobal) => {
  if (!isGlobal) {
    try {
      if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) throw new Error(`${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
    } catch (error) {
      return exports.log.e(error.message)
    }
  }

  return action(env, opts).catch((e) => {
    e.message = chk.red(e.message)
    error(e)
    exports.log.p()
  })
}

exports.checkValidTemplate = (name) => {
  const template = fs.existsSync(`${process.cwd()}/src/${name}`)

  if (!template) throw new Error(`Template ${chk.cyan(name)} does not exist!`)

  return name
}

exports.writeRcFile = (dir, rc) => {
  const cwd = dir || process.cwd()
  const rcFile = `${cwd}/.cfdnrc`

  fs.writeFileSync(rcFile, JSON.stringify(rc, null, 2), 'utf8')
}


exports.selectRegion = async (profile = {}, message) => {
  const region = await inq.prompt([
    {
      type: 'list',
      message,
      choices: AWS_REGIONS,
      name: 'selected',
      default: profile.region || 'us-east-1',
    },
  ])

  return region.selected
}

exports.hasConfiguredCfdn = (homedir) => {
  const home = homedir || os.homedir()
  return fs.existsSync(`${home}/.cfdn/profiles.json`)
}

exports.createSaveSettings = (rc, templateName, stackName, stack) => {
  const saveSettings = { ...rc }

  saveSettings.templates[templateName] = {
    ...saveSettings.templates[templateName],
    [stackName]: { ...stack },
  }

  return saveSettings
}

exports.getValidTemplateName = async (templateName, message) => {
  let tplName = templateName

  if (tplName) exports.checkValidTemplate(templateName)
  else tplName = await exports.inquireTemplateName(message)

  return tplName
}

exports.getTemplateFiles = (name) => {
  const templateDir = `${process.cwd()}/src/${name}`

  if (!fs.existsSync(templateDir)) throw new Error(`${chk.cyan(name)} not found!`)

  const files = glob.sync(`${templateDir}/*`)

  if (!files || !files.length) throw new Error(`${chk.cyan(name)} has no files in it!`)

  return files
}

exports.getTemplateAsObject = (name, dir) => {
  const cwd = dir || `${process.cwd()}/src`
  const templateDir = `${cwd}/${name}`

  if (!fs.existsSync(templateDir)) {
    throw new Error(`${chk.cyan(name)} not found!`)
  }

  const template = { AWSTemplateFormatVersion: '2010-09-09' }

  glob.sync(`${templateDir}/*`).forEach((dir) => {
    const isDir = fs.lstatSync(dir).isDirectory()
    const cfnProp = exports.getCfnPropType(dir)

    // if it's not a directory and it's not the Description, it's a json object
    if (!isDir && cfnProp !== 'Description') {
      template[cfnProp] = require(path.resolve(dir))

      // otherwise if it's not a dir but it is Description then we have the description.json
    } else if (!isDir && cfnProp === 'Description') {
      template[cfnProp] = require(path.resolve(dir)).Description

      // otherwise it's a dir, and it's named Description which is invalid
    } else if (isDir && cfnProp === 'Description') {
      throw new Error(`${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)

      // otherwise, it's a whole thing of of related json, so smash it together
    } else {
      template[cfnProp] = exports.reduceTemplateProps(dir)
    }
  })

  return template
}

exports.inquireTemplateName = async (message) => {
  const templates = glob.sync(`${process.cwd()}/src/*`).map((s) => {
    const p = s.split('/')
    return p[p.length - 1]
  })

  const prompt = await inq.prompt([
    {
      type: 'list',
      name: 'templatename',
      message,
      choices: templates,
    },
  ])

  return prompt.templatename
}
