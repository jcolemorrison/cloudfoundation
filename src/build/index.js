const path = require('path')
const fs = require('fs')
const glob = require('glob')
const chk = require('chalk')

const { checkValidProject } = require('../utils')

function pathName (p) {
  if (!p) throw new Error('Valid path required')
  return p.substr(p.lastIndexOf('/') + 1).split('.')[0].toLowerCase()
}

function reduceDir (dir) {
  return glob.sync(`${dir}/**/*.+(js|json)`).reduce((files, file) => (
    Object.assign(files, require(path.resolve(file)))
  ), {})
}

function basePropType (prop) {
  const validProps = [
    'conditions',
    'description',
    'mappings',
    'metadata',
    'outputs',
    'parameters',
    'resources',
  ]

  const name = pathName(prop)

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

function createTpls (tpls) {
  return tpls.map((t) => {
    const base = { AWSTemplateFormatVersion: '010-09-09' }
    const baseProps = glob.sync(`${t}/*`)

    try {
      baseProps.forEach((p) => {
        const isDir = fs.lstatSync(p).isDirectory()
        const bpt = basePropType(p)

        if (!isDir && bpt !== 'Description') {
          base[bpt] = require(path.resolve(p))
        } else if (!isDir && bpt === 'Description') {
          base[bpt] = require(path.resolve(p)).Description
        } else if (isDir && bpt === 'Description') {
          throw new Error(`${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)
        } else {
          base[bpt] = reduceDir(p)
        }
      })
    } catch (error) {
      return console.log(error.message)
    }

    return {
      name: pathName(t),
      template: base,
    }
  })
}

const buildTplFiles = (dir, tpls) => {
  const dist = `${dir}/dist`
  console.log('')

  tpls.forEach((b) => {
    const { name, template } = b
    const fullTpl = JSON.stringify(template, null, '  ')
    const minTpl = JSON.stringify(template)

    if (!fs.existsSync(dist)) {
      fs.mkdirSync(dist)
    }

    fs.writeFileSync(`${dist}/${name}.json`, fullTpl, 'utf8')
    fs.writeFileSync(`${dist}/${name}.min.json`, minTpl, 'utf8')

    console.log(`${chk.green('success')}: Template ${chk.cyan(`${name}.json`)} and ${chk.cyan(`${name}.min.json`)} successfully built!`)
  })

  console.log('')
}

function build () {
  const cwd = process.cwd()

  // check for valid CFDN project here <--
  try {
    checkValidProject(cwd, 'build')
  } catch (error) {
    return console.log(error.message)
  }

  const tplDirs = glob.sync(`${cwd}/src/*`)

  const tpls = createTpls(tplDirs)

  return buildTplFiles(cwd, tpls)
}

module.exports = build
