import parse from './parse'
import {optimize} from './optimizer'
import {createCompilerCreator} from './createCompiler'
import {generate} from './gengerate'

export const createCompiler =  createCompilerCreator(function(template,options) {
  const ast = parse(template,options)
  if (options.optimize !== false){
    optimize(ast,options)
  }
  const code = generate(ast,options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
