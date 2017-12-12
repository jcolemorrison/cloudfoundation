const inq = require('inquirer')
const chk = require('chalk')
const fse = require('fs-extra')

module.exports = async function create (env) {
  const cwd = process.cwd()
  const { log } = console
  let settings = { templatename: env }

  if (!settings.templatename) {
    log()
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
      return log(error)
    }
  }

  const dir = `${cwd}/src/${settings.templatename}`

  if (fse.existsSync(dir)) {
    return log(`${chk.red('error')}: template ${chk.cyan(`${settings.templatename}`)} already exists!`)
  }

  try {
    await fse.copy(`${__dirname}/../tpls/new`, dir, { errorOnExist: true })

    const desc = {
      Description: `${settings.templatename} cloudformation template template`,
    }
    await fse.writeJSON(`${dir}/description.json`, desc, { spaces: 2 })
  } catch (error) {
    return log(error)
  }

  log()
  log(`${chk.green('success')}: template ${chk.cyan(`${settings.templatename}`)} template created!`)
  return log()
}
