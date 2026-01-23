"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const BaseFormattingRule = require("../../BaseFormattingRule.js");
class StructuralIndentationRule extends BaseFormattingRule.BaseFormattingRule {
  constructor() {
    super(...arguments);
    this.name = "StructuralIndentationRule";
  }
  skipString(source, start, quote) {
    let i = start + 1;
    let newlines = 0;
    const isTemplate = quote === "`";
    while (i < source.length) {
      const char = source[i];
      if (char === "\n") {
        newlines++;
        i++;
        continue;
      }
      if (char === "\\") {
        i += 2;
        continue;
      }
      if (isTemplate && char === "$" && source[i + 1] === "{") {
        i += 2;
        let braceCount = 1;
        while (i < source.length && braceCount > 0) {
          if (source[i] === "\n") {
            newlines++;
          } else if (source[i] === "{") {
            braceCount++;
          } else if (source[i] === "}") {
            braceCount--;
          } else if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
            const result = this.skipString(source, i, source[i]);
            i = result.pos;
            newlines += result.newlines;
            continue;
          }
          i++;
        }
        continue;
      }
      if (char === quote) {
        return { pos: i + 1, newlines };
      }
      i++;
    }
    return { pos: i, newlines };
  }
  isRegexStart(source, index) {
    let i = index - 1;
    while (i >= 0 && (source[i] === " " || source[i] === "	")) {
      i--;
    }
    if (i < 0) return true;
    const char = source[i];
    const regexPreceders = ["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "\n", "return", "case"];
    if (regexPreceders.includes(char)) {
      return true;
    }
    const keywords = ["return", "case", "typeof", "void", "delete", "throw", "in", "instanceof"];
    for (const kw of keywords) {
      if (index >= kw.length && source.substring(index - kw.length, index).endsWith(kw)) {
        return true;
      }
    }
    return false;
  }
  skipRegex(source, start) {
    let i = start + 1;
    let inCharClass = false;
    while (i < source.length) {
      const char = source[i];
      if (char === "\\") {
        i += 2;
        continue;
      }
      if (char === "[") {
        inCharClass = true;
      } else if (char === "]") {
        inCharClass = false;
      } else if (char === "/" && !inCharClass) {
        i++;
        while (i < source.length && /[gimsuy]/.test(source[i])) {
          i++;
        }
        return i;
      } else if (char === "\n") {
        return i;
      }
      i++;
    }
    return i;
  }
  getLineIndentLevel(line, indentWidth) {
    const leadingWhitespace = line.match(/^[\t ]*/)?.[0] || "";
    const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
    const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
    return tabCount + Math.floor(spaceCount / indentWidth);
  }
  startsWithClosingBracket(trimmedLine) {
    return /^[}\])]/.test(trimmedLine);
  }
  findBracketFixes(source, lines, indentWidth) {
    const fixes = [];
    const stack = [];
    const lineIndentCorrections = /* @__PURE__ */ new Map();
    let i = 0;
    let line = 0;
    let column = 0;
    let lineStart = 0;
    const openBrackets = {
      "{": "}",
      "[": "]",
      "(": ")"
    };
    const closeBrackets = {
      "}": "{",
      "]": "[",
      ")": "("
    };
    while (i < source.length) {
      const char = source[i];
      if (char === "\n") {
        line++;
        column = 0;
        lineStart = i + 1;
        i++;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        const result = this.skipString(source, i, char);
        i = result.pos;
        line += result.newlines;
        if (result.newlines > 0) {
          let lastNewline = i - 1;
          while (lastNewline >= 0 && source[lastNewline] !== "\n") {
            lastNewline--;
          }
          lineStart = lastNewline + 1;
        }
        column = i - lineStart;
        continue;
      }
      if (char === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") {
          i++;
        }
        continue;
      }
      if (char === "/" && source[i + 1] === "*") {
        i += 2;
        while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) {
          if (source[i] === "\n") {
            line++;
            lineStart = i + 1;
          }
          i++;
        }
        i += 2;
        column = i - lineStart;
        continue;
      }
      if (char === "/" && this.isRegexStart(source, i)) {
        i = this.skipRegex(source, i);
        column = i - lineStart;
        continue;
      }
      if (openBrackets[char]) {
        const lineIndent = lineIndentCorrections.has(line) ? lineIndentCorrections.get(line) : this.getLineIndentLevel(lines[line], indentWidth);
        stack.push({
          char,
          position: i,
          line,
          lineIndent
        });
      }
      if (closeBrackets[char]) {
        const expectedOpen = closeBrackets[char];
        let matchIndex = -1;
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].char === expectedOpen) {
            matchIndex = j;
            break;
          }
        }
        if (matchIndex !== -1) {
          const openBracket = stack[matchIndex];
          stack.splice(matchIndex, 1);
          if (line !== openBracket.line) {
            const currentIndent = this.getLineIndentLevel(lines[line], indentWidth);
            const trimmedLine = lines[line].trimStart();
            if (this.startsWithClosingBracket(trimmedLine)) {
              if (currentIndent !== openBracket.lineIndent) {
                fixes.push({
                  position: i,
                  line,
                  column,
                  targetIndent: openBracket.lineIndent
                });
                if (!lineIndentCorrections.has(line)) {
                  lineIndentCorrections.set(line, openBracket.lineIndent);
                }
              }
            }
          }
        }
      }
      i++;
      column++;
    }
    return fixes;
  }
  apply(source, filePath) {
    const config = this.getCodeStyleConfig();
    if (!config?.indentStyle || !config.indentWidth) {
      return source;
    }
    const indentWidth = config.indentWidth;
    const indentUnit = config.indentStyle === "tab" ? "	" : " ".repeat(indentWidth);
    const lines = source.split("\n");
    const fixes = this.findBracketFixes(source, lines, indentWidth);
    if (fixes.length === 0) {
      return source;
    }
    const fixesByLine = /* @__PURE__ */ new Map();
    for (const fix of fixes) {
      if (!fixesByLine.has(fix.line)) {
        fixesByLine.set(fix.line, []);
      }
      fixesByLine.get(fix.line).push(fix);
    }
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const lineFixes = fixesByLine.get(i);
      if (lineFixes && lineFixes.length > 0) {
        lineFixes.sort((a, b) => a.column - b.column);
        const primaryFix = lineFixes[0];
        const trimmedLine = lines[i].trimStart();
        const newIndent = indentUnit.repeat(primaryFix.targetIndent);
        result.push(newIndent + trimmedLine);
      } else {
        result.push(lines[i]);
      }
    }
    return result.join("\n");
  }
}
exports.StructuralIndentationRule = StructuralIndentationRule;
