import {parseFilters} from './filterParser'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

export function parseText(text) {
  const tagRE = defaultTagRE
  if (!tagRE.test(text)){
    return
  }
  const tokens = []
  const rawTokens= []
  let lastIndex = tagRE.lastIndex = 0
  let match,index,tokenValue
  // eslint-disable-next-line no-cond-assign
  while((match = tagRE.exec(text))){
    index = match.index
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex,index))
      tokens.push(JSON.stringify(tokenValue))
    }
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({'@binding': exp})
    lastIndex = index+ match[0].length
  }
  if (lastIndex < text.length ){
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
