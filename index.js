import vnode from './src/core/vnode'
import getHashCode from './src/util/hash'
import cssParse from './src/core/css'

const appEl = document.getElementById('groove-app')
class Groove {
  constructor (root, vnode) {
    if (Groove.instance) {
      return Groove.instance
    } else {
      Groove.instance = this
    }
    this.root = root
    this.vnode = vnode
  }

  patch (ast) {
    if (ast.type === 2) {
      return { type: 'text', text: ast.text }
    }
    const el = document.createElement(ast.tag)
    for (const attrs of ast.attrsList) {
      el.setAttribute(attrs.name, attrs.value)
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

  patchCss (cssDom) {
    const style1 = document.createElement('style')
    style1.innerHTML = cssDom
    document.head.appendChild(style1)
  }

  render (htmlString, cssString) {
    const hashCode = getHashCode()
    const ast = vnode(htmlString, hashCode)
    const el = this.patch(ast)
    this.root.appendChild(el.el)

    const cssDom = cssParse(cssString, hashCode)
    console.log(cssDom)
    this.patchCss(cssDom)
  }
}

const groove = new Groove(appEl, vnode)

const css = `
.page{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content: center;
  text-align: center;
  .text-strong{
    height:85px;
    font-size: 50px;
    text-weight: 1600;
    background-image: -webkit-linear-gradient(bottom, blue, #fd8403, yellow); 
    -webkit-background-clip: text; 
    -webkit-text-fill-color: transparent;
  }
}
`
groove.render('<div class="page"><span class="text-strong">hello world , grooveJs</span></div>', css)
