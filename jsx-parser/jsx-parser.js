const { TextNode, parse } = require("./html-parser.js");

// 用于匹配jsx字符串 return(<></>)
const JSX_STRING =
  /<([a-zA-Z][^\s/>]*)(?:\s[^>]*?)?>[\s\S]*?<\/\1>|<([a-zA-Z][^\s/>]*)(?:\s[^>]*?)?\/>/g;
const JSX_INTERPOLATION = /\{([a-zA-Z0-9]+)\}/gs;

function translate(root) {
  if (Array.isArray(root) && root.length == 0) {
    return;
  }
  console.log("Current root");
  console.log(root);
  let children = [];
  if (root.childNodes.length > 0) {
    children = root.childNodes
      .map((node) => translate(node))
      .filter((node) => node != null);
  }
  if (root instanceof TextNode) {
    // 此时可能会出现 hello {world} 这样的需要进行解析的
    if (root.text.trim() === "") {
      return null;
    }
    return parseText(root.text);
  }
  let tagName = root.tagName;
  let props = root.attrs;

  let tmp = stringify(props);

  const isLowerCase = (str) => {
    return "a" <= str[0] && str[0] <= "z";
  };

  return `MiniReact.createElement(${
    isLowerCase(tagName) ? `"${tagName}"` : tagName
  },${tmp},${children})`;
}

function stringify(props) {
  const result = [];
  for (const key in props) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const element = props[key];
      result.push(`${key}:${element}`);
    }
  }
  return `{${result.join(",")}}`;
}

// 对于一个变量应该返回 ${变量}
// 对于一个字符串应该返回 '字符串'
function parseText(rawText) {
  rawText = rawText.replace(/\s+/g, " ").trim();
  let interpolation = rawText.match(JSX_INTERPOLATION);

  if (interpolation) {
    // 如果只有一个插值表达式且没有其他文本，直接返回变量名
    if (rawText.match(/^\{[^}]+\}$/) !== null) {
      return rawText.slice(1, -1);
    }

    // 处理包含插值的文本
    let parts = [];
    let lastIndex = 0;

    while ((interpolation = JSX_INTERPOLATION.exec(rawText))) {
      const [match, variable] = interpolation;
      const position = interpolation.index;

      // 添加插值前的文本（如果存在）
      const beforeText = rawText.slice(lastIndex, position).trim();
      if (beforeText) {
        parts.push(`\`${beforeText}\``);
      }

      // 添加变量
      parts.push(variable);

      lastIndex = position + match.length;
    }

    // 添加最后剩余的文本（如果存在）
    const remainingText = rawText.slice(lastIndex).trim();
    if (remainingText) {
      parts.push(`\`${remainingText}\``);
    }

    return parts.join(",");
  } else {
    // 纯文本，直接返回模板字符串
    return `\`${rawText}\``;
  }
}

function parseJSX(str) {
  let match = null;
  while ((match = JSX_STRING.exec(str))) {
    let HTML = match[0];
    const root = parse(HTML);
    // 这里用 html-parser 解析
    let translated = translate(root.childNodes[0]);
    str = str.replace(HTML, translated);
  }
  return str;
}

module.exports = parseJSX;
