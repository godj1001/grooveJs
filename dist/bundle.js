
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.groove = {}));
}(this, (function (exports) { 'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
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

  /* @flow */
  const validDivisionCharRE = /[\w).+\-_$\]]/;
  function parseFilters(exp) {
    let inSingle = false;
    let inDouble = false;
    let inTemplateString = false;
    let inRegex = false;
    let curly = 0;
    let square = 0;
    let paren = 0;
    let lastFilterIndex = 0;
    let c, prev, i, expression, filters;

    for (i = 0; i < exp.length; i++) {
      prev = c;
      c = exp.charCodeAt(i);

      if (inSingle) {
        if (c === 0x27 && prev !== 0x5C) inSingle = false;
      } else if (inDouble) {
        if (c === 0x22 && prev !== 0x5C) inDouble = false;
      } else if (inTemplateString) {
        if (c === 0x60 && prev !== 0x5C) inTemplateString = false;
      } else if (inRegex) {
        if (c === 0x2f && prev !== 0x5C) inRegex = false;
      } else if (c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C && exp.charCodeAt(i - 1) !== 0x7C && !curly && !square && !paren) {
        if (expression === undefined) {
          // first filter, end of expression
          lastFilterIndex = i + 1;
          expression = exp.slice(0, i).trim();
        } else {
          pushFilter();
        }
      } else {
        switch (c) {
          case 0x22:
            inDouble = true;
            break;
          // "

          case 0x27:
            inSingle = true;
            break;
          // '

          case 0x60:
            inTemplateString = true;
            break;
          // `

          case 0x28:
            paren++;
            break;
          // (

          case 0x29:
            paren--;
            break;
          // )

          case 0x5B:
            square++;
            break;
          // [

          case 0x5D:
            square--;
            break;
          // ]

          case 0x7B:
            curly++;
            break;
          // {

          case 0x7D:
            curly--;
            break;
          // }
        }

        if (c === 0x2f) {
          // /
          let j = i - 1;
          let p; // find first non-whitespace prev char

          for (; j >= 0; j--) {
            p = exp.charAt(j);
            if (p !== ' ') break;
          }

          if (!p || !validDivisionCharRE.test(p)) {
            inRegex = true;
          }
        }
      }
    }

    if (expression === undefined) {
      expression = exp.slice(0, i).trim();
    } else if (lastFilterIndex !== 0) {
      pushFilter();
    }

    function pushFilter() {
      (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
      lastFilterIndex = i + 1;
    }

    if (filters) {
      for (i = 0; i < filters.length; i++) {
        expression = wrapFilter(expression, filters[i]);
      }
    }

    return expression;
  }

  function wrapFilter(exp, filter) {
    const i = filter.indexOf('(');

    if (i < 0) {
      // _f: resolveFilter
      return `_f("${filter}")(${exp})`;
    } else {
      const name = filter.slice(0, i);
      const args = filter.slice(i + 1);
      return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`;
    }
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  function parseText(text) {
    const tagRE = defaultTagRE;

    if (!tagRE.test(text)) {
      return;
    }

    const tokens = [];
    const rawTokens = [];
    let lastIndex = tagRE.lastIndex = 0;
    let match, index, tokenValue; // eslint-disable-next-line no-cond-assign

    while (match = tagRE.exec(text)) {
      index = match.index;

      if (index > lastIndex) {
        rawTokens.push(tokenValue = text.slice(lastIndex, index));
        tokens.push(JSON.stringify(tokenValue));
      }

      const exp = parseFilters(match[1].trim());
      tokens.push(`_s(${exp})`);
      rawTokens.push({
        '@binding': exp
      });
      lastIndex = index + match[0].length;
    }

    if (lastIndex < text.length) {
      rawTokens.push(tokenValue = text.slice(lastIndex));
      tokens.push(JSON.stringify(tokenValue));
    }

    return {
      expression: tokens.join('+'),
      tokens: rawTokens
    };
  }

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

  function parse(html, hashCode) {
    let currentParent;
    let root;
    const stack = [];

    function closeElement(element) {
      if (!currentParent) return;
      currentParent.children.push(element);
      element.parent = currentParent;
    }

    function start(tag, attrs) {
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

    function chars(text) {
      const children = currentParent.children;

      if (text) {
        let res;
        let child; // eslint-disable-next-line no-cond-assign

        if (text !== ' ' && (res = parseText(text))) {
          console.log(res);
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
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

    function end() {
      // 子
      const element = stack[stack.length - 1];
      stack.length -= 1; // 父

      currentParent = stack[stack.length - 1];
      closeElement(element);
    }

    function comment(text) {
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
          let end, attr; // eslint-disable-next-line no-cond-assign

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
          let args = match.attrs[i];

          if (args[1] === '@click') {
            args[1] = 'onmouseup';
          }

          const value = args[3] || args[4] || args[5] || '';
          attrs[i] = {
            name: args[1],
            value: value
          };
        }

        console.log(attrs);
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

  let uid = 0;
  class Dep {
    constructor() {
      this.id = uid++;
      this.subs = [];
    }

    addSub(sub) {
      this.subs.push(sub);
    }

    removeSub(sub) {
      this.subs.$remove(sub);
    }

    depend() {
      Dep.target.addDep(this);
    }

    notify() {
      console.log('notify');
      const subs = this.subs.slice();

      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update();
      }
    }

  }

  _defineProperty(Dep, "target", void 0);

  Dep.target = null;
  const targetStack = [];
  function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target;
    console.log(target, Dep.target);
  }
  function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
  }

  function defineReactive(obj, key, val) {
    let dep = new Dep();
    let property = Object.getOwnPropertyDescriptor(obj, key);

    if (property && property.configurable === false) {
      return;
    }

    let getter = property && property.get;
    let setter = property && property.set;
    let childOb = observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter() {
        let value = getter ? getter.call(obj) : val;
        console.log(Dep);

        if (Dep.target) {
          dep.depend();

          if (childOb) {
            childOb.dep.depend();
          }
        }

        console.log('被取值');
        return value;
      },
      set: function reactiveSetter(newVal) {
        let value = getter ? getter.call(obj) : val;

        if (newVal === value) {
          return;
        }

        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }

        childOb = observe(newVal);
        console.log(dep);
        dep.notify();
      }
    });
  }

  function observe(value) {
    if (!value) {
      return;
    }

    let ob = new Observer(value);
    return ob;
  }

  class Observer {
    constructor(value) {
      this.value = value;
      this.dep = new Dep();
      this.walk(value);
    }

    walk(obj) {
      let keys = Object.keys(obj);

      for (let i = 0, l = keys.length; i < l; i++) {
        this.convert(keys[i], obj[keys[i]]);
      }
    }

    observeArray(items) {
      // 对数组每个元素进行处理
      // 主要是处理数组元素中还有数组的情况
      for (let i = 0, l = items.length; i < l; i++) {
        observe(items[i]);
      }
    }

    convert(key, val) {
      defineReactive(this.value, key, val);
    }

    addVm(vm) {
      (this.vms || (this.vms = [])).push(vm);
    }

    removeVm(vm) {
      this.vms.$remove(vm);
    }

  }

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

  const unicodeRegExp$1 = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
  const bailRE = new RegExp(`[^${unicodeRegExp$1.source}.$_\\d]`);
  function parsePath(path) {
    if (bailRE.test(path)) {
      return;
    }

    console.log('parsePath', path);
    const segments = path.split('.');
    return function (obj) {
      for (let i = 0; i < segments.length; i++) {
        if (!obj) return;
        obj = obj[segments[i]];
      }

      return obj;
    };
  }

  class Watcher {
    constructor(vm, expOrFn, component) {
      _defineProperty(this, "getter", void 0);

      this.vm = vm;
      this.deps = [];
      this.newDeps = [];
      this.depIds = new Set();
      this.newDepIds = new Set();
      this.getter = parsePath(expOrFn);
      this.value = this.get();
      this.component = component;
    }

    get() {
      pushTarget(this);
      let value;
      const vm = this.vm;

      try {
        value = this.getter.call(vm, vm);
      } finally {
        popTarget();
        this.cleanupDeps();
      }

      return value;
    }

    setValue(value) {
      this.value = value;
    }

    cleanupDeps() {
      let i = this.deps.length;

      while (i--) {
        const dep = this.deps[i];

        if (!this.newDepIds.has(dep.id)) {
          dep.removeSub(this);
        }
      }

      let tmp = this.depIds;
      this.depIds = this.newDepIds;
      this.newDepIds = tmp;
      this.newDepIds.clear();
      tmp = this.deps;
      this.deps = this.newDeps;
      this.newDeps = tmp;
      this.newDeps.length = 0;
    }

    addDep(dep) {
      const id = dep.id;

      if (!this.newDepIds.has(id)) {
        this.newDepIds.add(id);

        if (!this.depIds.has(id)) {
          dep.addSub(this);
          console.log('添加依赖', dep);
        }
      }
    }

    update() {
      console.log('update');
      console.log(this.get());
      this.component.update();
    }

  }

  class Component {
    constructor(el, template, jsCode, css) {
      _defineProperty(this, "emptyFn", () => {});

      this.hashCode = getHashCode();
      this.root = el;
      this.ast = parse(template, this.hashCode);
      this.cssDom = cssParse(css, this.hashCode);
      this.dataReact = observe(jsCode.data());
      this.watcher = {};
      this.method = jsCode.method ? jsCode.method : {};
      this.createFn = jsCode.create ? jsCode.create : this.emptyFn;
      this.createFn();
      this.render();
    }

    patchCss(cssDom) {
      const style1 = document.createElement('style');
      style1.setAttribute('type', 'text/css');
      style1.innerHTML = cssDom;
      document.head.appendChild(style1);
    }

    patch(ast) {
      if (ast.type === 2) {
        console.log(ast);
        let text = ast.tokens.reduce((str, t) => {
          if (typeof t !== 'string') {
            // console.log(this.watcher.get())
            let val;

            if (!this.watcher[`value.${t['@binding']}`]) {
              const attrName = 'value.' + t['@binding'];
              this.watcher[attrName] = new Watcher(this.dataReact, attrName, this);
            }

            console.log(this.watcher);
            val = this.watcher[`value.${t['@binding']}`].get();
            str += val;
          } else {
            str += t;
          }

          return str;
        }, '');
        return {
          type: 'text',
          text
        };
      }

      const el = document.createElement(ast.tag);

      for (const attrs of ast.attrsList) {
        let value = attrs.value;

        if (attrs.name === 'onmouseup') {
          el.addEventListener('mouseup', this.method[value].bind(this));
          continue;
        }

        el.setAttribute(attrs.name, value);
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

    render() {
      // this.watcher = new Watcher(this.dataReact,'value.name',this)
      this.patchCss(this.cssDom);
      this.root.appendChild(this.patch(this.ast).el);
    }

    update() {
      this.root.innerHTML = '';
      this.render();
    }

  }

  class Groove {
    constructor(root, options) {
      if (Groove.instance) {
        return Groove.instance;
      } else {
        Groove.instance = this;
      }

      this.root = root;
      this.options = options;
    }

    render() {
      const component = new Component(this.root, this.options.template, this.options.jsCode, this.options.css); // component.setValue(dataReact.value.name)

      console.log(component);
    }

  }

  _defineProperty(Groove, "instance", void 0);

  const appEl = document.getElementById('groove-app');
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
`;
  const grooveOption = {
    template: '<div class="page"><span class="text-strong" @click="helloWorld">{{text}} world , {{name}}</span></div>',
    jsCode: {
      data() {
        return {
          name: 'groovejs',
          text: 'hello'
        };
      },

      create() {
        console.log('what is this', this);
      },

      method: {
        helloWorld() {
          console.log(this);
          this.dataReact.value.text = '啦啦啦德玛西亚';
          setTimeout(() => {
            this.dataReact.value.name = 'stellajs';
          }, 2000);
        }

      }
    },
    css
  };
  const groove = new Groove(appEl, grooveOption);
  groove.render();

  exports.Groove = Groove;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bundle.js.map
