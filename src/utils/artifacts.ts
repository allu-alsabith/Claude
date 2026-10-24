export interface Artifact {
  id: string;
  type: 'application/vnd.ant.code' | 'application/vnd.ant.markdown' | 'image/svg+xml' | 'text/html' | 'application/vnd.ant.react';
  language: string;
  title: string;
  content: string;
}

/**
 * Extracts Claude <antArtifact> tags or standalone substantial codeblocks
 */
export function extractArtifacts(text: string): { cleanedText: string; artifacts: Artifact[] } {
  const artifacts: Artifact[] = [];

  // Match <antArtifact identifier="..." type="..." language="..." title="...">...</antArtifact>
  const antArtifactRegex = /<antArtifact\s+([^>]*?)>([\s\S]*?)<\/antArtifact>/gi;

  let cleanedText = text.replace(antArtifactRegex, (match, attributesStr, content) => {
    const idMatch = attributesStr.match(/identifier=["']([^"']+)["']/i);
    const typeMatch = attributesStr.match(/type=["']([^"']+)["']/i);
    const langMatch = attributesStr.match(/language=["']([^"']+)["']/i);
    const titleMatch = attributesStr.match(/title=["']([^"']+)["']/i);

    const id = idMatch ? idMatch[1] : `artifact-${artifacts.length + 1}`;
    const type = (typeMatch ? typeMatch[1] : 'application/vnd.ant.code') as Artifact['type'];
    const language = langMatch ? langMatch[1] : 'text';
    const title = titleMatch ? titleMatch[1] : 'Generated Artifact';

    artifacts.push({
      id,
      type,
      language,
      title,
      content: content.trim(),
    });

    return `\n\n> 📦 **Artifact: [${title}]** (View in side panel)\n\n`;
  });

  // If no explicit antArtifact tag was found, check if there's a complete HTML/SVG/React code block (>10 lines)
  if (artifacts.length === 0) {
    const codeBlockRegex = /```(html|svg|jsx|tsx|javascript|typescript|python|css)\n([\s\S]{120,}?)```/gi;
    let fallbackIndex = 1;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1].toLowerCase();
      const content = match[2].trim();
      const firstLine = content.split('\n')[0].replace(/<!--|\/\/|\/\*|\*\/|-->/g, '').trim();
      const title = firstLine && firstLine.length < 50 ? firstLine : `Artifact ${fallbackIndex} (${language.toUpperCase()})`;

      let type: Artifact['type'] = 'application/vnd.ant.code';
      if (language === 'html') type = 'text/html';
      else if (language === 'svg') type = 'image/svg+xml';
      else if (language === 'jsx' || language === 'tsx') type = 'application/vnd.ant.react';

      artifacts.push({
        id: `auto-artifact-${fallbackIndex}`,
        type,
        language,
        title,
        content,
      });
      fallbackIndex++;
    }
  }

  return { cleanedText, artifacts };
}

/**
 * Builds a runnable standalone sandboxed HTML srcDoc for iframe preview
 */
export function buildPreviewSrcDoc(artifact: Artifact): string {
  const { language, content } = artifact;

  if (language === 'svg' || artifact.type === 'image/svg+xml') {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #faf9f5; font-family: sans-serif; }
      svg { max-width: 100%; height: auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08)); }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
  }

  if (language === 'html' || artifact.type === 'text/html') {
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return content;
    }
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #faf9f5; }
    </style>
  </head>
  <body class="p-6">
    ${content}
  </body>
</html>`;
  }

  if (['jsx', 'tsx', 'javascript', 'typescript'].includes(language) || artifact.type === 'application/vnd.ant.react') {
    // Babel standalone runner for interactive React previews
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #faf9f5; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      try {
        ${content.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1')}
        const AppComp = typeof App !== 'undefined' ? App : (typeof Component !== 'undefined' ? Component : null);
        if (AppComp) {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(AppComp));
        } else {
          document.getElementById('root').innerHTML = '<div class="p-4 text-neutral-600">Component rendered successfully.</div>';
        }
      } catch (err) {
        document.getElementById('root').innerHTML = '<div class="p-4 text-red-600 font-mono text-sm">Preview Error: ' + err.message + '</div>';
      }
    </script>
  </body>
</html>`;
  }

  // Fallback markdown / plain code
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; padding: 24px; font-family: monospace; background: #18181b; color: #e4e4e7; white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
    </style>
  </head>
  <body>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
</html>`;
}
