# HackerRank Code Formatter (Chrome Extension, MV3)

This extension adds a small "Format" button on HackerRank problem pages. When clicked, it formats the currently active code editor with proper indentation and structure.

## How it works

- **Primary**: Attempts to use Monaco Editor's built-in formatter for the detected language
- **Enhanced Fallback**: Uses a sophisticated Java-aware formatter with proper class/method indentation
- **Indentation Conversion**: Automatically converts 2-space indentation to 4-space indentation
- **Smart Detection**: Includes comprehensive editor detection and error handling

## Features

- ✅ **4-space indentation**
- ✅ **Switch statement formatting** with proper case/break alignment
- ✅ **Comprehensive debugging** with console logging
- ✅ **Offline operation** - no external dependencies

> Note: This extension is optimized for Java but works with other languages too. It's intentionally lightweight and offline.

## Install (Unpacked)

1. Download and unzip `hackerrank-formatter.zip`.
2. Open Chrome → `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.

## Use

1. Visit a HackerRank challenge where the editor is visible
2. Click in the code editor to make sure it's active
3. Click the **Format** button that appears near the editor toolbar
4. Your code will be formatted with proper 4-space indentation

## Troubleshooting

- **Button not visible?** Try refreshing the page or waiting a moment for the editor to load
- **"No editor detected" error?** Click in the code editor first, then try formatting
- **Want to see what's happening?** Open Developer Console (F12) to view detailed debug messages

## Extending with real formatters (optional)

- **Prettier**: Add `prettier/standalone` and desired parsers to the extension and call it in `inject.js` when `languageId` matches (`javascript`, `typescript`, `json`, `markdown`, `yaml`, etc.).
- **clang-format** (C/C++/Java): Bundle a WASM build (e.g. `clang-format.js`) and invoke it on the editor text.
- **Black** (Python): You can use a WebAssembly port or call a local service you run yourself; Chrome extensions cannot load remote code.

Remember to add any added files to `web_accessible_resources` and reference them locally—Chrome extensions cannot execute code from remote URLs.

## Example

**Before formatting:**
```java
public class Solution{
public static void main(String[]args){
if(true){
System.out.println("test");
for(int i=0;i<10;i++){
System.out.println(i);
}
}
}
}
```

**After formatting:**
```java
public class Solution {

    public static void main(String[] args) {
        if (true) {
            System.out.println("test");
            for (int i = 0; i < 10; i++) {
                System.out.println(i);
            }
        }
    }
}
```

## Known limitations

- HackerRank occasionally changes its DOM and editor wrappers; the button placement is best-effort
- The fallback formatter focuses on indentation and basic structure rather than comprehensive style rules
- Monaco's built-in formatters may vary in quality depending on the language