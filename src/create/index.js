const inq = require('inquirer')
const chk = require('chalk')
const fse = require('fs-extra')

const { log } = require('../utils')

module.exports = async function create (env) {
  const cwd = process.cwd()
  let settings = { templatename: env }

  if (!settings.templatename) {
    log.p()
    try {
      settings = await inq.prompt([
        {
          type: 'input',
          name: 'templatename',
          message: 'What is the name of your new template?',
          default: 'main',
        },
      ])
    } catch (error) {
      return log.e(error.message)
    }
  }

  const dir = `${cwd}/src/${settings.templatename}`

  if (fse.existsSync(dir)) {
    return log.e(`Template ${chk.cyan(`${settings.templatename}`)} already exists!`)
  }

  try {
    await fse.copy(`${__dirname}/../tpls/new`, dir, { errorOnExist: true })

    const desc = {
      Description: `${settings.templatename} cloudformation template template`,
    }
    await fse.writeJSON(`${dir}/description.json`, desc, { spaces: 2 })
  } catch (error) {
    return log.e(error.message)
  }

  log.p()
  log.s(`Template ${chk.cyan(`${settings.templatename}`)} template created!`)
  return log.p()
}
