const cmd = require('commander')
const init = require('./init')
const { build, buildAll } = require('./build')
const create = require('./create')
const validate = require('./validate')
const deploy = require('./deploy')
const update = require('./update')
const deleteStack = require('./delete')
const { describe, describeAll } = require('./describe')
const test = require('./test')
const {
  importProfiles,
  listProfiles,
  addProfile,
  removeProfile,
  updateProfile,
} = require('./profiles')
const { checkValidProject } = require('./utils')


cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(init)

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
  .description('describe a stack created from [templatename] template - include all columns unless at least one is specified')
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
  .description('delete a stack created from [templatename] template')
  .action((e, o) => checkValidProject('delete [templatename]', deleteStack, e, o))

// TODO: write an error catcher for all of the below so there's no unhandled promise rejection shit.
cmd
  .command('import-profiles')
  .description('import profile data from your shared AWS Credentials to use for CloudFoundation')
  .action(importProfiles)

cmd
  .command('list-profiles')
  .description('list all profiles configured to use cfdn with AWS')
  .action(listProfiles)

cmd
  .command('add-profile [name]')
  .description('add a new set of AWS credentials for usage with cfdn')
  .action(addProfile)

cmd
  .command('update-profile [name]')
  .description('update an existing cfdn profile')
  .action(updateProfile)

cmd
  .command('remove-profile [name]')
  .description('remove an existing cfdn profile')
  .action(removeProfile)

cmd
  .command('test')
  .description('test')
  .action(test)

cmd
  .command('add <filepath>')
  .description('add an AWS resource to the specified file')
  .option('-r, --resource [resource]', 'exact name of the CFN resource to add to the file i.e. AWS::EC2::Instance')
  .action((env, options) => {
    console.log(env, options)
  })

cmd.parse(process.argv)

// console.log(process.argv)
// console.log(cmd.args)
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
// console.log(cmd.args,  cmd._execs)

if (cmd.args.length < 1 || validArgs.indexOf(cmd.args[cmd.args.length - 1]._name) === -1) {
  cmd.help()
}
