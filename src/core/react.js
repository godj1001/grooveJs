import Dep from './dep'
function defineReactive (obj, key, val) {
  let dep = new Dep()
  let property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }
  let getter = property && property.get
  let setter = property && property.set

  let childOb = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      let value = getter ? getter.call(obj) : val
      console.log(Dep)
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
        }
      }
      console.log('被取值')
      return value
    },
    set: function reactiveSetter (newVal) {
      let value = getter ? getter.call(obj) : val
      if (newVal === value) {
        return
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = observe(newVal)
      console.log(dep)
      dep.notify()
    }
  })
}

function observe (value) {
  if (!value ) {
    return
  }

  let ob = new Observer(value)

  return ob
}
class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    this.walk(value)
  }
  walk(obj) {
    let keys = Object.keys(obj)
    for (let i = 0, l = keys.length; i < l; i++) {
      this.convert(keys[i], obj[keys[i]])
    }
  }
  observeArray(items) {
    // 对数组每个元素进行处理
    // 主要是处理数组元素中还有数组的情况
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
  convert(key, val) {
    defineReactive(this.value, key, val)
  }
  addVm(vm) {
    (this.vms || (this.vms = [])).push(vm)
  }
  removeVm(vm) {
    this.vms.$remove(vm)
  }
}

export default observe
