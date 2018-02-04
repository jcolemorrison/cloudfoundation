const inq = require('inquirer')
const chk = require('chalk')
const fs = require('fs-extra')
const os = require('os')
const addProfile = require('../profiles/add.js')
const validatePkgName = require('validate-npm-package-name')
const {
  log,
  hasConfiguredCfdn,
} = require('../utils')

const { hasAWSCreds } = require('../utils/aws')

const pkgTpl = require('../tpls/user/package.tpl.json')

const { cyan, gray } = chk

async function initOld () {
  const cwd = process.cwd()
  const home = os.homedir()
  let answers
  let extras
  let aws
  let importAWS = false

  const files = await fs.readdir(cwd)

  if (files.length > 0) {
    return log.e(`${chk.cyan('cfdn init')} should be used in an empty project directory`, 2)
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

module.exports = async function init () {
  const cwd = process.cwd()
  const home = os.homedir()
  const files = await fs.readdir(cwd)

  if (files.length > 0) {
    return log.e(`${chk.cyan('cfdn init')} should be used in an empty project directory`)
  }

  log.p()

  const project = await inq.prompt({
    type: 'input',
    name: 'name',
    message: 'What is the name of your new project?',
    default: 'cloudfoundation-project',
    validate: (input) => {
      const { validForOldPackages, validForNewPackages } = validatePkgName(input)

      if (validForOldPackages && validForNewPackages) return true

      return 'Invalid Project Name Format - must follow NPM package naming conventions'
    },
  })

  const vpc = await inq.prompt({
    type: 'confirm',
    name: 'use',
    message: 'Would you like a production VPC template included?',
    default: true,
  })

  const rds = vpc.use && await inq.prompt({
    type: 'confirm',
    name: 'use',
    message: 'Would you like an encrypted, multi-AZ RDS Aurora Database template included?',
    default: true,
  })

  log.i('Creating project files...')

  const pkgjson = Object.assign({ name: project.name }, pkgTpl)
  fs.writeJsonSync(`${cwd}/package.json`, pkgjson, { spaces: 2, errorOnExist: true })
  fs.copySync(`${__dirname}/../tpls/base/src`, cwd, { errorOnExist: true })
  fs.copySync(`${__dirname}/../tpls/base/README.md`, `${cwd}/README.md`, { errorOnExist: true })
  fs.copySync(`${__dirname}/../tpls/base/gitignore`, `${cwd}/.gitignore`, { errorOnExist: true })

  if (vpc.use) fs.copySync(`${__dirname}/../tpls/vpc`, `${cwd}/src/vpc`, { errorOnExist: true })
  if (rds.use) fs.copySync(`${__dirname}/../tpls/db`, `${cwd}/src/db`, { errorOnExist: true })

  const settings = { project: project.name }

  fs.writeJsonSync(`${cwd}/.cfdnrc`, settings)

  // This should actually come after we start the initial shit then.
  if (!fs.existsSync(`${home}/.cfdn/profiles.json`)) {
    log.i(`To ${cyan('validate')}, ${cyan('deploy')}, ${cyan('update')}, and ${cyan('describe')} stacks with ${cyan('cfdn')}, AWS Credentials (Profiles) are needed:`)
  }

  // Always see if they'd like to set up a new profile
  await addProfile()

  log.s(`CloudFoundation project ${cyan(project.name)} successfully created!`, 0)

  return log.i(`For more information and commands run ${chk.cyan('cfdn --help')} or visit url`, 3)
}
