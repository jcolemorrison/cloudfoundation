const cmd = require('commander')

cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(() => {
    console.log('yep')
  })

cmd
  .command('build')
  .description('build down all CloudFormation templates')
  .action(() => {
    console.log('building')
  })

//  cmd
//   .command('*')
//   .action(() => {
//     console.log('thedefault')
//   })

cmd.parse(process.argv)

const validArgs = ['init', 'build']
// console.log(cmd.args,  cmd._execs)
console.log(cmd.args)


if (cmd.args.length === 2) {
  cmd.help()
} else {
  // console.log(cmd)
  // console.log(cmd._execs)
  // console.log(cmd.args)
}