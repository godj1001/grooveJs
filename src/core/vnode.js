import {parseText} from './textParser'

const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const commentReg = /^<!\\--/
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const attribute = /^\s*([^\s"'<>\\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const conditionalComment = /^<!\[/
const reCache = {}
const isPlainTextElement = makeMap('script,style,textarea', true)

function makeMap (
  str,
  expectsLowerCase
) {
  const map = Object.create(null)
  const list = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

const createASTElement = (tag, attrs, parent) => {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    rawAttrsMap: {},
    parent,
    children: []
  }
}
function vnode (html, hashCode) {
  let currentParent
  let root
  const stack = []
  function closeElement (element) {
    if (!currentParent) return
    currentParent.children.push(element)
    element.parent = currentParent
  }
  function start (tag, attrs) {
    const element = createASTElement(tag, attrs, currentParent)
    if (!root) {
      element.hashCode = hashCode
      root = element
    }
    if (!element.hashCode) {
      element.hashCode = root.hashCode
    }
    currentParent = element

    stack.push(element)
  }
  function chars (text) {
    const children = currentParent.children
    if (text) {
      let res
      let child
      // eslint-disable-next-line no-cond-assign
      if (text !== ' '&& (res = parseText(text))) {
        console.log(res)
        child = {
          type: 2,
          expression: res.expression,
          tokens: res.tokens,
          text
        }
      } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
        child = {
          type: 3,
          text
        }
      }
      if (child) {
        children.push(child)
      }
    }
  }
  function end () {
    // 子
    const element = stack[stack.length - 1]
    stack.length -= 1
    // 父
    currentParent = stack[stack.length - 1]
    closeElement(element)
  }
  function comment (text) {
    if (currentParent) {
      const child = {
        type: 3,
        text,
        isComment: true
      }
      currentParent.children.push(child)
    }
  }
  function parse (html, options) {
    const stack = []
    let lastTag
    let index = 0

    while (html) {
      if (!lastTag || !isPlainTextElement(lastTag)) {
        let textEnd = html.indexOf('<')
        if (textEnd === 0) {
          if (commentReg.test(html)) {
            const commentEnd = html.indexOf('-->')
            if (commentEnd >= 0) {
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
              advance(commentEnd + 3)
              continue
            }
          }
          const endTagMatch = html.match(endTag)
          if (endTagMatch) {
            const curIndex = index
            advance(endTagMatch[0].length)
            parseEndTag(endTagMatch[1], curIndex, index)
            continue
          }

          const startTagMatch = parseStartTag()
          if (startTagMatch) {
            handleStartTag(startTagMatch)
            continue
          }
        }
        let text, rest, next
        if (textEnd >= 0) {
          rest = html.slice(textEnd)
          while (!endTag.test(rest) &&
              !startTagOpen.test(rest) &&
              !comment.test(rest) &&
              !conditionalComment.test(rest)) {
            next = rest.indexOf('<', 1)
            if (next < 0) break
            textEnd += next
            rest = html.slice(textEnd)
          }
          text = html.substring(0, textEnd)
        }
        if (textEnd < 0) {
          text = html
        }

        if (text) {
          advance(text.length)
        }
        options.chars(text, index - text.length, index)
      } else {
        let endTagLength = 0
        const stackedTag = lastTag.toLowerCase()
        const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
        const rest = html.replace(reStackedTag, function (all, text, endTag) {
          endTagLength = endTag.length
          options.chars(text)
          return ''
        })
        index += html.length - rest.length
        html = rest
        parseEndTag(stackedTag, index - endTagLength, index)
      }
    }
    console.log(stack, html, index, reCache)

    function advance (n) {
      index += n
      html = html.substring(n)
    }
    function parseEndTag (tagName, start, end) {
      let pos, lowerCasedTagName
      if (start == null) start = index
      if (end == null) end = index

      // Find the closest opened tag of the same type
      if (tagName) {
        lowerCasedTagName = tagName.toLowerCase()
        for (pos = stack.length - 1; pos >= 0; pos--) {
          if (stack[pos].lowerCasedTag === lowerCasedTagName) {
            break
          }
        }
      } else {
        // If no tag name is provided, clean shop
        pos = 0
      }

      if (pos >= 0) {
        for (let i = stack.length - 1; i >= pos; i--) {
          options.end(stack[i].tag, start, end)
        }
        stack.length = pos
        lastTag = pos && stack[pos - 1].tag
      }
    }
    function parseStartTag () {
      const start = html.match(startTagOpen)
      if (start) {
        const match = {
          tagName: start[1],
          attrs: [],
          start: index
        }
        advance(start[0].length)
        let end, attr
        // eslint-disable-next-line no-cond-assign
        while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
          attr.start = index
          advance(attr[0].length)
          attr.end = index
          match.attrs.push(attr)
        }
        if (end) {
          match.unarySlash = end[1]
          advance(end[0].length)
          match.end = index
          return match
        }
      }
    }
    function handleStartTag (match) {
      const tagName = match.tagName
      const l = match.attrs.length
      const attrs = new Array(l)
      for (let i = 0; i < l; i++) {
        let args = match.attrs[i]
        if (args[1] === '@click'){
          args[1] = 'onmouseup'
        }
        const value = args[3] || args[4] || args[5] || ''
        attrs[i] = {
          name: args[1],
          value: value
        }
      }
      console.log(attrs)
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end })
      lastTag = tagName
      options.start(tagName, attrs, false, match.start, match.end)
    }
  }

  parse(html, { start, end, chars, comment })
  console.log('root', root)
  return root
}
// export default vnode
// const html = '<div class="test"><span>hello world</span></div>'
// const root = vnode(html)
// console.log(root)

export default vnode
