/**
 * Simple and robust Valve Data Format (VDF / ACF) parser
 * Parses KeyValues format used by Steam for libraryfolders.vdf and appmanifest_*.acf
 */
export function parseVDF(text: string): Record<string, any> {
  const lines = text.split(/\r?\n/);
  const root: Record<string, any> = {};
  const stack: Array<Record<string, any>> = [root];
  const keyStack: string[] = [];

  const regex = /"([^"]*)"\s*(?:"([^"]*)"|({))?|({)|(})/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match[5] === '}') {
        // Close object
        if (stack.length > 1) {
          stack.pop();
          keyStack.pop();
        }
      } else if (match[4] === '{' || match[3] === '{') {
        // Open object
        const key = match[1] || keyStack[keyStack.length - 1] || 'object';
        const newObj: Record<string, any> = {};
        const current = stack[stack.length - 1];
        
        if (current) {
          if (current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])) {
            // Already exists as object or array
            if (!Array.isArray(current[key])) {
              current[key] = [current[key], newObj];
            } else {
              current[key].push(newObj);
            }
          } else {
            current[key] = newObj;
          }
        }
        stack.push(newObj);
      } else if (match[1] !== undefined && match[2] !== undefined) {
        // Key-value pair
        const current = stack[stack.length - 1];
        if (current) {
          current[match[1]] = match[2];
        }
      } else if (match[1] !== undefined) {
        // Key followed by subsequent {
        keyStack.push(match[1]);
      }
    }
  }

  return root;
}
