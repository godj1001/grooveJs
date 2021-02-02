import cssParse from './css'
import vnode from './vnode'
import observe from './react'
import getHashCode from '../util/hash'
import Watcher from './watch'
export default class Component {
  constructor(el,template,jsCode,css) {
    this.hashCode = getHashCode()
    this.root = el
    this.ast = vnode(template,this.hashCode)
    this.cssDom = cssParse(css,this.hashCode)
    this.dataReact = observe(jsCode.data())
    this.watcher = {}
    this.method = jsCode.method ? jsCode.method: {}
    this.createFn = jsCode.create? jsCode.create : this.emptyFn
    this.createFn()
    this.render()
  }
  emptyFn = () => {

  }
  patchCss (cssDom) {
    const style1 = document.createElement('style')
    style1.setAttribute('type', 'text/css')
    style1.innerHTML = cssDom
    document.head.appendChild(style1)
  }

  patch (ast) {
    if (ast.type === 2) {
      console.log(ast)
      let text = ast.tokens.reduce((str,t) => {
        if (typeof t !== 'string'){
          // console.log(this.watcher.get())
          let val
          if (!this.watcher[`value.${t['@binding']}`]){
            const attrName = 'value.'+ t['@binding']
            this.watcher[attrName] = new  Watcher(this.dataReact,attrName,this)
          }
          console.log(this.watcher)
          val = this.watcher[`value.${t['@binding']}`].get()
          str+= val
        }else {
          str+=t
        }
        return str
      },'')
      return { type: 'text', text }
    }
    const el = document.createElement(ast.tag)
    for (const attrs of ast.attrsList) {
      let value = attrs.value
      if (attrs.name === 'onmouseup'){
        el.addEventListener('mouseup',this.method[value].bind(this))
        continue
      }
      el.setAttribute(attrs.name, value)
    }
    el.setAttribute(`data-g-${ast.hashCode}`, '')
    if (ast.children) {
      for (const child of ast.children) {
        const childEl = this.patch(child)
        if (childEl.type === 'node') {
          el.appendChild(childEl.el)
        } else {
          el.textContent = childEl.text
        }
      }
    }
    return { type: 'node', el }
  }

  render(){
    // this.watcher = new Watcher(this.dataReact,'value.name',this)
    this.patchCss(this.cssDom)
    this.root.appendChild(this.patch(this.ast).el)

  }
  update(){
    this.root.innerHTML = ''
    this.render()
  }
}
