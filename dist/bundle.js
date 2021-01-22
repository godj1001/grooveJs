
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
  const commentReg = /^<!\\--/;
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
  const startTagOpen = new RegExp(`^<${qnameCapture}`);
  const startTagClose = /^\s*(\/?)>/;
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
  const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
  const attribute = /^\s*([^\s"'<>\\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
  const conditionalComment = /^<!\[/;
  const reCache = {};
  const isPlainTextElement = makeMap('script,style,textarea', true);

  function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(',');

    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }

    return expectsLowerCase ? val => map[val.toLowerCase()] : val => map[val];
  }

  const createASTElement = (tag, attrs, parent) => {
    return {
      type: 1,
      tag,
      attrsList: attrs,
      rawAttrsMap: {},
      parent,
      children: []
    };
  };

  function vnode(html, hashCode) {
    let currentParent;
    let root;
    const stack = [];

    function closeElement(element) {
      if (!currentParent) return;
      currentParent.children.push(element);
      element.parent = currentParent;
    }

    function start(tag, attrs, unary, start, end) {
      const element = createASTElement(tag, attrs, currentParent);

      if (!root) {
        element.hashCode = hashCode;
        root = element;
      }

      if (!element.hashCode) {
        element.hashCode = root.hashCode;
      }

      currentParent = element;
      stack.push(element);
    }

    function chars(text, start, end) {
      const children = currentParent.children;

      if (text) {
        let child;

        if (text !== ' ') {
          child = {
            type: 2,
            expression: text,
            tokens: text,
            text
          };
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          child = {
            type: 3,
            text
          };
        }

        if (child) {
          children.push(child);
        }
      }
    }

    function end(tag, start, end) {
      // 子
      const element = stack[stack.length - 1];
      stack.length -= 1; // 父

      currentParent = stack[stack.length - 1];
      closeElement(element);
    }

    function comment(text, start, end) {
      if (currentParent) {
        const child = {
          type: 3,
          text,
          isComment: true
        };
        currentParent.children.push(child);
      }
    }

    function parse(html, options) {
      const stack = [];
      let lastTag;
      let index = 0;

      while (html) {
        if (!lastTag || !isPlainTextElement(lastTag)) {
          let textEnd = html.indexOf('<');

          if (textEnd === 0) {
            if (commentReg.test(html)) {
              const commentEnd = html.indexOf('-->');

              if (commentEnd >= 0) {
                options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
                advance(commentEnd + 3);
                continue;
              }
            }

            const endTagMatch = html.match(endTag);

            if (endTagMatch) {
              const curIndex = index;
              advance(endTagMatch[0].length);
              parseEndTag(endTagMatch[1], curIndex, index);
              continue;
            }

            const startTagMatch = parseStartTag();

            if (startTagMatch) {
              handleStartTag(startTagMatch);
              continue;
            }
          }

          let text, rest, next;

          if (textEnd >= 0) {
            rest = html.slice(textEnd);

            while (!endTag.test(rest) && !startTagOpen.test(rest) && !comment.test(rest) && !conditionalComment.test(rest)) {
              next = rest.indexOf('<', 1);
              if (next < 0) break;
              textEnd += next;
              rest = html.slice(textEnd);
            }

            text = html.substring(0, textEnd);
          }

          if (textEnd < 0) {
            text = html;
          }

          if (text) {
            advance(text.length);
          }

          options.chars(text, index - text.length, index);
        } else {
          let endTagLength = 0;
          const stackedTag = lastTag.toLowerCase();
          const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
          const rest = html.replace(reStackedTag, function (all, text, endTag) {
            endTagLength = endTag.length;
            options.chars(text);
            return '';
          });
          index += html.length - rest.length;
          html = rest;
          parseEndTag(stackedTag, index - endTagLength, index);
        }
      }

      console.log(stack, html, index, reCache);

      function advance(n) {
        index += n;
        html = html.substring(n);
      }

      function parseEndTag(tagName, start, end) {
        let pos, lowerCasedTagName;
        if (start == null) start = index;
        if (end == null) end = index; // Find the closest opened tag of the same type

        if (tagName) {
          lowerCasedTagName = tagName.toLowerCase();

          for (pos = stack.length - 1; pos >= 0; pos--) {
            if (stack[pos].lowerCasedTag === lowerCasedTagName) {
              break;
            }
          }
        } else {
          // If no tag name is provided, clean shop
          pos = 0;
        }

        if (pos >= 0) {
          for (let i = stack.length - 1; i >= pos; i--) {
            options.end(stack[i].tag, start, end);
          }

          stack.length = pos;
          lastTag = pos && stack[pos - 1].tag;
        }
      }

      function parseStartTag() {
        const start = html.match(startTagOpen);

        if (start) {
          const match = {
            tagName: start[1],
            attrs: [],
            start: index
          };
          advance(start[0].length);
          let end, attr;

          while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
            attr.start = index;
            advance(attr[0].length);
            attr.end = index;
            match.attrs.push(attr);
          }

          if (end) {
            match.unarySlash = end[1];
            advance(end[0].length);
            match.end = index;
            return match;
          }
        }
      }

      function handleStartTag(match) {
        const tagName = match.tagName;
        const l = match.attrs.length;
        const attrs = new Array(l);

        for (let i = 0; i < l; i++) {
          const args = match.attrs[i];
          const value = args[3] || args[4] || args[5] || '';
          attrs[i] = {
            name: args[1],
            value: value
          };
        }

        stack.push({
          tag: tagName,
          lowerCasedTag: tagName.toLowerCase(),
          attrs: attrs,
          start: match.start,
          end: match.end
        });
        lastTag = tagName;
        options.start(tagName, attrs, false, match.start, match.end);
      }
    }

    parse(html, {
      start,
      end,
      chars,
      comment
    });
    console.log('root', root);
    return root;
  } // export default vnode

  // 产生一个hash值，只有数字，规则和java的hashcode规则相同
  function hashCode(str) {
    let h = 0;
    const len = str.length;
    const t = 2147483648;

    for (let i = 0; i < len; i++) {
      h = 31 * h + str.charCodeAt(i);
      if (h > 2147483647) h %= t; // java int溢出则取模
    }
    /* var t = -2147483648 * 2;
     while (h > 2147483647) {
     h += t
     }*/


    return h;
  } // 时间戳来自客户端，精确到毫秒，但仍旧有可能在在多线程下有并发，
  // 尤其hash化后，毫秒数前面的几位都不变化，导致不同日期hash化的值有可能存在相同，
  // 因此使用下面的随机数函数，在时间戳上加随机数，保证hash化的结果差异会比较大

  /*
   ** randomWord 产生任意长度随机字母数字组合
   ** randomFlag-是否任意长度 min-任意长度最小位[固定位数] max-任意长度最大位
   ** 用法  randomWord(false,6);规定位数 flash
   *      randomWord(true,3，6);长度不定，true
   * arr变量可以把其他字符加入，如以后需要小写字母，直接加入即可
   */


  function randomWord(randomFlag, min, max) {
    let str = '';
    let range = min;
    const arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']; // 随机产生

    if (randomFlag) {
      range = Math.round(Math.random() * (max - min)) + min;
    }

    for (let i = 0; i < range; i++) {
      const pos = Math.round(Math.random() * (arr.length - 1));
      str += arr[pos];
    }

    return str;
  } // 获取hashcode


  function getHashCode() {
    // 定义一个时间戳，计算与1970年相差的毫秒数  用来获得唯一时间
    const timestamp = new Date().valueOf();
    const myRandom = randomWord(false, 6);
    const hashcode = hashCode(myRandom + timestamp.toString());
    return hashcode;
  }

  function tokenize(cssString, hashCode) {
    const lines = cssString.trim().split(/\n/); // eslint-disable-next-line array-callback-return

    const tokens = lines.reduce((tokens, line) => {
      const spaces = line.match(/^\s+/) || [''];
      const indent = spaces[0].length;
      const input = line.trim();
      let words = input.split(/:/);
      let firstWord = words.shift(); // eslint-ignore

      const selectorReg = /([0-9a-zA-Z-.#\[\]]+)\{$/;

      if (words.length === 0) {
        const result = firstWord.match(selectorReg);

        if (result) {
          tokens.push({
            type: 'selector',
            value: result[1] + `[data-g-${hashCode}]`,
            indent
          });
        }
      } else {
        const type = 'property';
        tokens.push({
          type,
          value: firstWord,
          indent
        }); // eslint-disable-next-line no-cond-assign

        while (firstWord = words.shift()) {
          firstWord = firstWord.trim();
          const values = firstWord.split(/\s/);

          if (values.length > 1) {
            words = values;
            continue;
          }

          firstWord = firstWord.replace(/;/, '');
          tokens.push({
            type: 'value',
            value: firstWord,
            indent: 0
          });
        }
      }

      return tokens; // eslint-disable-next-line no-cond-assign
    }, []);
    console.log(tokens);
    return tokens;
  }

  function cssParse(cssString, hashCode) {
    const tokens = tokenize(cssString, hashCode);
    const ast = {
      // 定义一个抽象语法树AST对象
      type: 'root',
      // 根节点
      value: 'root',
      children: [],
      rules: [],
      indent: -1
    };
    const path = [ast]; // 将抽象语法树对象放到数组中，即当前解析路径，最后一个元素为父元素

    let parentNode = ast; // 将当前根节点作为父节点

    let token;
    const variableDict = {}; // 保存定义的变量字典
    // 遍历所有的token
    // eslint-disable-next-line no-cond-assign

    while (token = tokens.shift()) {
      if (token.type === 'variableDef') {
        // 如果这个token是变量定义
        if (tokens[0] && tokens[0].type === 'value') {
          // 并且如果其下一个token的类型是值定义，那么这两个token就是变量的定义
          const variableValueToken = tokens.shift(); // 取出包含变量值的token

          variableDict[token.value] = variableValueToken.value; // 将变量名和遍历值放到vDict对象中
        }

        continue;
      }

      if (token.type === 'selector') {
        // 如果是选择器
        const selectorNode = {
          // 创建一个选择器节点，然后填充children和rules即可
          type: 'selector',
          value: token.value,
          indent: token.indent,
          rules: [],
          children: []
        };

        if (selectorNode.indent > parentNode.indent) {
          // 当前节点的缩进大于其父节点的缩进，说明当前选择器节点是父节点的子节点
          path.push(selectorNode); // 将当前选择器节点加入到path中，路径变长了，当前选择器节点作为父节点

          parentNode.children.push(selectorNode); // 将当前选择器对象添加到父节点的children数组中

          parentNode = selectorNode; // 当前选择器节点作为父节点
        } else {
          // 缩进比其父节点缩进小，说明是非其子节点，可能是出现了同级的节点
          parentNode = path.pop(); // 移除当前路径的最后一个节点

          while (token.indent <= parentNode.indent) {
            // 同级节点
            parentNode = path.pop(); // 拿到其父节点的父节点
          } // 找到父节点后，因为父节点已经从path中移除，所以还需要将父节点再次添加到path中


          path.push(parentNode, selectorNode);
          parentNode.children.push(selectorNode); // 找到父节点后，将当前选择器节点添加到父节点children中

          parentNode = selectorNode; // 当前选择器节点作为父节点
        }
      }

      if (token.type === 'property') {
        // 如果是属性节点
        if (token.indent > parentNode.indent) {
          // 如果该属性的缩进大于父节点的缩进，说明是父节点选择器的样式
          parentNode.rules.push({
            // 将样式添加到rules数组中 {property: "border", value:[]}
            property: token.value,
            value: [],
            indent: token.indent
          });
        } else {
          // 非当前父节点选择器的样式
          parentNode = path.pop(); // 取出并移除最后一个选择器节点，拿到当前父节点

          while (token.indent <= parentNode.indent) {
            // 与当前父节点的缩进比较，如果等于，说明与当前父节点同级，如果小于，则说明比当前父节点更上层
            parentNode = path.pop(); // 比当前父节点层次相等或更高，取出当前父节点的父节点，再次循环判其父节点，直到比父节点的缩进大为止
          } // 拿到了其父节点


          parentNode.rules.push({
            // 将该样式添加到其父选择器节点中
            property: token.value,
            value: [],
            indent: token.indent
          });
          path.push(parentNode); // 由于父节点已从path中移除，需要再次将父选择器添加到path中
        }

        continue;
      }

      if (token.type === 'value') {
        // 如果是值节点
        // 拿到上一个选择器节点的rules中的最后一个rule的value将值添加进去
        parentNode.rules[parentNode.rules.length - 1].value.push(token.value);
        continue;
      }

      if (token.type === 'variableRef') {
        // 如果是变量引用，从变量字典中取出值并添加到父节点样式的value数组中
        parentNode.rules[parentNode.rules.length - 1].value.push(variableDict[token.value]);
        continue;
      }
    }

    return generate(transform(ast));
  }

  function transform(ast) {
    const styles = []; // 存放要输出的每一条样式

    function traverse(node, styles, selectorChain) {
      if (node.type === 'selector') {
        // 如果是选择器节点
        selectorChain = [...selectorChain, node.value]; // 解析选择器层级关系，拿到选择器链

        if (node.rules.length > 0) {
          styles.push({
            selector: selectorChain.join(' '),
            rules: node.rules.reduce((rules, rule) => {
              // 遍历其rules, 拿到当前选择器下的所有样式
              rules.push({
                // 拿到该样式规则的属性和属性值并放到数组中
                property: rule.property,
                value: rule.value.join(' '),
                indent: rule.indent
              });
              return rules;
            }, []),
            indent: node.indent
          });
        }
      } // 遍历根节点的children数组


      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i], styles, selectorChain);
      }
    }

    traverse(ast, styles, []);
    return styles;
  }

  function generate(styles) {
    return styles.map(style => {
      // 遍历每一条样式
      const rules = style.rules.reduce((rules, rule) => {
        // 将当前样式的所有rules合并起来
        // eslint-disable-next-line no-return-assign
        return rules += `\n${' '.repeat(rule.indent)}${rule.property}:${rule.value};`;
      }, '');
      return `${' '.repeat(style.indent)}${style.selector} {${rules}}`;
    }).join('\n');
  }

  const appEl = document.getElementById('groove-app');

  class Groove {
    constructor(root, vnode) {
      if (Groove.instance) {
        return Groove.instance;
      } else {
        Groove.instance = this;
      }

      this.root = root;
      this.vnode = vnode;
    }

    patch(ast) {
      if (ast.type === 2) {
        return {
          type: 'text',
          text: ast.text
        };
      }

      const el = document.createElement(ast.tag);

      for (const attrs of ast.attrsList) {
        el.setAttribute(attrs.name, attrs.value);
      }

      el.setAttribute(`data-g-${ast.hashCode}`, '');

      if (ast.children) {
        for (const child of ast.children) {
          const childEl = this.patch(child);

          if (childEl.type === 'node') {
            el.appendChild(childEl.el);
          } else {
            el.textContent = childEl.text;
          }
        }
      }

      return {
        type: 'node',
        el
      };
    }

    patchCss(cssDom) {
      const style1 = document.createElement('style');
      style1.innerHTML = cssDom;
      document.head.appendChild(style1);
    }

    render(htmlString, cssString) {
      const hashCode = getHashCode();
      const ast = vnode(htmlString, hashCode);
      const el = this.patch(ast);
      this.root.appendChild(el.el);
      const cssDom = cssParse(cssString, hashCode);
      console.log(cssDom);
      this.patchCss(cssDom);
    }

  }

  const groove = new Groove(appEl, vnode);
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
`;
  groove.render('<div class="page"><span class="text-strong">hello world , grooveJs</span></div>', css);

})));
//# sourceMappingURL=bundle.js.map
