import {popTarget, pushTarget} from './dep'
import {parsePath} from '../util/lang'
class Watcher {
  getter
  constructor(vm, expOrFn,component) {
    this.vm = vm
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.getter = parsePath(expOrFn)
    this.value = this.get()
    this.component = component
  }
  get(){
    pushTarget(this)
    let value
    const vm = this.vm
    try{
      value = this.getter.call(vm,vm)
    } finally {
      popTarget()
      this.cleanupDeps()
    }
    return value
  }
  setValue(value){
    this.value = value
  }
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }
  addDep(dep){
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
        console.log('添加依赖',dep)
      }
    }
  }
  update(){

    console.log('update')
    console.log(this.get())
    this.component.update()
  }
}

export default Watcher
