const inq = require('inquirer')
const chk = require('chalk')
const fse = require('fs-extra')
const pkgTpl = require('../tpls/user/package.json')

module.exports = async function init (env, opts) {
  const cwd = process.cwd()
  const { log } = console
  let answers
  let extras
  let files
  let aws

  try {
    files = await fse.readdir(cwd)
  } catch (err) {
    return log(err)
  }

  if ((files.length === 1 && files[0] !== '.git') || files.length > 1) {
    return log(`${chk.red('error')}: cfdn init should be used in an empty project directory`)
  }

  log()

  try {
    answers = await inq.prompt([
      {
        type: 'input',
        name: 'project',
        message: 'What is the name of your project?',
        default: 'CloudFoundation Project',
      },
      {
        type: 'confirm',
        name: 'vpc',
        message: 'Would you like a production VPC?',
        default: true,
      },
    ])
  } catch (err) {
    return log(err)
  }

  if (answers && answers.vpc) {
    try {
      extras = await inq.prompt([
        {
          type: 'confirm',
          name: 'rds',
          message: 'Would you like an encrypted, multi-AZ RDS Aurora Database?',
          default: true,
        },
      ])
    } catch (err) {
      return log(err)
    }
  }
  if (answers) {
    try {
      aws = await inq.prompt([
        {
          type: 'confirm',
          name: 'check',
          message: 'Would you like to set up your project for deploys, updates, and validation with AWS?',
          default: true,
        },
      ])
    } catch (err) {
      return log(err)
    }
  }

  if (aws.check) {
    try {
      aws = await inq.prompt([
        {
          type: 'input',
          name: 'accessKey',
          message: 'What\'s your AWS ACCESS_KEY?',
        },
        {
          type: 'input',
          name: 'secretKey',
          message: 'What\'s your AWS SECRET_KEY?',
        },
        {
          type: 'input',
          name: 'region',
          message: 'What region do you want to do deploys, updates, and validations in?',
          default: 'us-east-1',
        },
      ])
    } catch (err) {
      return log(err)
    }
  }

  const pkgjson = Object.assign({ name: answers.project }, pkgTpl)
  try {
    await fse.copy(`${__dirname}/../tpls/base`, cwd, { errorOnExist: true })
    await fse.writeFile(`${cwd}/package.json`, JSON.stringify(pkgjson, null, '  '), 'utf8')

    if (answers.vpc) await fse.copy(`${__dirname}/../tpls/vpc`, `${cwd}/src/vpc`, { errorOnExist: true })
    if (extras.rds) await fse.copy(`${__dirname}/../tpls/db`, `${cwd}/src/db`, { errorOnExist: true })

    const rcfile = { PROJECT: answers.project }

    if (aws && aws.accessKey) {
      rcfile.AWS_ACCESS_KEY_ID = aws.accessKey
      rcfile.AWS_SECRET_ACCESS_KEY = aws.secretKey
      rcfile.AWS_REGION = aws.region
    }

    await fse.appendFile(`${cwd}/.cfdnrc`, JSON.stringify(rcfile, null, '  '), { errorOnExist: true })
  } catch (err) {
    return log(err)
  }

  log()
  log(chk.bold.green('CloudFoundation Project Successfully Scaffolded!\n'))
  if (answers.vpc) {
    log(chk.whiteBright(`The template ${chk.cyan('vpc')} is available in ${chk.cyan('src/')}`))
    if (extras.rds) log(chk.whiteBright(`The template ${chk.cyan('db')} is available in ${chk.cyan('src/')}\n`))
  }
  log(chk.whiteBright(`Initialize your own template by running ${chk.cyan('cfdn create <templatename>')}\n`))
  log(chk.whiteBright(`To build the templates run ${chk.cyan('cfdn build')}\n`))
  // TODO insert github and post URLs
  return log(chk.whiteBright(`For more information run ${chk.cyan('cfdn --help')} or visit url\n`))
}
