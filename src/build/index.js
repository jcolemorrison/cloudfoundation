const fs = require('fs-extra')
const glob = require('glob')
const chk = require('chalk')

const { inquireTemplateName, log, getTemplateAsObject } = require('../utils')

exports._buildTemplate = function buildTemplate (name) {
  const cwd = process.cwd()

  try {
    const templateObject = getTemplateAsObject(name)
    const dist = `${cwd}/dist`
    fs.ensureDirSync(dist)

    const full = JSON.stringify(templateObject, null, '  ')
    const min = JSON.stringify(templateObject)

    fs.writeFileSync(`${dist}/${name}.json`, full, 'utf8')
    fs.writeFileSync(`${dist}/${name}.min.json`, min, 'utf8')
  } catch (error) {
    throw error
  }
}

exports.build = async function buildOne (env) {
  let name = env

  if (!name) {
    try {
      name = await inquireTemplateName()
    } catch (error) {
      return log.e(error.message)
    }
  }

  log.p()
  log.i(`Building template ${chk.cyan(name)}...\n`)

  try {
    exports._buildTemplate(name)
  } catch (error) {
    return log.e(chk.red(error.message))
  }

  return log.s(chk.green(`Template ${chk.cyan(`${name}.json`)} and ${chk.cyan(`${name}.min.json`)} built in ${chk.cyan('./dist')}!\n`))
}

exports.buildAll = function buildAll () {
  const cwd = process.cwd()
  log.p()
  log.i('Building all templates...\n')
  let names
  try {
    names = glob.sync(`${cwd}/src/*`).map((s) => {
      const p = s.split('/')
      return p[p.length - 1]
    })
    names.forEach((n) => {
      try {
        exports._buildTemplate(n)
      } catch (error) {
        throw error
      }
    })
  } catch (error) {
    return log.e(chk.red(error.message))
  }

  log.s(chk.green('The following templates were successfully built\n'))
  names.forEach(n => log.m(`${chk.cyan(`${n}.json`)} and ${chk.cyan(`${n}.min.json`)}`))
  log.p()
  return log.i(`Find the built templates in ${chk.cyan('./dist')}\n`)
}

