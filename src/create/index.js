const inq = require('inquirer')
const chk = require('chalk')
const fs = require('fs-extra')

const { log } = require('../utils')

module.exports = async function create (env) {
  const cwd = process.cwd()
  let settings = { templatename: env }

  if (!settings.templatename) {
    log.p()
    settings = await inq.prompt({
      type: 'input',
      name: 'templatename',
      message: 'What is the name of your new template?',
      default: 'main',
    })
  }

  const dir = `${cwd}/src/${settings.templatename}`

  if (fs.existsSync(dir)) {
    return log.e(`Template ${chk.cyan(`${settings.templatename}`)} already exists!`)
  }

  await fs.copy(`${__dirname}/../tpls/new`, dir, { errorOnExist: true })

  const desc = {
    Description: `${settings.templatename} cloudformation template template`,
  }

  await fs.writeJSON(`${dir}/description.json`, desc, { spaces: 2 })

  return log.s(`Template ${chk.cyan(`${settings.templatename}`)} template created!`, 2)
}
