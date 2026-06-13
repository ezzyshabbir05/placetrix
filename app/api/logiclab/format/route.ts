import { NextResponse } from 'next/server';
import prettier from 'prettier';
import javaPlugin from 'prettier-plugin-java';
// Note: We use the babel parser for JS, which comes from prettier/plugins/babel
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';

function formatCpp(code: string): string {
  let indentLevel = 0;
  const indentSize = 4;
  
  // Basic pre-processing to add newlines around braces and semicolons
  let preProcessed = code
    .replace(/{/g, '{\n')
    .replace(/}/g, '\n}\n')
    .replace(/;/g, ';\n')
    .replace(/public:/g, 'public:\n')
    .replace(/private:/g, 'private:\n')
    .replace(/protected:/g, 'protected:\n');
    
  // Don't split inside for-loops: (int i=0; i<n; i++)
  // This is a naive regex, but good enough for simple sandbox formatting
  preProcessed = preProcessed.replace(/\(([^)]+)\)/g, (match) => {
    return match.replace(/;\n/g, '; ');
  });

  const lines = preProcessed.split('\n');
  const formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // Decrease indent for access modifiers
    let currentIndent = indentLevel;
    if (line === 'public:' || line === 'private:' || line === 'protected:') {
      currentIndent = Math.max(0, indentLevel - 1);
    }
    
    formattedLines.push(' '.repeat(currentIndent * indentSize) + line);
    
    if (line.endsWith('{')) {
      indentLevel++;
    }
  }
  
  return formattedLines.join('\n');
}

export async function POST(req: Request) {
  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: 'Missing code or language' }, { status: 400 });
    }

    let formattedCode = code;

    try {
      if (language === 'javascript' || language === 'typescript') {
        formattedCode = await prettier.format(code, {
          parser: 'babel',
          plugins: [prettierPluginBabel, prettierPluginEstree],
          semi: true,
          singleQuote: true,
        });
      } else if (language === 'java') {
        formattedCode = await prettier.format(code, {
          parser: 'java',
          plugins: [javaPlugin],
          tabWidth: 4,
        });
      } else if (language === 'cpp') {
        // C++ doesn't have an official Prettier plugin that is easy to install.
        // The Java AST parser fails on basic C++ features like references `&` and `public:`.
        // So we use a basic lexical bracket-indenter as a fallback.
        formattedCode = formatCpp(code);
      } else if (language === 'python') {
        // Python relies on indentation. A formatter cannot fix a single-line unformatted python script.
        // It can only standardize existing valid python code.
        // We will just return it as is for now since Prettier doesn't support python out of the box.
      }
    } catch (err: any) {
      console.error('Prettier formatting error:', err);
      // If formatting fails due to syntax error, return the unformatted code with a warning
      return NextResponse.json({ 
        code: code, 
        warning: 'Code contains syntax errors, could not format.' 
      });
    }

    return NextResponse.json({ code: formattedCode });
  } catch (error: any) {
    console.error('Formatting error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
