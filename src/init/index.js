const inq = require('inquirer')
const chk = require('chalk')
const fs = require('fs-extra')
const os = require('os')
const { _importAWSProfiles, _addProfile } = require('../profiles')
const {
  log,
  hasAWSCreds,
  hasConfiguredCfdn,
} = require('../utils')
const pkgTpl = require('../tpls/user/package.json')

module.exports = async function init (env) {
  const cwd = process.cwd()
  const home = os.homedir()
  let answers
  let extras
  let files
  let aws
  let importAWS = false

  try {
    files = await fs.readdir(cwd)
  } catch (err) {
    return log.e(err.message)
  }

  if ((files.length === 1 && files[0] !== '.git') || files.length > 1) {
    return log.e(`${chk.cyan('cfdn init')} should be used in an empty project directory`)
  }

  log.p()

  if (!hasConfiguredCfdn()) {
    log.p(`To ${chk.cyan('validate')}, ${chk.cyan('deploy')}, and ${chk.cyan('update')} stacks with ${chk.cyan('cfdn')}, AWS Credentials are needed:\n`)
    try {
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
          _importAWSProfiles(home)
          importAWS = true
        }
      }
    } catch (error) {
      return log.e(error.message)
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

    if (aws.check) {
      try {
        await _addProfile('default', home)
      } catch (err) {
        return log.e(err.message)
      }
    }
  }


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

    const settings = { PROJECT: answers.project }
    const profiles = { default: {} }

    if (aws && aws.accessKey) {
      profiles.default.AWS_ACCESS_KEY_ID = aws.accessKey
      profiles.default.AWS_SECRET_ACCESS_KEY = aws.secretKey
      profiles.default.AWS_REGION = aws.region
    }

    // TODO: Change this to write to the user directory, ADD the "cfdn" key to the profiles.  Do not overwrite the AWS one
    // TODO: still write a .cfdnrc file to the project root to keep track of future esttings
    // TODO 12-19: REmove tjhis and just write to a cfdnrc file the project name.
    fs.ensureDirSync(`${cwd}/.cfdn`)
    fs.writeJsonSync(`${cwd}/.cfdn/settings.json`, settings, { spaces: 2, errorOnExist: true })
    fs.writeJsonSync(`${cwd}/.cfdn/profiles.json`, profiles, { spaces: 2, errorOnExist: true })
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
