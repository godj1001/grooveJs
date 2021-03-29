import Component from './src/core/component'
// todo recode
export class Groove {
  static instance
  constructor (root,options) {
    if (Groove.instance) {
      return Groove.instance
    } else {
      Groove.instance = this
    }
    this.root = root
    this.options = options
  }

  render () {
    const component = new Component(this.root,this.options.template,this.options.jsCode,this.options.css)
    // component.setValue(dataReact.value.name)
    console.log(component)
  }
}

const appEl = document.getElementById('groove-app')


const css = `
.page{
  height:100vh;
  display:flex;
  align-items:center;
  justify-content: center;
  text-align: center;
  .text-strong{
    height:100px;
    font-size: 60px;
    text-weight: 1600;
    background-image: -webkit-linear-gradient(bottom, blue, #fd8403, yellow); 
    -webkit-background-clip: text; 
    -webkit-text-fill-color: transparent;
  }
}
`
const grooveOption = {
  template : '<div class="page"><span class="text-strong" @click="helloWorld">{{text}} world , {{name}}</span></div>',
  jsCode : {
    data () {
      return {
        name: 'groovejs',
        text: 'hello'
      }
    },
    create(){
      console.log('what is this',this)
    },
    method:{
      helloWorld(){
        console.log(this)
        this.dataReact.value.text = '啦啦啦德玛西亚'
        setTimeout(() => {
          this.dataReact.value.name = 'stellajs'
        },2000)
      }
    }
  },
  css
}
const groove = new Groove(appEl,grooveOption)

groove.render()
