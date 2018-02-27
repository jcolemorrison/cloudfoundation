const cmd = require('commander')
const init = require('./init')
const { build, buildAll } = require('./build')
const create = require('./create')
const { validate } = require('./validate')
const { deploy } = require('./deploy')
const { update } = require('./update')
const deleteStack = require('./delete')
const { describe, describeAll } = require('./describe')
const addProfile = require('./profiles/add')
const { listProfiles } = require('./profiles/list')
const updateProfile = require('./profiles/update')
const removeProfile = require('./profiles/remove')
const importProfiles = require('./profiles/import')
const help = require('./help')
const { checkValidProject } = require('./utils')


cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd.on('--help', help)

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action((e, o) => checkValidProject('init', init, e, o, true))

cmd
  .command('build [templatename]')
  .description('build down [templatename] CloudFormation template')
  .action((e, o) => checkValidProject('build [templatename]', build, e, o))

cmd
  .command('build-all')
  .description('build down all CloudFormation templates')
  .action((e, o) => checkValidProject('build-all', buildAll, e, o))

cmd
  .command('create [templatename]')
  .description('create a new template named <templatename>')
  .action((e, o) => checkValidProject('create [templatename]', create, e, o))

cmd
  .command('validate [templatename]')
  .description('validate [templatename] for both valid JSON and CloudFormation syntax')
  .option('-p, --profile <profilename>', 'the AWS or CFDN profile that has the credentials you\'d like to use')
  .action((e, o) => checkValidProject('validate [templatename]', validate, e, o))

cmd
  .command('deploy [templatename]')
  .option('-s, --stackname <stackname>', 'Name of stack to deploy the template as')
  .option('-p, --profile <profilename>', 'the AWS or CFDN profile that has the credentials you\'d like to use')
  .description('deploy [templatename] template as a stack')
  .action((e, o) => checkValidProject('deploy [templatename]', deploy, e, o))

cmd
  .command('update [templatename]')
  .option('-s, --stackname <stackname>', 'Name of stack to update')
  .description('update a stack created from [templatename] template')
  .action((e, o) => checkValidProject('update [templatename]', update, e, o))

cmd
  .command('describe [templatename]')
  .option('-s, --stackname <stackname>', 'Name of stack to describe')
  .option('-a, --status', 'Include the status of the stack')
  .option('-p, --parameters', 'Include the parameters of the stack')
  .option('-i, --info', 'Include the advanced info of the stack')
  .option('-t, --tags', 'Include the tags of the stack')
  .option('-o, --outputs', 'Include the outputs of the stack')
  .description('describe a stack created from [templatename] - include all columns unless at least one specified')
  .action((e, o) => checkValidProject('describe [templatename]', describe, e, o))

cmd
  .command('describe-all [templatename]')
  .option('-p, --profile <profilename>', 'the AWS or CFDN profile with the stacks to describe')
  .option('-r, --region <region>', 'the AWS region with the stacks to describe')
  .description('describe all a stacks created from [templatename] template for a given profile and region')
  .action((e, o) => checkValidProject('describe-all [templatename]', describeAll, e, o))

cmd
  .command('delete [templatename]')
  .option('-s, --stackname <stackname>', 'Name of stack to delete')
  .description('delete a stack created from [templatename] template\n')
  .action((e, o) => checkValidProject('delete [templatename]', deleteStack, e, o))

cmd
  .command('list-profiles')
  .option('-l, --local', 'list profiles local to the current project')
  .option('-g, --global', 'list profiles available for global use')
  .description('list all profiles configured to use cfdn with AWS')
  .action((e, o) => checkValidProject('list-profiles [name]', listProfiles, e, o, true))

cmd
  .command('add-profile [name]')
  .option('-a, --aws', 'import an AWS profile')
  .option('-c, --cfdn', 'add a standalone (CFDN) profile')
  .option('-l, --local', 'add the profile to the current project')
  .option('-g, --global', 'make the profile available for all projects')
  .description('add a new set of AWS credentials for usage with cfdn')
  .action((e, o) => checkValidProject('add-profile [name]', addProfile, e, o, true))

cmd
  .command('update-profile [name]')
  .option('-l, --local', 'update a profile from the local project')
  .option('-g, --global', 'update a profile available for global use')
  .description('update an existing profile')
  .action((e, o) => checkValidProject('update-profile [name]', updateProfile, e, o, true))

cmd
  .command('remove-profile [name]')
  .option('-l, --local', 'update a profile from the local project')
  .option('-g, --global', 'update a profile available for global use')
  .description('remove an existing cfdn profile')
  .action((e, o) => checkValidProject('update-profile [name]', removeProfile, e, o, true))

cmd
  .command('import-profiles')
  .description('import all profile data from your shared AWS Credentials for global use with CloudFoundation')
  .action((e, o) => checkValidProject('import-profiles [name]', importProfiles, e, o, true))

cmd.parse(process.argv)

const validArgs = [
  'init',
  'build',
  'build-all',
  'add',
  'create',
  'validate',
  'deploy',
  'delete',
  'update',
  'describe',
  'describe-all',
  'import-profiles',
  'list-profiles',
  'add-profile',
  'remove-profile',
  'update-profile',
]

if (cmd.args.length < 1 || validArgs.indexOf(cmd.args[cmd.args.length - 1]._name) === -1) {
  cmd.help()
}
