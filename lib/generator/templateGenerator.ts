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
  | "string[][]" 
  | "ListNode" 
  | "ListNode[]" 
  | "TreeNode" 
  | "TreeNode[]"
  | "Node"
  | "Node[]"
  | "String" 
  | "String[]" 
  | "long" 
  | "List<Integer>" 
  | "List<String>";

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

// Normalize user-entered or legacy type aliases
export function normalizeArgType(rawType: string): string {
  const t = (rawType || "").trim();
  if (t === "String") return "string";
  if (t === "String[]") return "string[]";
  if (t === "long") return "int";
  if (t === "List<Integer>") return "int[]";
  if (t === "List<String>") return "string[]";
  return t;
}

// Map schema types to language-specific types
const TYPE_MAPS: Record<string, Record<string, string>> = {
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
    "ListNode": "ListNode",
    "ListNode[]": "ListNode[]",
    "TreeNode": "TreeNode",
    "TreeNode[]": "TreeNode[]",
    "Node": "Node",
    "Node[]": "Node[]",
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
    "ListNode": "ListNode*",
    "ListNode[]": "vector<ListNode*>",
    "TreeNode": "TreeNode*",
    "TreeNode[]": "vector<TreeNode*>",
    "Node": "Node*",
    "Node[]": "vector<Node*>",
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
    "ListNode": "Optional[ListNode]",
    "ListNode[]": "List[Optional[ListNode]]",
    "TreeNode": "Optional[TreeNode]",
    "TreeNode[]": "List[Optional[TreeNode]]",
    "Node": "Optional['Node']",
    "Node[]": "List[Optional['Node']]",
  },
  js: {
    "int": "number",
    "string": "string",
    "boolean": "boolean",
    "double": "number",
    "char": "string",
    "int[]": "number[]",
    "string[]": "string[]",
    "char[]": "string[]",
    "boolean[]": "boolean[]",
    "double[]": "number[]",
    "int[][]": "number[][]",
    "string[][]": "string[][]",
    "ListNode": "ListNode",
    "ListNode[]": "ListNode[]",
    "TreeNode": "TreeNode",
    "TreeNode[]": "TreeNode[]",
    "Node": "Node",
    "Node[]": "Node[]",
  }
};

// Map schema return types to safe dummy values
const DUMMY_RETURNS: Record<string, Record<string, string>> = {
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
    "ListNode": "return null;",
    "ListNode[]": "return new ListNode[0];",
    "TreeNode": "return null;",
    "TreeNode[]": "return new TreeNode[0];",
    "Node": "return null;",
    "Node[]": "return new Node[0];",
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
    "ListNode": "return nullptr;",
    "ListNode[]": "return {};",
    "TreeNode": "return nullptr;",
    "TreeNode[]": "return {};",
    "Node": "return nullptr;",
    "Node[]": "return {};",
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
    "ListNode": "return None",
    "ListNode[]": "return []",
    "TreeNode": "return None",
    "TreeNode[]": "return []",
    "Node": "return None",
    "Node[]": "return []",
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
    "ListNode": "return null;",
    "ListNode[]": "return [];",
    "TreeNode": "return null;",
    "TreeNode[]": "return [];",
    "Node": "return null;",
    "Node[]": "return [];",
  }
};

// ---------------------------------------------------------
// Java Generators
// ---------------------------------------------------------
function generateJava(sig: FunctionSignature): { boilerplate: string, driver: string } {
  const normReturnType = normalizeArgType(sig.returnType);
  const normArgs = sig.args.map(a => ({ name: a.name, type: normalizeArgType(a.type) }));

  const usesListNode = normReturnType.includes("ListNode") || normArgs.some(a => a.type.includes("ListNode"));
  const usesTreeNode = normReturnType.includes("TreeNode") || normArgs.some(a => a.type.includes("TreeNode"));
  const usesGraphNode = normReturnType === "Node" || normReturnType === "Node[]" || normArgs.some(a => a.type === "Node" || a.type === "Node[]");

  const retType = TYPE_MAPS.java[normReturnType] || "Object";
  const args = normArgs.map(a => `${TYPE_MAPS.java[a.type] || "Object"} ${a.name}`).join(", ");

  let boilerplateHeader = "";
  if (usesListNode) {
    boilerplateHeader += `/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\n`;
  }
  if (usesTreeNode) {
    boilerplateHeader += `/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\n`;
  }
  if (usesGraphNode) {
    boilerplateHeader += `/**\n * Definition for a Node.\n * class Node {\n *     public int val;\n *     public List<Node> neighbors;\n *     public Node() { val = 0; neighbors = new ArrayList<Node>(); }\n *     public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); }\n *     public Node(int _val, ArrayList<Node> _neighbors) { val = _val; neighbors = _neighbors; }\n * }\n */\n`;
  }

  const boilerplate = `${boilerplateHeader}class Solution {\n    public ${retType} ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.java[normReturnType] || "return null;"}\n    }\n}`;

  let driverParsing = "";
  const argNames: string[] = [];
  
  for (let i = 0; i < normArgs.length; i++) {
    const a = normArgs[i];
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
    } else if (a.type === "ListNode") {
      driverParsing += `        ListNode ${argName} = parseListNode(line${i});\n`;
    } else if (a.type === "TreeNode") {
      driverParsing += `        TreeNode ${argName} = parseTreeNode(line${i});\n`;
    } else if (a.type === "Node") {
      driverParsing += `        Node ${argName} = parseGraphNode(line${i});\n`;
    } else {
      driverParsing += `        ${TYPE_MAPS.java[a.type] || "Object"} ${argName} = null;\n`;
    }
  }

  let printLogic = "";
  if (normReturnType === "ListNode") {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + listNodeToString(res) + "@@@LOGICLAB_RES_END@@@");\n`;
  } else if (normReturnType === "TreeNode") {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + treeNodeToString(res) + "@@@LOGICLAB_RES_END@@@");\n`;
  } else if (normReturnType === "Node") {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + graphNodeToString(res) + "@@@LOGICLAB_RES_END@@@");\n`;
  } else if (normReturnType === "int[][]" || normReturnType === "string[][]") {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + Arrays.deepToString(res).replaceAll(" ", "") + "@@@LOGICLAB_RES_END@@@");\n`;
  } else if (normReturnType.endsWith("[]")) {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + Arrays.toString(res).replaceAll(" ", "") + "@@@LOGICLAB_RES_END@@@");\n`;
  } else {
    printLogic = `        System.out.println("@@@LOGICLAB_RES_START@@@" + res + "@@@LOGICLAB_RES_END@@@");\n`;
  }

  const listNodeHelper = `
    public static ListNode parseListNode(String s) {
        String[] parts = parseJsonArray(s);
        if (parts.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty() && !trimmed.equals("null")) {
                curr.next = new ListNode(Integer.parseInt(trimmed));
                curr = curr.next;
            }
        }
        return dummy.next;
    }

    public static String listNodeToString(ListNode node) {
        if (node == null) return "[]";
        StringBuilder sb = new StringBuilder("[");
        ListNode curr = node;
        Set<ListNode> visited = new HashSet<>();
        int count = 0;
        while (curr != null && count < 10000) {
            if (visited.contains(curr)) {
                sb.append("...cycle");
                break;
            }
            visited.add(curr);
            sb.append(curr.val);
            if (curr.next != null) sb.append(",");
            curr = curr.next;
            count++;
        }
        sb.append("]");
        return sb.toString();
    }
`;

  const treeNodeHelper = `
    public static TreeNode parseTreeNode(String s) {
        String[] parts = parseJsonArray(s);
        if (parts.length == 0 || parts[0].trim().equals("null") || parts[0].trim().isEmpty()) return null;
        TreeNode root = new TreeNode(Integer.parseInt(parts[0].trim()));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int idx = 1;
        while (!queue.isEmpty() && idx < parts.length) {
            TreeNode curr = queue.poll();
            if (idx < parts.length) {
                String leftVal = parts[idx++].trim();
                if (!leftVal.equals("null") && !leftVal.isEmpty()) {
                    curr.left = new TreeNode(Integer.parseInt(leftVal));
                    queue.add(curr.left);
                }
            }
            if (idx < parts.length) {
                String rightVal = parts[idx++].trim();
                if (!rightVal.equals("null") && !rightVal.isEmpty()) {
                    curr.right = new TreeNode(Integer.parseInt(rightVal));
                    queue.add(curr.right);
                }
            }
        }
        return root;
    }

    public static String treeNodeToString(TreeNode root) {
        if (root == null) return "[]";
        List<String> list = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode curr = queue.poll();
            if (curr != null) {
                list.add(String.valueOf(curr.val));
                queue.add(curr.left);
                queue.add(curr.right);
            } else {
                list.add("null");
            }
        }
        while (list.size() > 0 && list.get(list.size() - 1).equals("null")) {
            list.remove(list.size() - 1);
        }
        return "[" + String.join(",", list) + "]";
    }
`;

  const graphNodeHelper = `
    public static Node parseGraphNode(String s) {
        String[] rows = parseJsonArray(s);
        if (rows.length == 0) return null;
        Map<Integer, Node> map = new HashMap<>();
        for (int i = 1; i <= rows.length; i++) {
            map.put(i, new Node(i));
        }
        for (int i = 0; i < rows.length; i++) {
            String[] cols = parseJsonArray(rows[i]);
            Node curr = map.get(i + 1);
            for (String c : cols) {
                String trimmed = c.trim();
                if (!trimmed.isEmpty()) {
                    int neighborVal = Integer.parseInt(trimmed);
                    if (map.containsKey(neighborVal)) {
                        curr.neighbors.add(map.get(neighborVal));
                    }
                }
            }
        }
        return map.get(1);
    }

    public static String graphNodeToString(Node node) {
        if (node == null) return "[]";
        Map<Integer, Node> visited = new HashMap<>();
        Queue<Node> queue = new LinkedList<>();
        queue.add(node);
        visited.put(node.val, node);
        int maxVal = node.val;
        while (!queue.isEmpty()) {
            Node curr = queue.poll();
            if (curr.val > maxVal) maxVal = curr.val;
            if (curr.neighbors != null) {
                for (Node neighbor : curr.neighbors) {
                    if (neighbor != null && !visited.containsKey(neighbor.val)) {
                        visited.put(neighbor.val, neighbor);
                        queue.add(neighbor);
                    }
                }
            }
        }
        List<String> adj = new ArrayList<>();
        for (int i = 1; i <= maxVal; i++) {
            Node n = visited.get(i);
            if (n == null || n.neighbors == null) {
                adj.add("[]");
            } else {
                List<String> nbrs = new ArrayList<>();
                for (Node neighbor : n.neighbors) {
                    if (neighbor != null) nbrs.add(String.valueOf(neighbor.val));
                }
                adj.add("[" + String.join(",", nbrs) + "]");
            }
        }
        return "[" + String.join(",", adj) + "]";
    }
`;

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
${usesListNode ? listNodeHelper : ""}
${usesTreeNode ? treeNodeHelper : ""}
${usesGraphNode ? graphNodeHelper : ""}
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
  const normReturnType = normalizeArgType(sig.returnType);
  const normArgs = sig.args.map(a => ({ name: a.name, type: normalizeArgType(a.type) }));

  const usesListNode = normReturnType.includes("ListNode") || normArgs.some(a => a.type.includes("ListNode"));
  const usesTreeNode = normReturnType.includes("TreeNode") || normArgs.some(a => a.type.includes("TreeNode"));
  const usesGraphNode = normReturnType === "Node" || normReturnType === "Node[]" || normArgs.some(a => a.type === "Node" || a.type === "Node[]");

  const retType = TYPE_MAPS.cpp[normReturnType] || "void";
  const args = normArgs.map(a => `${TYPE_MAPS.cpp[a.type] || "auto"}${a.type.includes("[]") || a.type === "string" ? "&" : ""} ${a.name}`).join(", ");

  let boilerplateHeader = "";
  if (usesListNode) {
    boilerplateHeader += `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\n`;
  }
  if (usesTreeNode) {
    boilerplateHeader += `/**\n * Definition for a binary tree node.\n * struct TreeNode {\n *     int val;\n *     TreeNode *left;\n *     TreeNode *right;\n *     TreeNode() : val(0), left(nullptr), right(nullptr) {}\n *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n * };\n */\n`;
  }
  if (usesGraphNode) {
    boilerplateHeader += `/**\n * Definition for a Node.\n * class Node {\n * public:\n *     int val;\n *     vector<Node*> neighbors;\n *     Node() { val = 0; neighbors = vector<Node*>(); }\n *     Node(int _val) { val = _val; neighbors = vector<Node*>(); }\n *     Node(int _val, vector<Node*> _neighbors) { val = _val; neighbors = _neighbors; }\n * };\n */\n`;
  }

  const boilerplate = `${boilerplateHeader}#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${retType} ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.cpp[normReturnType] || "return {};"}\n    }\n};`;

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

  const listNodeCppHelpers = `
ListNode* parseListNode(const string& line) {
    vector<string> parts = parseJsonArray(line);
    if (parts.empty()) return nullptr;
    ListNode* dummy = new ListNode(0);
    ListNode* curr = dummy;
    for (const string& p : parts) {
        string t = p;
        while (!t.empty() && (t.front() == ' ' || t.front() == '\\t')) t.erase(t.begin());
        while (!t.empty() && (t.back() == ' ' || t.back() == '\\t')) t.pop_back();
        if (!t.empty() && t != "null") {
            curr->next = new ListNode(stoi(t));
            curr = curr->next;
        }
    }
    ListNode* head = dummy->next;
    delete dummy;
    return head;
}

string listNodeToString(ListNode* node) {
    if (!node) return "[]";
    string s = "[";
    ListNode* curr = node;
    unordered_set<ListNode*> visited;
    int count = 0;
    while (curr != nullptr && count < 10000) {
        if (visited.count(curr)) {
            s += "...cycle";
            break;
        }
        visited.insert(curr);
        s += to_string(curr->val);
        if (curr->next != nullptr) s += ",";
        curr = curr->next;
        count++;
    }
    s += "]";
    return s;
}
`;

  const treeNodeCppHelpers = `
TreeNode* parseTreeNode(const string& line) {
    vector<string> parts = parseJsonArray(line);
    if (parts.empty() || parts[0] == "null" || parts[0].empty()) return nullptr;
    TreeNode* root = new TreeNode(stoi(parts[0]));
    queue<TreeNode*> q;
    q.push(root);
    size_t idx = 1;
    while (!q.empty() && idx < parts.size()) {
        TreeNode* curr = q.front();
        q.pop();
        if (idx < parts.size()) {
            string leftVal = parts[idx++];
            if (leftVal != "null" && !leftVal.empty()) {
                curr->left = new TreeNode(stoi(leftVal));
                q.push(curr->left);
            }
        }
        if (idx < parts.size()) {
            string rightVal = parts[idx++];
            if (rightVal != "null" && !rightVal.empty()) {
                curr->right = new TreeNode(stoi(rightVal));
                q.push(curr->right);
            }
        }
    }
    return root;
}

string treeNodeToString(TreeNode* root) {
    if (!root) return "[]";
    vector<string> list;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        if (curr) {
            list.push_back(to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        } else {
            list.push_back("null");
        }
    }
    while (!list.empty() && list.back() == "null") {
        list.pop_back();
    }
    string res = "[";
    for (size_t i = 0; i < list.size(); i++) {
        res += list[i] + (i + 1 < list.size() ? "," : "");
    }
    res += "]";
    return res;
}
`;

  const graphNodeCppHelpers = `
Node* parseGraphNode(const string& line) {
    vector<string> rows = parseJsonArray(line);
    if (rows.empty()) return nullptr;
    unordered_map<int, Node*> map;
    for (size_t i = 1; i <= rows.size(); i++) {
        map[i] = new Node(i);
    }
    for (size_t i = 0; i < rows.size(); i++) {
        vector<string> cols = parseJsonArray(rows[i]);
        Node* curr = map[i + 1];
        for (const string& c : cols) {
            string t = c;
            while (!t.empty() && (t.front() == ' ' || t.front() == '\\t')) t.erase(t.begin());
            while (!t.empty() && (t.back() == ' ' || t.back() == '\\t')) t.pop_back();
            if (!t.empty()) {
                int neighborVal = stoi(t);
                if (map.count(neighborVal)) {
                    curr->neighbors.push_back(map[neighborVal]);
                }
            }
        }
    }
    return map[1];
}

string graphNodeToString(Node* node) {
    if (!node) return "[]";
    unordered_map<int, Node*> visited;
    queue<Node*> q;
    q.push(node);
    visited[node->val] = node;
    int maxVal = node->val;
    while (!q.empty()) {
        Node* curr = q.front();
        q.pop();
        if (curr->val > maxVal) maxVal = curr->val;
        for (Node* neighbor : curr->neighbors) {
            if (neighbor && !visited.count(neighbor->val)) {
                visited[neighbor->val] = neighbor;
                q.push(neighbor);
            }
        }
    }
    string s = "[";
    for (int i = 1; i <= maxVal; i++) {
        Node* n = visited.count(i) ? visited[i] : nullptr;
        s += "[";
        if (n) {
            for (size_t j = 0; j < n->neighbors.size(); j++) {
                if (n->neighbors[j]) {
                    s += to_string(n->neighbors[j]->val);
                    if (j + 1 < n->neighbors.size()) s += ",";
                }
            }
        }
        s += "]";
        if (i < maxVal) s += ",";
    }
    s += "]";
    return s;
}
`;

  let driverParsing = "";
  const argNames: string[] = [];
  
  for (let i = 0; i < normArgs.length; i++) {
    const a = normArgs[i];
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
    } else if (a.type === "ListNode") {
      driverParsing += `    ListNode* ${argName} = parseListNode(line);\n`;
    } else if (a.type === "TreeNode") {
      driverParsing += `    TreeNode* ${argName} = parseTreeNode(line);\n`;
    } else if (a.type === "Node") {
      driverParsing += `    Node* ${argName} = parseGraphNode(line);\n`;
    } else {
      driverParsing += `    // Type ${a.type}\n`;
    }
  }

  let printLogic = "";
  if (normReturnType === "ListNode") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << listNodeToString(res) << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (normReturnType === "TreeNode") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << treeNodeToString(res) << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (normReturnType === "Node") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << graphNodeToString(res) << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (normReturnType === "int[][]") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@[";\n`;
    printLogic += `        for(size_t r=0; r<res.size(); r++) {\n`;
    printLogic += `            cout << "[";\n`;
    printLogic += `            for(size_t c=0; c<res[r].size(); c++) cout << res[r][c] << (c==res[r].size()-1 ? "" : ",");\n`;
    printLogic += `            cout << "]" << (r==res.size()-1 ? "" : ",");\n`;
    printLogic += `        }\n`;
    printLogic += `        cout << "]@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (normReturnType.endsWith("[]")) {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@[";\n        for(size_t i=0; i<res.size(); i++) cout << res[i] << (i==res.size()-1 ? "" : ",");\n        cout << "]@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else if (normReturnType === "boolean") {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << (res ? "true" : "false") << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  } else {
    printLogic = `        cout << "@@@LOGICLAB_RES_START@@@" << res << "@@@LOGICLAB_RES_END@@@" << endl;\n`;
  }

  const driver = `// === Driver Code (hidden from student) ===
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <queue>
#include <unordered_set>
#include <unordered_map>
#include <exception>
using namespace std;
${parseVectorInt}
${parseString}
${usesListNode ? listNodeCppHelpers : ""}
${usesTreeNode ? treeNodeCppHelpers : ""}
${usesGraphNode ? graphNodeCppHelpers : ""}
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
  const normReturnType = normalizeArgType(sig.returnType);
  const normArgs = sig.args.map(a => ({ name: a.name, type: normalizeArgType(a.type) }));

  const usesListNode = normReturnType.includes("ListNode") || normArgs.some(a => a.type.includes("ListNode"));
  const usesTreeNode = normReturnType.includes("TreeNode") || normArgs.some(a => a.type.includes("TreeNode"));
  const usesGraphNode = normReturnType === "Node" || normReturnType === "Node[]" || normArgs.some(a => a.type === "Node" || a.type === "Node[]");

  const retType = TYPE_MAPS.python[normReturnType] || "Any";
  const args = normArgs.map(a => `${a.name}: ${TYPE_MAPS.python[a.type] || "Any"}`).join(", ");

  let boilerplateHeader = "";
  if (usesListNode) {
    boilerplateHeader += `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n`;
  }
  if (usesTreeNode) {
    boilerplateHeader += `# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n`;
  }
  if (usesGraphNode) {
    boilerplateHeader += `# Definition for a Node.\n# class Node:\n#     def __init__(self, val = 0, neighbors = None):\n#         self.val = val\n#         self.neighbors = neighbors if neighbors is not None else []\n`;
  }

  const boilerplate = `${boilerplateHeader}from typing import List, Optional, Any\n\nclass Solution:\n    def ${sig.name}(self, ${args}) -> ${retType}:\n        # Write your code here\n        ${DUMMY_RETURNS.python[normReturnType] || "pass"}`;

  const listNodePyHelpers = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def parse_list_node(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            raw = []
    if not isinstance(raw, list) or not raw:
        return None
    dummy = ListNode(0)
    curr = dummy
    for v in raw:
        if v is not None:
            curr.next = ListNode(int(v))
            curr = curr.next
    return dummy.next

def list_node_to_list(node):
    if not node:
        return []
    res = []
    curr = node
    visited = set()
    limit = 0
    while curr and limit < 10000:
        if id(curr) in visited:
            res.append("...cycle")
            break
        visited.add(id(curr))
        res.append(curr.val)
        curr = curr.next
        limit += 1
    return res
`;

  const treeNodePyHelpers = `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def parse_tree_node(raw):
    if isinstance(raw, str):
        try: raw = json.loads(raw)
        except Exception: raw = []
    if not isinstance(raw, list) or not raw or raw[0] is None:
        return None
    root = TreeNode(int(raw[0]))
    queue = collections.deque([root])
    idx = 1
    while queue and idx < len(raw):
        curr = queue.popleft()
        if idx < len(raw):
            left_val = raw[idx]
            idx += 1
            if left_val is not None and str(left_val).lower() != "null":
                curr.left = TreeNode(int(left_val))
                queue.append(curr.left)
        if idx < len(raw):
            right_val = raw[idx]
            idx += 1
            if right_val is not None and str(right_val).lower() != "null":
                curr.right = TreeNode(int(right_val))
                queue.append(curr.right)
    return root

def tree_node_to_list(root):
    if not root:
        return []
    res = []
    queue = collections.deque([root])
    while queue:
        curr = queue.popleft()
        if curr is not None:
            res.append(curr.val)
            queue.append(curr.left)
            queue.append(curr.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res
`;

  const graphNodePyHelpers = `
class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def parse_graph_node(raw):
    if isinstance(raw, str):
        try: raw = json.loads(raw)
        except: raw = []
    if not isinstance(raw, list) or not raw:
        return None
    node_map = {i + 1: Node(i + 1) for i in range(len(raw))}
    for i, neighbors in enumerate(raw):
        curr = node_map[i + 1]
        if isinstance(neighbors, list):
            for n_val in neighbors:
                if n_val in node_map:
                    curr.neighbors.append(node_map[n_val])
    return node_map.get(1)

def graph_node_to_list(node):
    if not node:
        return []
    visited = {}
    queue = collections.deque([node])
    visited[node.val] = node
    max_val = node.val
    while queue:
        curr = queue.popleft()
        if curr.val > max_val:
            max_val = curr.val
        for neighbor in curr.neighbors:
            if neighbor and neighbor.val not in visited:
                visited[neighbor.val] = neighbor
                queue.append(neighbor)
    adj = []
    for i in range(1, max_val + 1):
        if i in visited and visited[i].neighbors:
            adj.append([nbr.val for nbr in visited[i].neighbors if nbr])
        else:
            adj.append([])
    return adj
`;

  const driver = `
# === Driver Code (hidden from student) ===
import sys, json, traceback, collections
${usesListNode ? listNodePyHelpers : ""}
${usesTreeNode ? treeNodePyHelpers : ""}
${usesGraphNode ? graphNodePyHelpers : ""}
if __name__ == "__main__":
    input_lines = sys.stdin.read().splitlines()
    while input_lines and input_lines[-1] == "":
        input_lines.pop()

    expected_args = ${normArgs.length}
    if len(input_lines) < expected_args:
        print(f"@@@LOGICLAB_ERR_START@@@Runtime Error: Expected {expected_args} input lines, got {len(input_lines)}@@@LOGICLAB_ERR_END@@@")
        sys.exit(0)

    arg_types = ${JSON.stringify(normArgs.map(a => a.type))}
    parsed_args = []
    for i in range(expected_args):
        line = input_lines[i].strip()
        try:
            val = json.loads(line)
        except Exception:
            val = line
        
        ${usesListNode ? `if arg_types[i] == "ListNode":\n            val = parse_list_node(val)` : ""}
        ${usesTreeNode ? `if arg_types[i] == "TreeNode":\n            val = parse_tree_node(val)` : ""}
        ${usesGraphNode ? `if arg_types[i] == "Node":\n            val = parse_graph_node(val)` : ""}
        parsed_args.append(val)

    sol = Solution()
    try:
        result = sol.${sig.name}(*parsed_args)
        ${normReturnType === "ListNode" ? "result = list_node_to_list(result)" : ""}
        ${normReturnType === "TreeNode" ? "result = tree_node_to_list(result)" : ""}
        ${normReturnType === "Node" ? "result = graph_node_to_list(result)" : ""}
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
  const normReturnType = normalizeArgType(sig.returnType);
  const normArgs = sig.args.map(a => ({ name: a.name, type: normalizeArgType(a.type) }));

  const usesListNode = normReturnType.includes("ListNode") || normArgs.some(a => a.type.includes("ListNode"));
  const usesTreeNode = normReturnType.includes("TreeNode") || normArgs.some(a => a.type.includes("TreeNode"));
  const usesGraphNode = normReturnType === "Node" || normReturnType === "Node[]" || normArgs.some(a => a.type === "Node" || a.type === "Node[]");
  const args = normArgs.map(a => a.name).join(", ");

  let boilerplateHeader = "";
  if (usesListNode) {
    boilerplateHeader += `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val);\n *     this.next = (next===undefined ? null : next);\n * }\n */\n`;
  }
  if (usesTreeNode) {
    boilerplateHeader += `/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val);\n *     this.left = (left===undefined ? null : left);\n *     this.right = (right===undefined ? null : right);\n * }\n */\n`;
  }
  if (usesGraphNode) {
    boilerplateHeader += `/**\n * Definition for a Node.\n * function Node(val, neighbors) {\n *     this.val = val === undefined ? 0 : val;\n *     this.neighbors = neighbors === undefined ? [] : neighbors;\n * };\n */\n`;
  }

  const boilerplate = `${boilerplateHeader}class Solution {\n    ${sig.name}(${args}) {\n        // Write your code here\n        ${DUMMY_RETURNS.js[normReturnType] || "return null;"}\n    }\n}\nmodule.exports = Solution;`;

  const listNodeJsHelpers = `
function ListNode(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}

function parseListNode(raw) {
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const dummy = new ListNode(0);
    let curr = dummy;
    for (const v of raw) {
        if (v !== null && v !== undefined) {
            curr.next = new ListNode(Number(v));
            curr = curr.next;
        }
    }
    return dummy.next;
}

function listNodeToArray(node) {
    if (!node) return [];
    const res = [];
    let curr = node;
    const visited = new Set();
    let limit = 0;
    while (curr && limit < 10000) {
        if (visited.has(curr)) {
            res.push("...cycle");
            break;
        }
        visited.add(curr);
        res.push(curr.val);
        curr = curr.next;
        limit++;
    }
    return res;
}
`;

  const treeNodeJsHelpers = `
function TreeNode(val, left, right) {
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
}

function parseTreeNode(raw) {
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (!Array.isArray(raw) || raw.length === 0 || raw[0] === null) return null;
    const root = new TreeNode(Number(raw[0]));
    const queue = [root];
    let idx = 1;
    while (queue.length > 0 && idx < raw.length) {
        const curr = queue.shift();
        if (idx < raw.length) {
            const leftVal = raw[idx++];
            if (leftVal !== null && leftVal !== undefined) {
                curr.left = new TreeNode(Number(leftVal));
                queue.push(curr.left);
            }
        }
        if (idx < raw.length) {
            const rightVal = raw[idx++];
            if (rightVal !== null && rightVal !== undefined) {
                curr.right = new TreeNode(Number(rightVal));
                queue.push(curr.right);
            }
        }
    }
    return root;
}

function treeNodeToArray(root) {
    if (!root) return [];
    const res = [];
    const queue = [root];
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr) {
            res.push(curr.val);
            queue.push(curr.left);
            queue.push(curr.right);
        } else {
            res.push(null);
        }
    }
    while (res.length > 0 && res[res.length - 1] === null) {
        res.pop();
    }
    return res;
}
`;

  const graphNodeJsHelpers = `
function Node(val, neighbors) {
    this.val = val === undefined ? 0 : val;
    this.neighbors = neighbors === undefined ? [] : neighbors;
}

function parseGraphNode(raw) {
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const map = {};
    for (let i = 1; i <= raw.length; i++) {
        map[i] = new Node(i);
    }
    for (let i = 0; i < raw.length; i++) {
        const curr = map[i + 1];
        if (Array.isArray(raw[i])) {
            for (const nVal of raw[i]) {
                if (map[nVal]) curr.neighbors.push(map[nVal]);
            }
        }
    }
    return map[1] || null;
}

function graphNodeToArray(node) {
    if (!node) return [];
    const visited = new Map();
    const queue = [node];
    visited.set(node.val, node);
    let maxVal = node.val;
    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.val > maxVal) maxVal = curr.val;
        if (Array.isArray(curr.neighbors)) {
            for (const neighbor of curr.neighbors) {
                if (neighbor && !visited.has(neighbor.val)) {
                    visited.set(neighbor.val, neighbor);
                    queue.push(neighbor);
                }
            }
        }
    }
    const res = [];
    for (let i = 1; i <= maxVal; i++) {
        const n = visited.get(i);
        if (n && Array.isArray(n.neighbors)) {
            res.push(n.neighbors.filter(Boolean).map(x => x.val));
        } else {
            res.push([]);
        }
    }
    return res;
}
`;

  const driver = `// === Driver Code (hidden from student) ===
const fs = require('fs');
${usesListNode ? listNodeJsHelpers : ""}
${usesTreeNode ? treeNodeJsHelpers : ""}
${usesGraphNode ? graphNodeJsHelpers : ""}
function run() {
    const raw = fs.readFileSync(0, 'utf-8');
    const input = raw.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    const expectedArgs = ${normArgs.length};

    if (input.length < expectedArgs) {
        console.log("@@@LOGICLAB_ERR_START@@@Runtime Error: Expected " + expectedArgs + " input lines, got " + input.length + "@@@LOGICLAB_ERR_END@@@");
        return;
    }

    const argTypes = ${JSON.stringify(normArgs.map(a => a.type))};
    const parsedArgs = [];
    for (let i = 0; i < expectedArgs; i++) {
        let val;
        try {
            val = JSON.parse(input[i]);
        } catch(e) {
            val = input[i];
        }
        ${usesListNode ? `if (argTypes[i] === "ListNode") val = parseListNode(val);` : ""}
        ${usesTreeNode ? `if (argTypes[i] === "TreeNode") val = parseTreeNode(val);` : ""}
        ${usesGraphNode ? `if (argTypes[i] === "Node") val = parseGraphNode(val);` : ""}
        parsedArgs.push(val);
    }

    const sol = new Solution();
    try {
        let result = sol.${sig.name}(...parsedArgs);
        ${normReturnType === "ListNode" ? "result = listNodeToArray(result);" : ""}
        ${normReturnType === "TreeNode" ? "result = treeNodeToArray(result);" : ""}
        ${normReturnType === "Node" ? "result = graphNodeToArray(result);" : ""}
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

/**
 * Returns compilation preamble for standard data structures (ListNode, TreeNode, Node, etc.)
 * if referenced by student code or driver but not declared in source.
 */
export function getLanguagePrelude(langKey: string, code: string, driverCode: string = ""): string {
  let prelude = "";

  const needsListNode =
    (code.includes("ListNode") || driverCode.includes("ListNode")) &&
    !code.includes("class ListNode") &&
    !code.includes("struct ListNode") &&
    !code.includes("function ListNode");

  if (needsListNode) {
    if (langKey === "54") {
      prelude += "struct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };\n";
    } else if (langKey === "62") {
      prelude += "class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\n";
    } else if (langKey === "71") {
      prelude += "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n";
    } else if (langKey === "63") {
      prelude += "function ListNode(val, next) { this.val = (val === undefined ? 0 : val); this.next = (next === undefined ? null : next); }\n";
    }
  }

  const needsTreeNode =
    (code.includes("TreeNode") || driverCode.includes("TreeNode")) &&
    !code.includes("class TreeNode") &&
    !code.includes("struct TreeNode") &&
    !code.includes("function TreeNode");

  if (needsTreeNode) {
    if (langKey === "54") {
      prelude += "struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {} };\n";
    } else if (langKey === "62") {
      prelude += "class TreeNode { int val; TreeNode left; TreeNode right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }\n";
    } else if (langKey === "71") {
      prelude += "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n";
    } else if (langKey === "63") {
      prelude += "function TreeNode(val, left, right) { this.val = (val === undefined ? 0 : val); this.left = (left === undefined ? null : left); this.right = (right === undefined ? null : right); }\n";
    }
  }

  const needsGraphNode =
    (code.includes("Node") || driverCode.includes("Node")) &&
    !code.includes("class Node") &&
    !code.includes("struct Node") &&
    !code.includes("function Node") &&
    (code.includes("neighbors") || driverCode.includes("neighbors"));

  if (needsGraphNode) {
    if (langKey === "54") {
      prelude += "class Node { public: int val; vector<Node*> neighbors; Node():val(0){} Node(int _val):val(_val){} Node(int _val, vector<Node*> _n):val(_val),neighbors(_n){} };\n";
    } else if (langKey === "62") {
      prelude += "class Node { public int val; public List<Node> neighbors; public Node() { val = 0; neighbors = new ArrayList<Node>(); } public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); } public Node(int _val, ArrayList<Node> _n) { val = _val; neighbors = _n; } }\n";
    } else if (langKey === "71") {
      prelude += "class Node:\n    def __init__(self, val = 0, neighbors = None):\n        self.val = val\n        self.neighbors = neighbors if neighbors is not None else []\n";
    } else if (langKey === "63") {
      prelude += "function Node(val, neighbors) { this.val = val === undefined ? 0 : val; this.neighbors = neighbors === undefined ? [] : neighbors; }\n";
    }
  }

  return prelude;
}
