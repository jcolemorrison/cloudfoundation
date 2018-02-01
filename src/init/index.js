const inq = require('inquirer')
const chk = require('chalk')
const fs = require('fs-extra')
const os = require('os')
const { importAWSProfiles, _addProfile } = require('../profiles/utils')
const {
  log,
  hasConfiguredCfdn,
} = require('../utils')

const { hasAWSCreds } = require('../utils/aws')

const pkgTpl = require('../tpls/user/package.json')

const { cyan, gray } = chk

module.exports = async function init () {
  const cwd = process.cwd()
  const home = os.homedir()
  let answers
  let extras
  let aws
  let importAWS = false

  const files = await fs.readdir(cwd)

  if ((files.length === 1 && files[0] !== '.git') || files.length > 1) {
    return log.e(`${chk.cyan('cfdn init')} should be used in an empty project directory`)
  }


  if (!hasConfiguredCfdn(home)) {
    log.i(`To ${cyan('validate')}, ${cyan('deploy')}, ${cyan('update')}, and ${cyan('describe')} stacks with ${cyan('cfdn')}, AWS Credentials (Profiles) are needed:`)

    const choices = [
      {
        name: `Set up a Global Profile ${gray('All Projects')}`,
        value: 'global',
      },
      {
        name: `Set up a Local Profile ${gray('Only This Project')}`,
        value: 'local',
      },
    ]
    const hasAWS = hasAWSCreds(home)

    if (hasAWS) {
      const answer = await inq.prompt([
        {
          type: 'confirm',
          message: 'Import your AWS credentials (profiles) for usage with CFDN?',
          default: true,
          name: 'import',
        },
      ])
      if (answer.import) {
        importAWSProfiles(home)
        importAWS = true
        log.s('AWS credentials imported!')
      }
    }

    try {
      const message = importAWS
        ? 'Set up additional credentials (a profile) for deploys, updates, and validation with AWS?'
        : 'Set up credentials (a profile) for deploys, updates, and validation with AWS?'

      aws = await inq.prompt([
        {
          type: 'confirm',
          name: 'check',
          message,
          default: true,
        },
      ])
    } catch (err) {
      return log.e(err.message)
    }

    log.p()

    if (aws.check) {
      try {
        await _addProfile('default', home)
      } catch (err) {
        return log.e(err.message)
      }
    }

    log.p()
    log.s('Default CFDN profile created for use with AWS!\n')
    log.p('Now let\'s initialize your project...\n')
  }

  try {
    log.p()

    answers = await inq.prompt([
      {
        type: 'input',
        name: 'project',
        message: 'What is the name of your new project?',
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
    return log.e(err.message)
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
      return log.e(err.message)
    }
  }

  try {
    const pkgjson = Object.assign({ name: answers.project }, pkgTpl)
    fs.copySync(`${__dirname}/../tpls/base`, cwd, { errorOnExist: true })
    fs.writeJsonSync(`${cwd}/package.json`, pkgjson, { spaces: 2, errorOnExist: true })

    if (answers.vpc) fs.copySync(`${__dirname}/../tpls/vpc`, `${cwd}/src/vpc`, { errorOnExist: true })
    if (extras.rds) fs.copySync(`${__dirname}/../tpls/db`, `${cwd}/src/db`, { errorOnExist: true })

    const settings = { project: answers.project }

    fs.writeJsonSync(`${cwd}/.cfdnrc`, settings)
  } catch (err) {
    return log.e(err.message)
  }

  log.p()
  log.p(chk.bold.green('CloudFoundation Project Successfully Scaffolded!\n'))
  if (answers.vpc) {
    log.p(chk.whiteBright(`The template ${chk.cyan('vpc')} is available in ${chk.cyan('src/')}`))
    if (extras.rds) log.p(chk.whiteBright(`The template ${chk.cyan('db')} is available in ${chk.cyan('src/')}\n`))
  }
  log.p(chk.whiteBright(`Initialize your own template by running ${chk.cyan('cfdn create <templatename>')}\n`))
  log.p(chk.whiteBright(`To build the templates run ${chk.cyan('cfdn build')}\n`))
  // TODO insert github and post URLs
  return log.p(chk.whiteBright(`For more information run ${chk.cyan('cfdn --help')} or visit url\n`))
}
