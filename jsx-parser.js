import * as fs from "fs";
import { parse } from "node-html-parser";

const JSX_STRING = /\(\s*(<.*)>\s*\)/gs;
const JSX_INTERPOLATION = /\{([a-zA-Z0-9]+)\}/gs;
const QUOTED_STRING = /["|'](.*)["|']/g;

async function parseJSXFile(fileName) {
  let content = await fs.promises.readFile(fileName);
  let str = content.toString();

  let match = JSX_STRING.exec(str);
  if (match) {
    let HTML = match[1] + ">";
    console.log("get the HTML content:");
    console.log(HTML);
    const root = parse(HTML);

    let translated = translate(root.firstChild);
    str = str.replace(HTML, translated);
    await fs.promises.writeFile("output1.js", str);
  }
}

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
  if (root.nodeType == 3) {
    if (root._rawText.trim() === "") {
      return null;
    }
    return parseText(root._rawText);
  }
  let tagName = root.rawTagName;
  let props = getAttrs(root.rawAttrs);
  console.log("Current Props:");
  console.log(props);

  return `MyLib.createElement("${tagName}",${replaceInterpolations(
    JSON.stringify(props, replacer),
    true
  )},${children})`;
}

function parseText(rawText) {
  let interpolation = rawText.match(JSX_INTERPOLATION);
  if (interpolation) {
    console.log("Found interpolation " + interpolation);
    // TODO
    let txt = replaceInterpolations(rawText);
    return `"${txt}"`;
  } else {
    console.log("There was interpolation for " + interpolation);
    return rawText;
  }
}

function getAttrs(rawAttrs) {
  // attrsStr = "className={myClass} ref={myRef}"
  if (rawAttrs.trim() === "") return {};
  let objAttrs = {};
  let parts = rawAttrs.split(" ");
  parts.forEach((part) => {
    const [key, value] = part.split("=");
    console.log(`obj[${key}]==${value}`);
    objAttrs[key] = value;
  });
  return objAttrs;
}

function replacer(key, value) {
  if (key) {
    let result = QUOTED_STRING.exec(value);
    if (result) {
      return parseText(result[1]);
    }
    return value;
  } else {
    return value;
  }
}

function replaceInterpolations(txt, isJSON = false) {
  // 查找 interpolation 有两种情况
  // 第一种是在 props 中，如<div className={myClass} ref={myRef}>
  // 第二种是在文本中，<h1>Hello {name}!</h1>
  // 分别对应着 isOnJSON 的是否
  //  isJSON： txt = "{"className":"{myClass}","ref":"{myRef}"}"
  // isn'tJSON txt ="Hello {name}!"
  let interpolation = null;

  while ((interpolation = JSX_INTERPOLATION.exec(txt))) {
    console.log("fixing interpolation for " + txt);
    console.log("interpolation is " + interpolation);
    if (isJSON) {
      txt = txt.replace(`"{${interpolation[1]}}"`, interpolation[1]);
    } else {
      txt = txt.replace(
        `{${interpolation[1]}}`,
        `" + ` + interpolation[1] + ` + "`
      );
    }
  }
  console.log("The text being fixed is " + txt);
  return txt;
}

(async () => {
  await parseJSXFile("file.jsx");
})();
