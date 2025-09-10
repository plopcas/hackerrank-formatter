// inject.js — runs in the page context (can access window.monaco if present)
(function(){
  // Enhanced Java-aware formatter as a fallback
  function simpleIndent(code, language = 'plaintext') {
    if (language === 'java') {
      return formatJavaCode(code);
    }
    return formatGenericCode(code, language);
  }

  function formatJavaCode(code) {
    const lines = code.split('\n');
    const tab = '    '; // 4 spaces
    const out = [];
    let braceLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\s+$/g, ''); // Remove trailing whitespace
      const trimmed = line.trim();

      if (!trimmed) {
        out.push(''); // Keep empty lines
        continue;
      }

      // Count braces to determine current nesting level
      let currentLevel = braceLevel;

      // If line starts with closing brace, dedent first
      if (trimmed.startsWith('}')) {
        currentLevel = Math.max(0, braceLevel - 1);
      }

      // Special cases for Java constructs
      if (trimmed.startsWith('case ') || trimmed.startsWith('default:')) {
        // case/default should be indented one less than switch body
        out.push(tab.repeat(Math.max(0, currentLevel - 1)) + trimmed);
      } else if (trimmed === 'break;' && i > 0) {
        // break statements in switch should align with case body
        const prevLine = lines[i-1].trim();
        if (prevLine.startsWith('case ') || prevLine.startsWith('default:')) {
          out.push(tab.repeat(currentLevel) + trimmed);
        } else {
          out.push(tab.repeat(currentLevel) + trimmed);
        }
      } else {
        // Normal indentation
        out.push(tab.repeat(currentLevel) + trimmed);
      }

      // Update brace level for next iteration
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      braceLevel = Math.max(0, braceLevel + openBraces - closeBraces);
    }

    return out.join('\n');
  }

  function formatGenericCode(code) {
    const lines = code.split('\n');
    let level = 0;
    const tab = '    '; // 4 spaces
    const out = [];

    const openers = /(\{|\[|\()/g;
    const closers = /(\}|\]|\))/g;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/\s+$/g, ''); // Remove trailing whitespace
      const trimmed = line.trim();

      if (!trimmed) {
        out.push(''); // Keep empty lines
        continue;
      }

      // Dedent if line starts with a closer
      const startsWithCloser = trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')');
      if (startsWithCloser) {
        level = Math.max(0, level - 1);
      }

      // Apply current indentation
      out.push(tab.repeat(level) + trimmed);

      // Count unmatched braces on this line to determine next level
      const opens = (trimmed.match(openers) || []).length;
      const closes = (trimmed.match(closers) || []).length;
      level = Math.max(0, level + opens - closes);
    }
    return out.join('\n');
  }

  function convertIndentation(code) {
    // Convert 2-space indentation to 4-space indentation
    const lines = code.split('\n');
    const out = [];

    for (const line of lines) {
      if (line.trim() === '') {
        out.push(''); // Keep empty lines as-is
        continue;
      }

      // Count leading spaces
      const match = line.match(/^( *)/);
      const leadingSpaces = match ? match[1].length : 0;

      if (leadingSpaces > 0) {
        // Convert 2-space indentation to 4-space
        // Assume every 2 spaces represents one indentation level
        const indentLevel = Math.floor(leadingSpaces / 2);
        const newIndent = '    '.repeat(indentLevel); // 4 spaces per level
        const content = line.substring(leadingSpaces);
        out.push(newIndent + content);
      } else {
        out.push(line); // No indentation, keep as-is
      }
    }

    return out.join('\n');
  }

  function getLanguageId(editor) {
    try {
      const model = editor.getModel && editor.getModel();
      if (!model) return null;
      return model.getLanguageId ? model.getLanguageId() : null;
    } catch { return null; }
  }

  async function runMonacoFormat(editor) {
    try {
      const model = editor.getModel();
      if (!model) {
        console.log('HRFormatter: No model found');
        return false;
      }

      const originalCode = model.getValue();
      console.log('HRFormatter: Original code length:', originalCode.length);

      // Try to get formatting edits directly from the language service
      if (window.monaco && window.monaco.languages) {
        try {
          const languageId = model.getLanguageId();
          console.log('HRFormatter: Attempting direct formatting for language:', languageId);

          // Get all registered document formatting providers
          const providers = window.monaco.languages.DocumentFormattingEditProvider;
          console.log('HRFormatter: Document formatting providers available:', !!providers);

          // Try to invoke formatting directly
          const edits = await window.monaco.languages.provideDocumentFormattingEdits(
            model,
            { insertSpaces: true, tabSize: 2 },
            new AbortController().signal
          );

          if (edits && edits.length > 0) {
            console.log('HRFormatter: Got', edits.length, 'formatting edits');
            editor.executeEdits('hrformatter', edits);

            // Verify the change was applied
            const newCode = model.getValue();
            if (newCode !== originalCode) {
              console.log('HRFormatter: Code successfully changed via direct edits');
              return true;
            } else {
              console.log('HRFormatter: Edits applied but code unchanged');
            }
          } else {
            console.log('HRFormatter: No formatting edits returned');
          }
        } catch (e) {
          console.log('HRFormatter: Direct formatting provider failed:', e);
        }
      }

      // Fallback: try the format document action
      const action = editor.getAction && editor.getAction('editor.action.formatDocument');
      if (action) {
        console.log('HRFormatter: Trying format document action...');
        await action.run();

        // Check if the code actually changed
        const newCode = model.getValue();
        if (newCode !== originalCode) {
          console.log('HRFormatter: Code successfully changed via format action');
          return true;
        } else {
          console.log('HRFormatter: Format action ran but code unchanged');
        }
      }

      console.log('HRFormatter: Monaco formatting did not change the code');
      return false;
    } catch (e) {
      console.log('HRFormatter: Monaco format error:', e);
      return false;
    }
  }

  function getActiveEditor() {
    // Try Monaco first
    try {
      if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
        const editors = window.monaco.editor.getEditors();
        console.log('HRFormatter: Found', editors.length, 'Monaco editors');
        if (editors && editors.length) {
          // Prefer focused editor
          const focused = editors.find(e => e.hasTextFocus && e.hasTextFocus());
          const activeEditor = focused || editors[0];
          console.log('HRFormatter: Using editor with language:', getLanguageId(activeEditor));
          return activeEditor;
        }
      }
    } catch (e) {
      console.log('HRFormatter: Error getting Monaco editors:', e);
    }

    // Fallback: try to find editor by DOM selectors
    try {
      const editorElements = document.querySelectorAll('.monaco-editor, .hr-monaco-editor');
      console.log('HRFormatter: Found', editorElements.length, 'editor elements in DOM');
      if (editorElements.length > 0) {
        // Try to get the Monaco instance from the DOM element
        for (const el of editorElements) {
          if (el._monacoEditor) {
            console.log('HRFormatter: Found Monaco editor instance in DOM element');
            return el._monacoEditor;
          }
        }
      }
    } catch (e) {
      console.log('HRFormatter: Error finding editor in DOM:', e);
    }

    console.log('HRFormatter: No editor found');
    return null;
  }

  async function formatActive() {
    console.log('HRFormatter: Format request received');
    const editor = getActiveEditor();
    if (!editor) {
      throw new Error('No editor detected. Make sure you\'re on a HackerRank problem page with an active code editor.');
    }

    const language = getLanguageId(editor) || 'plaintext';
    console.log('HRFormatter: Editor language:', language);

    // Get original code to compare changes
    const originalCode = editor.getValue ? editor.getValue() :
                        (editor.getModel && editor.getModel().getValue ? editor.getModel().getValue() : null);

    if (!originalCode) {
      throw new Error('Could not read code from editor.');
    }

    console.log('HRFormatter: Original code preview:', originalCode.substring(0, 100) + '...');

    // Try Monaco's built-in formatter first
    const monacoWorked = await runMonacoFormat(editor);
    if (monacoWorked) {
      console.log('HRFormatter: Successfully formatted using Monaco');
      return;
    }

    // Monaco didn't work, use our fallback formatter
    console.log('HRFormatter: Monaco formatting failed, using enhanced fallback formatter for', language);
    const formatted = simpleIndent(originalCode, language);

    if (formatted && formatted !== originalCode) {
      console.log('HRFormatter: Fallback formatter made changes, applying...');
      console.log('HRFormatter: Formatted code preview:', formatted.substring(0, 100) + '...');

      // Try multiple ways to set the value
      let success = false;

      if (editor.setValue) {
        try {
          editor.setValue(formatted);
          success = true;
          console.log('HRFormatter: Applied via editor.setValue()');
        } catch (e) {
          console.log('HRFormatter: editor.setValue() failed:', e);
        }
      }

      if (!success && editor.getModel) {
        const model = editor.getModel();
        if (model && model.setValue) {
          try {
            model.setValue(formatted);
            success = true;
            console.log('HRFormatter: Applied via model.setValue()');
          } catch (e) {
            console.log('HRFormatter: model.setValue() failed:', e);
          }
        }
      }

      if (!success) {
        throw new Error('Could not write formatted code back to editor');
      }
    } else {
      if (formatted === originalCode) {
        // Check if the code might just need indentation conversion (2 spaces to 4 spaces)
        const reindented = convertIndentation(originalCode);
        if (reindented !== originalCode) {
          console.log('HRFormatter: Converting indentation from 2 spaces to 4 spaces...');
          if (editor.setValue) {
            editor.setValue(reindented);
            console.log('HRFormatter: Applied indentation conversion');
          } else if (editor.getModel && editor.getModel().setValue) {
            editor.getModel().setValue(reindented);
            console.log('HRFormatter: Applied indentation conversion via model');
          }
        } else {
          throw new Error('Code is already properly formatted with 4-space indentation');
        }
      } else {
        throw new Error('Fallback formatter could not process this code');
      }
    }
  }

  window.addEventListener('message', async (e) => {
    if (!e.data || e.data.source !== 'HRFMT_EXT') return;
    if (e.data.type === 'HRFMT_REQUEST') {
      try {
        await formatActive();
        window.postMessage({ source: 'HRFMT_PAGE', type: 'HRFMT_RESULT', ok: true }, '*');
      } catch (err) {
        window.postMessage({ source: 'HRFMT_PAGE', type: 'HRFMT_RESULT', ok: false, error: (err && err.message) || String(err) }, '*');
      }
    }
  }, false);
})();