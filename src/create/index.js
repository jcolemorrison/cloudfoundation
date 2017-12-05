const inq = require('inquirer')
const chk = require('chalk')
const fse = require('fs-extra')
const { checkValidProject } = require('../utils')

module.exports = async function create (env) {
  const cwd = process.cwd()
  const { log } = console
  let settings = { stackname: env }

  try {
    checkValidProject('create [stackname]')
  } catch (error) {
    return log(error.message)
  }

  if (!settings.stackname) {
    log()
    try {
      settings = await inq.prompt([
        {
          type: 'input',
          name: 'stackname',
          message: 'What is the name of your new stack?',
          default: 'main',
        },
      ])
    } catch (error) {
      return log(error)
    }
  }

  const dir = `${cwd}/src/${settings.stackname}`

  if (fse.existsSync(dir)) {
    return log(`${chk.red('error')}: stack ${chk.cyan(`${settings.stackname}`)} already exists!`)
  }

  try {
    await fse.copy(`${__dirname}/../tpls/new`, dir, { errorOnExist: true })

    const desc = {
      Description: `${settings.stackname} cloudformation stack template`,
    }
    await fse.writeJSON(`${dir}/description.json`, desc, { spaces: 2 })
  } catch (error) {
    return log(error)
  }

  log()
  log(`${chk.green('success')}: stack ${chk.cyan(`${settings.stackname}`)} template created!`)
  return log()
}
