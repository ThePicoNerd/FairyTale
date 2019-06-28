const fs = require("fs-extra");
const prettier = require("prettier");

const closingSentences = ["Oh, what could happen next?", "That's all."];

const datatypes = {
  boolean: "alive|dead",
  string: `"[^"]*"`,
  wholeNumber: `[0-9]`,
  number: `[0-9]+(\.[0-9]+)?`
};

const punctuation = [".", "!", ":"];
const punctuationRegExp = `(${punctuation.join("|")})`;
const variable = "[A-Za-z]+";

const listItemRegExp = `(-|\\*)`;

datatypes.any = `(${datatypes.number}|${datatypes.boolean}|${datatypes.string}|${datatypes.number}|${variable})`;

const comparison = `${datatypes.any} (not )?was ${datatypes.any}`;
const comparisons = `${comparison}((and|or) ${comparison})*`;

function compile({ source }) {
  // Cleanup
  source = source.replace(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g, " ");
  let lines = source.split("\n");
  let output = "";

  let level = 0;
  let chapter = 0;

  let definedVariables = [{ Narrator: true }]; // Ordered by level

  let state = null;

  output += `func_1()\n\n`;

  for (let lineNumber in lines) {
    let line = lines[lineNumber].replace(/[\r\n]/g, "");
    let tokens = getTokens(line);

    if (line === "Read these books before you read this!") {
      state = "dependencies";
      output += `// DEPENDENCIES\n`;
      continue;
    }

    if (state === "dependencies") {
      if (new RegExp(`${listItemRegExp} .+`, "g").test(line)) {
        let dependency = tokens[1];
        output += `// ${dependency}\n`;
        continue;
      } else {
        state = null;
      }
    }

    if (new RegExp(`^Once upon a time`, "g").test(line)) {
      output += `// ${line}\n`;
      continue;
    }

    if (line === "Characters") {
      state = "characters";
      output += `// CHARACTERS\n`;
      continue;
    }

    if (state === "characters") {
      if (new RegExp(`${listItemRegExp} ${variable}`, "g").test(line)) {
        let character = tokens[1];
        defineVariable(character);
        output += `let ${character};\n`;
        continue;
      } else {
        state = null;
      }
    }

    if (new RegExp(`^Chapter [0-9]+ - ${variable}.*$`, "g").test(line)) {
      if (level !== 0) {
        throw new Error(
          `What kind of tomfoolery is this? There cannot be chapters inside of other chapters.`
        );
      }

      let chapterNumber = parseInt(tokens[1]);

      if (!/[0-9]/g.test(chapterNumber) || chapterNumber !== chapter + 1) {
        throw new Error(
          `This doesn't make any sense... The chapters are out of order!`
        );
      }

      nextLevel();

      // Chapter 1 - Print with a text and a x
      let spec = tokens.slice(5);
      let args = spec.filter(arg => {
        if (["a", "an", "and"].includes(arg)) return false; // Reserved keywords!

        if (!new RegExp(`^${variable}$`).test(arg)) {
          throw new Error(
            `"${arg}" is not a valid character name! Would you like your child to be called that? No, didn't think so!`
          );
        }

        if (!isUndefined(arg)) {
          throw new Error(`They have already met ${arg}!`);
        }

        defineVariable(arg);

        return true;
      });

      let chapterName = tokens[1];

      output += `function func_${chapterName}(${args.join(", ")}) {\n`;
      chapter++;
      continue;
    }

    let parts = line.split(/[,](?=(?:(?:[^"]*"){2})*[^"]*$)/g);

    if (
      new RegExp(
        `This happend as long as ${comparisons}${punctuationRegExp}`
      ).test(line)
    ) {
      let partTokens = getTokens(parts[0]);
      let comparison = convertComparison(
        removePunctuation(partTokens.slice(5).join(" "))
      );
      output += `while (${comparison}) {\n`;
      nextLevel();
      continue;
    }

    if (
      new RegExp(`But then they met ${variable}${punctuationRegExp}`).test(line)
    ) {
      let person = removePunctuation(tokens[4]);
      if (!isUndefined(person)) {
        throw new Error(`They have already met ${person}!`);
      } else {
        defineVariable(person);
      }
      output += `let ${person};\n`;
      continue;
    }

    if (
      new RegExp(`^${variable} said(:?) ${datatypes.any}${punctuationRegExp}$`).test(
        line
      )
    ) {
      let person = tokens[0];
      let said = removePunctuation(tokens.slice(2).join(" "));
      output += `console.log("${person}: " + ${said});\n`;
      continue;
    }

    if (new RegExp(`This happend ${datatypes.number} times:`).test(line)) {
      let iterations = tokens[2];
      let varname = `iterator_${level}`;
      output += `for (let ${varname} = 0; ${varname} < ${iterations}; ${varname}++) {\n`;
      nextLevel();
      continue;
    }

    if (
      new RegExp(
        `^(${variable} r|R)ead chapter [0-9]+.*${punctuationRegExp}$`
      ).test(line)
    ) {
      let takeReturnValue = false;
      let off = 0;
      if (tokens[0] !== "Read") {
        if (isUndefined(tokens[0])) {
          throw new Error(`The person reading a chapter must exist!`);
        }
        off = 1;
        takeReturnValue = true;
      }
      let func = `func_${removePunctuation(tokens[2 + off])}`;
      let spec = tokens.slice(4 + off);
      let args = spec
        .filter(arg => {
          if (["a", "an", "and"].includes(arg)) return false; // Reserved keywords!

          return true;
        })
        .map(arg => {
          let value = removePunctuation(arg);

          if (new RegExp(`^${variable}$`).test(value) && isUndefined(value)) {
            throw new Error(`${value} does not exist!`);
          }

          return parseValue(value);
        });

      output += `${takeReturnValue ? `${tokens[0]} =` : ""}${func}(${args});\n`;
      continue;
    }

    if (
      new RegExp(
        `${variable} became ${datatypes.any}${punctuationRegExp}`
      ).test(line)
    ) {
      let newValue = parseValue(removePunctuation(tokens[2]));
      let varname = tokens[0];
      if (isUndefined(varname)) {
        throw new Error(
          `${varname} can't become anything if they don't exist!`
        );
      }

      output += `${varname} = ${newValue}\n`;
      nextLevel();
      continue;
    }

    if (closingSentences.includes(line)) {
      if (level > 0) {
        output += "}\n";
        previousLevel();
        continue;
      } else {
        throw new Error(
          `What have you done!? You cannot close more blocks than you open (more "}" than "{")!`
        );
      }
    }

    if (
      new RegExp(
        `^And they lived happily ever after${punctuationRegExp}$`
      ).test(line)
    ) {
      output += `console.log("Narrator: End of story.");\n`;
      output += `process.exit(0);\n`;
      continue;
    }

    output += line + "\n";

    function isUndefined(varname) {
      for (let lvl in definedVariables) {
        if (definedVariables[lvl] && definedVariables[lvl][varname]) {
          return false;
        }
      }

      return true;
    }

    function defineVariable(varname) {
      definedVariables[level][varname] = true;
    }

    function nextLevel() {
      level++;
      definedVariables[level] = {};
    }

    function previousLevel() {
      definedVariables[level] = undefined;
      level--;
    }

    function convertComparison(compare) {
      compare = compare.replace(/or/g, "||");
      compare = compare.replace(/and/g, "&&");
      compare = compare.replace(/not was(?=(?:(?:[^"]*"){2})*[^"]*$)/g, "!=");
      compare = compare.replace(/was(?=(?:(?:[^"]*"){2})*[^"]*$)/g, "==");
      let words = compare.split(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g);
      let output = "";

      for (let word of words) {
        if (/^(\|\|)|(\&\&)|(\!\=)|(\=\=)$/g.test(word)) {
          output += word;
          continue;
        }

        output += parseValue(word);
      }

      return output;
    }

    function parseValue(value) {
      if (new RegExp(`^${datatypes.boolean}$`).test(value)) {
        return value === "alive" ? true : false;
      }

      if (new RegExp(`^${variable}$`).test(value)) {
        if (isUndefined(value)) {
          throw new Error(`They haven't met ${value}!`);
        }

        return value;
      }

      return value;
    }
  }

  return prettier.format(output, {
    parser: "babel"
  });
  //return output;
}

function getTokens(line) {
  return line.split(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g);
}

function removePunctuation(sentence) {
  return sentence.replace(
    new RegExp(`[${punctuationRegExp}](?=(?:(?:[^"]*"){2})*[^"]*$)`, "g"),
    ""
  );
}

exports.compile = compile;
