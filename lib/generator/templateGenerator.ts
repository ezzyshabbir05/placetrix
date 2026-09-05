export type ArgType = 
  | "int" 
  | "string" 
  | "boolean" 
  | "double" 
  | "char" 
  | "int[]" 
  | "string[]" 
  | "char[]" 
  | "boolean[]" 
  | "double[]"
  | "int[][]"
  | "string[][]";

export interface SignatureArg {
  name: string;
  type: ArgType;
}

export interface FunctionSignature {
  name: string;
  returnType: ArgType;
  args: SignatureArg[];
}

export interface GeneratedTemplates {
  boilerplates: Record<string, string>;
  driverCodes: Record<string, string>;
}

// Map schema types to language-specific types
const TYPE_MAPS = {
  java: {
    "int": "int",
    "string": "String",
    "boolean": "boolean",
    "double": "double",
    "char": "char",
    "int[]": "int[]",
    "string[]": "String[]",
    "char[]": "char[]",
    "boolean[]": "boolean[]",
    "double[]": "double[]",
    "int[][]": "int[][]",
    "string[][]": "String[][]",
  },
  cpp: {
    "int": "int",
    "string": "string",
    "boolean": "bool",
    "double": "double",
    "char": "char",
    "int[]": "vector<int>",
    "string[]": "vector<string>",
    "char[]": "vector<char>",
    "boolean[]": "vector<bool>",
    "double[]": "vector<double>",
    "int[][]": "vector<vector<int>>",
    "string[][]": "vector<vector<string>>",
  },
  python: {
    "int": "int",
    "string": "str",
    "boolean": "bool",
    "double": "float",
    "char": "str",
    "int[]": "List[int]",
    "string[]": "List[str]",
    "char[]": "List[str]",
    "boolean[]": "List[bool]",
    "double[]": "List[float]",
    "int[][]": "List[List[int]]",
    "string[][]": "List[List[str]]",
  }
};

// Map schema return types to safe dummy values
const DUMMY_RETURNS = {
  java: {
    "int": "return 0;",
    "string": "return \"\";",
    "boolean": "return false;",
    "double": "return 0.0;",
    "char": "return 'a';",
    "int[]": "return new int[0];",
    "string[]": "return new String[0];",
    "char[]": "return new char[0];",
    "boolean[]": "return new boolean[0];",
    "double[]": "return new double[0];",
    "int[][]": "return new int[0][0];",
    "string[][]": "return new String[0][0];",
  },
  cpp: {
    "int": "return 0;",
    "string": "return \"\";",
    "boolean": "return false;",
    "double": "return 0.0;",
    "char": "return 'a';",
    "int[]": "return {};",
    "string[]": "return {};",
    "char[]": "return {};",
    "boolean[]": "return {};",
    "double[]": "return {};",
    "int[][]": "return {};",
    "string[][]": "return {};",
  },
  python: {
    "int": "return 0",
    "string": "return \"\"",
    "boolean": "return False",
    "double": "return 0.0",
    "char": "return \"a\"",
    "int[]": "return []",
    "string[]": "return []",
    "char[]": "return []",
    "boolean[]": "return []",
    "double[]": "return []",
    "int[][]": "return []",
    "string[][]": "return []",
  },
  js: {
    "int": "return 0;",
    "string": "return \"\";",
    "boolean": "return false;",
    "double": "return 0.0;",
    "char": "return \"a\";",
    "int[]": "return [];",
    "string[]": "return [];",
    "char[]": "return [];",
    "boolean[]": "return [];",
    "double[]": "return [];",
    "int[][]": "return [];",
    "string[][]": "return [];",
  }
};

// ---------------------------------------------------------
// Java Generators
// ---------------------------------------------------------
function generateJava(sig: FunctionSignature): { boilerplate: string, driver: string } {
  const args = sig.args.map(a => `${TYPE_MAPS.java[a.type]} ${a.name}`).join(", ");
  const retType = TYPE_MAPS.java[sig.returnType];

  const boilerplate = `class Solution {\n    public ${retType} ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.java[sig.returnType] || "return null;"}\n    }\n}`;

  // Build parsing logic for arguments
  let driverParsing = "";
  const argNames: string[] = [];
  
  for (let i = 0; i < sig.args.length; i++) {
    const a = sig.args[i];
    const argName = `arg${i}`;
    argNames.push(argName);
    
    driverParsing += `        if (!sc.hasNextLine()) {\n`;
    driverParsing += `            System.out.println("@@@LOGICLAB_ERR_START@@@Runtime Error: Missing input for parameter '${a.name}' (#${i+1})@@@LOGICLAB_ERR_END@@@");\n`;
    driverParsing += `            return;\n`;
    driverParsing += `        }\n`;
    driverParsing += `        String line${i} = sc.nextLine().trim();\n`;
    
    if (a.type === "int") {
      driverParsing += `        int ${argName} = Integer.parseInt(line${i});\n`;
    } else if (a.type === "double") {
      driverParsing += `        double ${argName} = Double.parseDouble(line${i});\n`;
    } else if (a.type === "boolean") {
      driverParsing += `        boolean ${argName} = Boolean.parseBoolean(line${i});\n`;
    } else if (a.type === "string") {
      driverParsing += `        if (line${i}.length() >= 2 && line${i}.startsWith("\\"") && line${i}.endsWith("\\"")) line${i} = line${i}.substring(1, line${i}.length() - 1);\n`;
      driverParsing += `        String ${argName} = line${i};\n`;
    } else if (a.type === "int[]") {
      driverParsing += `        String[] parts${i} = parseJsonArray(line${i});\n`;
      driverParsing += `        int[] ${argName} = new int[parts${i}.length];\n`;
      driverParsing += `        for (int j = 0; j < parts${i}.length; j++) ${argName}[j] = Integer.parseInt(parts${i}[j].trim());\n`;
    } else if (a.type === "string[]") {
      driverParsing += `        String[] parts${i} = parseJsonArray(line${i});\n`;
      driverParsing += `        String[] ${argName} = new String[parts${i}.length];\n`;
      driverParsing += `        for (int j = 0; j < parts${i}.length; j++) {\n`;
      driverParsing += `            String t = parts${i}[j].trim();\n`;
      driverParsing += `            if (t.startsWith("\\"") && t.endsWith("\\"")) t = t.substring(1, t.length() - 1);\n`;
      driverParsing += `            ${argName}[j] = t;\n`;
      driverParsing += `        }\n`;
    } else if (a.type === "int[][]") {
      driverParsing += `        String[] rows${i} = parseJsonArray(line${i});\n`;
      driverParsing += `        int[][] ${argName} = new int[rows${i}.length][];\n`;
      driverParsing += `        for (int r = 0; r < rows${i}.length; r++) {\n`;
      driverParsing += `            String[] cols = parseJsonArray(rows${i}[r]);\n`;
      driverParsing += `            ${argName}[r] = new int[cols.length];\n`;
      driverParsing += `            for (int c = 0; c < cols.length; c++) ${argName}[r][c] = Integer.parseInt(cols[c].trim());\n`;
      driverParsing += `        }\n`;
    } else if (a.type === "string[][]") {
      driverParsing += `        String[] rows${i} = parseJsonArray(line${i});\n`;
      driverParsing += `        String[][] ${argName} = new String[rows${i}.length][];\n`;
      driverParsing += `        for (int r = 0; r < rows${i}.length; r++) {\n`;
      driverParsing += `            String[] cols = parseJsonArray(rows${i}[r]);\n`;
      driverParsing += `            ${argName}[r] = new String[cols.length];\n`;
      driverParsing += `            for (int c = 0; c < cols.length; c++) {\n`;
      driverParsing += `                String t = cols[c].trim();\n`;
      driverParsing += `                if (t.startsWith("\\"") && t.endsWith("\\"")) t = t.substring(1, t.length() - 1);\n`;
      driverParsing += `                ${argName}[r][c] = t;\n`;
      driverParsing += `            }\n`;
      driverParsing += `        }\n`;
    } else {
      driverParsing += `        ${TYPE_MAPS.java[a.type]} ${argName} = null;\n`;
    }
  }

  let printLogic = "";
  if (sig.returnType === "int[][]" || sig.returnType === "string[][]") {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + Arrays.deepToString(res).replaceAll(" ", "") + "@@@LOGICLAB_RES_END@@@");\n`;
  } else if (sig.returnType.endsWith("[]")) {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + Arrays.toString(res).replaceAll(" ", "") + "@@@LOGICLAB_RES_END@@@");\n`;
  } else {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + res + "@@@LOGICLAB_RES_END@@@");\n`;
  }

  const driver = `// === Driver Code (hidden from student) ===
import java.util.*;

public class Main {
    public static String[] parseJsonArray(String s) {
        s = s.trim();
        if (s.length() >= 2 && s.startsWith("[")) {
            s = s.substring(1, s.length() - 1);
        }
        if (s.isEmpty()) return new String[0];
        List<String> res = new ArrayList<>();
        int depth = 0;
        boolean inQuotes = false;
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' && (i == 0 || s.charAt(i-1) != '\\\\')) inQuotes = !inQuotes;
            else if (!inQuotes && (c == '[' || c == '{')) depth++;
            else if (!inQuotes && (c == ']' || c == '}')) depth--;
            else if (!inQuotes && depth == 0 && c == ',') {
                res.add(s.substring(start, i).trim());
                start = i + 1;
            }
        }
        res.add(s.substring(start).trim());
        return res.toArray(new String[0]);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
${driverParsing}
        Solution sol = new Solution();
        try {
            ${retType} res = sol.${sig.name}(${argNames.join(", ")});
${printLogic}
        } catch (Throwable t) {
            System.out.println("@@@LOGICLAB_ERR_START@@@" + t.toString() + "@@@LOGICLAB_ERR_END@@@");
        }
    }
}`;

  return { boilerplate, driver };
}

// ---------------------------------------------------------
// C++ Generators
// ---------------------------------------------------------
function generateCpp(sig: FunctionSignature): { boilerplate: string, driver: string } {
  const args = sig.args.map(a => `${TYPE_MAPS.cpp[a.type]}${a.type.includes("[]") || a.type === "string" ? "&" : ""} ${a.name}`).join(", ");
  const retType = TYPE_MAPS.cpp[sig.returnType];

  const boilerplate = `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${retType} ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.cpp[sig.returnType] || "return {};"}\n    }\n};`;

  const parseVectorInt = `
vector<string> parseJsonArray(string s) {
    s = s.empty() ? "" : s;
    while (!s.empty() && (s.front() == ' ' || s.front() == '\\t')) s.erase(s.begin());
    while (!s.empty() && (s.back() == ' ' || s.back() == '\\t')) s.pop_back();
    if (!s.empty() && s.front() == '[') s = s.substr(1);
    if (!s.empty() && s.back() == ']') s.pop_back();
    vector<string> res;
    if (s.empty()) return res;
    int depth = 0;
    bool inQuotes = false;
    size_t start = 0;
    for (size_t i = 0; i < s.length(); i++) {
        char c = s[i];
        if (c == '"' && (i == 0 || s[i - 1] != '\\\\')) inQuotes = !inQuotes;
        else if (!inQuotes && (c == '[' || c == '{')) depth++;
        else if (!inQuotes && (c == ']' || c == '}')) depth--;
        else if (!inQuotes && depth == 0 && c == ',') {
            res.push_back(s.substr(start, i - start));
            start = i + 1;
        }
    }
    res.push_back(s.substr(start));
    return res;
}
`;

  const parseString = `
string parseString(string line) {
    if (line.length() >= 2 && line.front() == '"' && line.back() == '"') return line.substr(1, line.length() - 2);
    return line;
}
`;

  let driverParsing = "";
  const argNames: string[] = [];
  
  for (let i = 0; i < sig.args.length; i++) {
    const a = sig.args[i];
    const argName = `arg${i}`;
    argNames.push(argName);
    
    driverParsing += `    if (!getline(cin, line)) {\n`;
    driverParsing += `        cout << "@@@LOGICLAB_ERR_START@@@Runtime Error: Missing input for parameter '${a.name}' (#${i+1})@@@LOGICLAB_ERR_END@@@" << endl;\n`;
    driverParsing += `        return 0;\n`;
    driverParsing += `    }\n`;

    if (a.type === "int") {
      driverParsing += `    int ${argName} = stoi(line);\n`;
    } else if (a.type === "double") {
      driverParsing += `    double ${argName} = stod(line);\n`;
    } else if (a.type === "boolean") {
      driverParsing += `    bool ${argName} = (line == "true" || line == "1");\n`;
    } else if (a.type === "string") {
      driverParsing += `    string ${argName} = parseString(line);\n`;
    } else if (a.type === "int[]") {
      driverParsing += `    vector<string> parts${i} = parseJsonArray(line);\n`;
      driverParsing += `    vector<int> ${argName};\n`;
      driverParsing += `    for (const string& p : parts${i}) if (!p.empty()) ${argName}.push_back(stoi(p));\n`;
    } else if (a.type === "string[]") {
      driverParsing += `    vector<string> parts${i} = parseJsonArray(line);\n`;
      driverParsing += `    vector<string> ${argName};\n`;
      driverParsing += `    for (const string& p : parts${i}) ${argName}.push_back(parseString(p));\n`;
    } else if (a.type === "int[][]") {
      driverParsing += `    vector<string> rows${i} = parseJsonArray(line);\n`;
      driverParsing += `    vector<vector<int>> ${argName};\n`;
      driverParsing += `    for (const string& r : rows${i}) {\n`;
      driverParsing += `        vector<string> cols = parseJsonArray(r);\n`;
      driverParsing += `        vector<int> rowVec;\n`;
      driverParsing += `        for (const string& c : cols) if (!c.empty()) rowVec.push_back(stoi(c));\n`;
      driverParsing += `        ${argName}.push_back(rowVec);\n`;
      driverParsing += `    }\n`;
    } else {
      driverParsing += `    // Type ${a.type}\n`;
    }
  }

  let printLogic = "";
  if (sig.returnType === "int[][]") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@[";\n`;
    printLogic += `        for(size_t r=0; r<res.size(); r++) {\n`;
    printLogic += `            cout << "[";\n`;
    printLogic += `            for(size_t c=0; c<res[r].size(); c++) cout << res[r][c] << (c==res[r].size()-1 ? "" : ",");\n`;
    printLogic += `            cout << "]" << (r==res.size()-1 ? "" : ",");\n`;
    printLogic += `        }\n`;
    printLogic += `        cout << "]@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (sig.returnType.endsWith("[]")) {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@[";\n        for(size_t i=0; i<res.size(); i++) cout << res[i] << (i==res.size()-1 ? "" : ",");\n        cout << "]@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (sig.returnType === "boolean") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << (res ? "true" : "false") << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << res << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  }

  const driver = `// === Driver Code (hidden from student) ===
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <exception>
using namespace std;
${parseVectorInt}
${parseString}
int main() {
    string line;
${driverParsing}
    Solution sol;
    try {
        ${retType} res = sol.${sig.name}(${argNames.join(", ")});
${printLogic}
    } catch (const std::exception& e) {
        cout << "@@@LOGICLAB_ERR_START@@@" << e.what() << "@@@LOGICLAB_ERR_END@@@" << endl;
    } catch (...) {
        cout << "@@@LOGICLAB_ERR_START@@@Unknown Runtime Error@@@LOGICLAB_ERR_END@@@" << endl;
    }
    return 0;
}`;

  return { boilerplate, driver };
}

// ---------------------------------------------------------
// Python Generators
// ---------------------------------------------------------
function generatePython(sig: FunctionSignature): { boilerplate: string, driver: string } {
  const args = sig.args.map(a => `${a.name}: ${TYPE_MAPS.python[a.type]}`).join(", ");
  const retType = TYPE_MAPS.python[sig.returnType];

  const boilerplate = `from typing import List\n\nclass Solution:\n    def ${sig.name}(self, ${args}) -> ${retType}:\n        # Write your code here\n        ${DUMMY_RETURNS.python[sig.returnType] || "pass"}`;

  const driver = `
# === Driver Code (hidden from student) ===
import sys, json, traceback

if __name__ == "__main__":
    input_lines = sys.stdin.read().splitlines()
    # Filter empty trailing lines
    while input_lines and input_lines[-1] == "":
        input_lines.pop()

    expected_args = ${sig.args.length}
    if len(input_lines) < expected_args:
        print(f"@@@LOGICLAB_ERR_START@@@Runtime Error: Expected {expected_args} input lines, got {len(input_lines)}@@@LOGICLAB_ERR_END@@@")
        sys.exit(0)

    parsed_args = []
    for i in range(expected_args):
        line = input_lines[i].strip()
        try:
            parsed_args.append(json.loads(line))
        except Exception:
            parsed_args.append(line)

    sol = Solution()
    try:
        result = sol.${sig.name}(*parsed_args)
        print("@@@LOGICLAB_RES_START@@@" + json.dumps(result).replace(" ", "") + "@@@LOGICLAB_RES_END@@@")
    except Exception as e:
        print("@@@LOGICLAB_ERR_START@@@" + "\\n".join(traceback.format_exception_only(type(e), e)).strip() + "@@@LOGICLAB_ERR_END@@@")
`;

  return { boilerplate, driver };
}

// ---------------------------------------------------------
// JavaScript Generators
// ---------------------------------------------------------
function generateJs(sig: FunctionSignature): { boilerplate: string, driver: string } {
  const args = sig.args.map(a => a.name).join(", ");

  const boilerplate = `class Solution {\n    ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.js[sig.returnType] || "return null;"}\n    }\n}\nmodule.exports = Solution;`;

  const driver = `// === Driver Code (hidden from student) ===
const fs = require('fs');

function run() {
    const raw = fs.readFileSync(0, 'utf-8');
    const input = raw.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    const expectedArgs = ${sig.args.length};

    if (input.length < expectedArgs) {
        console.log("@@@LOGICLAB_ERR_START@@@Runtime Error: Expected " + expectedArgs + " input lines, got " + input.length + "@@@LOGICLAB_ERR_END@@@");
        return;
    }

    const parsedArgs = [];
    for (let i = 0; i < expectedArgs; i++) {
        try {
            parsedArgs.push(JSON.parse(input[i]));
        } catch(e) {
            parsedArgs.push(input[i]);
        }
    }

    const sol = new Solution();
    try {
        const result = sol.${sig.name}(...parsedArgs);
        console.log("@@@LOGICLAB_RES_START@@@" + JSON.stringify(result) + "@@@LOGICLAB_RES_END@@@");
    } catch(e) {
        console.log("@@@LOGICLAB_ERR_START@@@" + (e.stack || e.toString()) + "@@@LOGICLAB_ERR_END@@@");
    }
}
run();
`;

  return { boilerplate, driver };
}

// ---------------------------------------------------------
// Main Entry
// ---------------------------------------------------------
export function generateTemplatesFromSignature(sig: FunctionSignature): GeneratedTemplates {
  const java = generateJava(sig);
  const cpp = generateCpp(sig);
  const python = generatePython(sig);
  const js = generateJs(sig);

  return {
    boilerplates: {
      "62": java.boilerplate,
      "54": cpp.boilerplate,
      "71": python.boilerplate,
      "63": js.boilerplate,
    },
    driverCodes: {
      "62": java.driver,
      "54": cpp.driver,
      "71": python.driver,
      "63": js.driver,
    }
  };
}
