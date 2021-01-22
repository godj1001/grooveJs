function tokenize (cssString, hashCode) {
  const lines = cssString.trim().split(/\n/)
  // eslint-disable-next-line array-callback-return
  const tokens = lines.reduce((tokens, line) => {
    const spaces = line.match(/^\s+/) || ['']
    const indent = spaces[0].length
    const input = line.trim()
    let words = input.split(/:/)
    let firstWord = words.shift()
    // eslint-ignore
    const selectorReg = /([0-9a-zA-Z-.#\[\]]+)\{$/
    if (words.length === 0) {
      const result = firstWord.match(selectorReg)
      if (result) {
        tokens.push({
          type: 'selector',
          value: result[1] + `[data-g-${hashCode}]`,
          indent
        })
      }
    } else {
      const type = 'property'
      tokens.push({
        type,
        value: firstWord,
        indent
      })
      // eslint-disable-next-line no-cond-assign
      while (firstWord = words.shift()) {
        firstWord = firstWord.trim()
        const values = firstWord.split(/\s/)
        if (values.length > 1) {
          words = values
          continue
        }
        firstWord = firstWord.replace(/;/, '')
        tokens.push({
          type: 'value',
          value: firstWord,
          indent: 0
        })
      }
    }
    return tokens
    // eslint-disable-next-line no-cond-assign
  }, [])
  console.log(tokens)
  return tokens
}
function cssParse (cssString, hashCode) {
  const tokens = tokenize(cssString, hashCode)
  const ast = { // 定义一个抽象语法树AST对象
    type: 'root', // 根节点
    value: 'root',
    children: [],
    rules: [],
    indent: -1
  }
  const path = [ast] // 将抽象语法树对象放到数组中，即当前解析路径，最后一个元素为父元素
  let parentNode = ast // 将当前根节点作为父节点
  let token
  const variableDict = {} // 保存定义的变量字典
  // 遍历所有的token
  // eslint-disable-next-line no-cond-assign
  while (token = tokens.shift()) {
    if (token.type === 'variableDef') { // 如果这个token是变量定义
      if (tokens[0] && tokens[0].type === 'value') { // 并且如果其下一个token的类型是值定义，那么这两个token就是变量的定义
        const variableValueToken = tokens.shift() // 取出包含变量值的token
        variableDict[token.value] = variableValueToken.value // 将变量名和遍历值放到vDict对象中
      }
      continue
    }

    if (token.type === 'selector') { // 如果是选择器
      const selectorNode = { // 创建一个选择器节点，然后填充children和rules即可
        type: 'selector',
        value: token.value,
        indent: token.indent,
        rules: [],
        children: []
      }
      if (selectorNode.indent > parentNode.indent) { // 当前节点的缩进大于其父节点的缩进，说明当前选择器节点是父节点的子节点
        path.push(selectorNode) // 将当前选择器节点加入到path中，路径变长了，当前选择器节点作为父节点
        parentNode.children.push(selectorNode) // 将当前选择器对象添加到父节点的children数组中
        parentNode = selectorNode // 当前选择器节点作为父节点
      } else { // 缩进比其父节点缩进小，说明是非其子节点，可能是出现了同级的节点
        parentNode = path.pop() // 移除当前路径的最后一个节点
        while (token.indent <= parentNode.indent) { // 同级节点
          parentNode = path.pop() // 拿到其父节点的父节点
        }
        // 找到父节点后，因为父节点已经从path中移除，所以还需要将父节点再次添加到path中
        path.push(parentNode, selectorNode)
        parentNode.children.push(selectorNode) // 找到父节点后，将当前选择器节点添加到父节点children中
        parentNode = selectorNode // 当前选择器节点作为父节点
      }
    }

    if (token.type === 'property') { // 如果是属性节点
      if (token.indent > parentNode.indent) { // 如果该属性的缩进大于父节点的缩进，说明是父节点选择器的样式
        parentNode.rules.push({ // 将样式添加到rules数组中 {property: "border", value:[]}
          property: token.value,
          value: [],
          indent: token.indent
        })
      } else { // 非当前父节点选择器的样式
        parentNode = path.pop() // 取出并移除最后一个选择器节点，拿到当前父节点
        while (token.indent <= parentNode.indent) { // 与当前父节点的缩进比较，如果等于，说明与当前父节点同级，如果小于，则说明比当前父节点更上层
          parentNode = path.pop() // 比当前父节点层次相等或更高，取出当前父节点的父节点，再次循环判其父节点，直到比父节点的缩进大为止
        }
        // 拿到了其父节点
        parentNode.rules.push({ // 将该样式添加到其父选择器节点中
          property: token.value,
          value: [],
          indent: token.indent
        })
        path.push(parentNode) // 由于父节点已从path中移除，需要再次将父选择器添加到path中
      }
      continue
    }

    if (token.type === 'value') { // 如果是值节点
      // 拿到上一个选择器节点的rules中的最后一个rule的value将值添加进去
      parentNode.rules[parentNode.rules.length - 1].value.push(token.value)
      continue
    }

    if (token.type === 'variableRef') { // 如果是变量引用，从变量字典中取出值并添加到父节点样式的value数组中
      parentNode.rules[parentNode.rules.length - 1].value.push(variableDict[token.value])
      continue
    }
  }
  return generate(transform(ast))
}
function transform (ast) {
  const styles = [] // 存放要输出的每一条样式
  function traverse (node, styles, selectorChain) {
    if (node.type === 'selector') { // 如果是选择器节点
      selectorChain = [...selectorChain, node.value] // 解析选择器层级关系，拿到选择器链
      if (node.rules.length > 0) {
        styles.push({
          selector: selectorChain.join(' '),
          rules: node.rules.reduce((rules, rule) => { // 遍历其rules, 拿到当前选择器下的所有样式
            rules.push({ // 拿到该样式规则的属性和属性值并放到数组中
              property: rule.property,
              value: rule.value.join(' '),
              indent: rule.indent
            })
            return rules
          }, []),
          indent: node.indent
        })
      }
    }
    // 遍历根节点的children数组
    for (let i = 0; i < node.children.length; i++) {
      traverse(node.children[i], styles, selectorChain)
    }
  }
  traverse(ast, styles, [])
  return styles
}
function generate (styles) {
  return styles.map(style => { // 遍历每一条样式
    const rules = style.rules.reduce((rules, rule) => { // 将当前样式的所有rules合并起来
      // eslint-disable-next-line no-return-assign
      return rules += `\n${' '.repeat(rule.indent)}${rule.property}:${rule.value};`
    }, '')
    return `${' '.repeat(style.indent)}${style.selector} {${rules}}`
  }).join('\n')
}
export default cssParse
