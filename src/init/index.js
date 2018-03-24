const inq = require('inquirer')
const chk = require('chalk')
const fs = require('fs-extra')
const os = require('os')
const addProfile = require('../profiles/add.js')
const validatePkgName = require('validate-npm-package-name')
const ut = require('../utils')
const pkgTpl = require('../tpls/user/package.tpl.json')

const { cyan } = chk

module.exports = async function init () {
  const cwd = process.cwd()
  const home = os.homedir()
  const files = await fs.readdir(cwd)

  if (files.length > 0) {
    return ut.log.e(`${chk.cyan('cfdn init')} should be used in an empty project directory`)
  }

  ut.log.p()

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

  ut.log.i('Creating project files...')

  const pkgjson = Object.assign({ name: project.name }, pkgTpl)
  fs.writeJsonSync(`${cwd}/package.json`, pkgjson, { spaces: 2, errorOnExist: true })
  fs.ensureDirSync(`${cwd}/src`)
  fs.copySync(`${__dirname}/../tpls/base/README.md`, `${cwd}/README.md`, { errorOnExist: true })
  fs.copySync(`${__dirname}/../tpls/base/gitignore`, `${cwd}/.gitignore`, { errorOnExist: true })

  if (vpc.use) fs.copySync(`${__dirname}/../tpls/vpc`, `${cwd}/src/vpc`, { errorOnExist: true })
  if (rds.use) fs.copySync(`${__dirname}/../tpls/db`, `${cwd}/src/db`, { errorOnExist: true })

  const settings = { project: project.name }

  fs.writeJsonSync(`${cwd}/.cfdnrc`, settings, { spaces: 2, errorOnExist: true })

  if (!fs.existsSync(`${home}/.cfdn/profiles.json`)) {
    ut.log.i(`To ${cyan('validate')}, ${cyan('deploy')}, ${cyan('update')}, and ${cyan('describe')} stacks with ${cyan('cfdn')}, AWS Credentials (Profiles) are needed:`)
  }

  // Always see if they'd like to set up a new profile
  await addProfile()

  ut.log.s(`CloudFoundation project ${cyan(project.name)} successfully created!`, 0)

  return ut.log.i(`For more information and commands run ${cyan('cfdn --help')} or visit url`, 3)
}
