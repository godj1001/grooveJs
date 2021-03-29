import { camelize, no, extend } from '../util/util'

export class CodegenState {
  options
  warn
  transforms
  directives
  maybeComponent
  onceId
  staticRenderFns
  pre
  constructor(options) {
    this.options = options
    this.warn = options.warn
    this.transforms = pluckModuleFunction(options.modules, 'transformCode')
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData')
    this.directives = extend(extend({}), options.directives)
    const isReservedTag = options.isReservedTag || no
    this.maybeComponent = (el) => !!el.component || !isReservedTag(el.tag)
    this.onceId = 0
    this.staticRenderFns = []
    this.pre = false
  }
}

export function generate(ast,options) {
  const state = new CodegenState(options)
  const code = ast?genElement(ast,state): '_c("div")'
  return{
    render: `with(this){return ${code}`,
    staticRenderFns: state.staticRenderFns
  }
}

export function genElement(el,state) {
  if (el.parent){
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed){
    return genStatic(el,state)
  }else if (el.once && !el.onceProcessed){
    return genOnce(el,state)
  } else if (el.for && !el.forProcessed){
    return genFor(el,state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    let code
    if (el.component){
      code = genComponent(el.component,el,state)
    }else {
      let data
      if (!el.plain || (el.pre && state.maybeComponent(el))){
        data = genData(el,state)
      }
      const children = el.inlineTemplate? null : genChildren(el,state,true)
      code = `_c('${el.tag}'${data?`,${data}`:''}${
        children? `,${children}`:''
      })`
    }
    for (let i = 0;i<state.transforms.length;i++){
      code = state.transforms[i](el,code)
    }
    return code
  }
}

function genStatic(el,state) {
  el.staticProcessed = true
  const originalPreState = state.pre

  if (el.pre){
    state.pre = el.pre
  }

  state.staticRenderFns.push(`with(this){return ${genElement(el,state)}}`)
  state.pre = originalPreState

  return `_m(${
    state.staticRenderFns.length -1
  }${
    el.staticInFor ? ',true':''
  })`
}

function genOnce(el,state) {
  el.onceProcessed = true
  if (el.if && !el.ifProcessed){
    return genIf(el,state)
  }else if (el.staticInFor){
    let key = ''
    let parent = el.parent
    while(parent){
      if (parent.for){
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key){
      return genElement(el,state)
    }
    return `_o(${genElement(el,state)},${state.onceId++},${key})`
  }else {
    return genStatic(el,state)
  }
}

export function genIf(el,state,altGen,altEmpty) {
  el.ifProcessed = true
  return genIfConditions(el.ifConditions.slice(),state,altGen,altEmpty)
}

function genIfConditions(conditions,state,altGen,altEmpty) {
  if (!conditions.length){
    return altEmpty || '_e()'
  }
  const condition = conditions.shift()
  if (condition.exp) {
    return `(${condition.exp})?${
      genTernaryExp(condition.block)
    }:${
      genIfConditions(conditions, state, altGen, altEmpty)
    }`
  } else {
    return `${genTernaryExp(condition.block)}`
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp (el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}
export function genFor (
  el,
  state,
  altGen,
  altHelper
) {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  el.forProcessed = true // avoid recursion
  return `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${(altGen || genElement)(el, state)}` +
    '})'
}
