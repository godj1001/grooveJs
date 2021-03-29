export function createCompilerCreator (baseCompile) {
  return function createCompiler(baseOptions){
    function compile(template,options) {
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      let warn = (msg ,range,tip) => {
        (tip? tips: errors).push(msg)
      }

      if (options){
        if (options.modules){
          finalOptions.modules = (baseOptions.modules || []).concat(options.modules)
        }
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }
      finalOptions.warn = warn

      const compiled = baseCompile(template.trim(),finalOptions)
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }
    return {
      compile,
      // compileToFunctions: createCompileToFunctionFn(compile())
    }
  }
}
