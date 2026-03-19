const fs = require('fs');
const code = fs.readFileSync('ai-agent.js', 'utf8');
const start = code.indexOf('const INTELLIGENCE');
let braceCount = 0;
let end = -1;
for (let i = code.indexOf('{', start); i < code.length; i++) {
  const c = code[i];
  if (c === '{') braceCount++;
  if (c === '}') {
    braceCount--;
    if (braceCount === 0) {
      end = i;
      break;
    }
  }
}
console.log('INTELLIGENCE block ends at char', end, 'line', code.substring(0, end).split('\n').length);
const block = code.substring(start, end + 2);
console.log('Block length:', block.length);
console.log('Last 50 chars:', JSON.stringify(block.substring(block.length - 50)));
try {
  eval(block);
  console.log('SUCCESS - INTELLIGENCE works');
  console.log('fixEmail:', INTELLIGENCE.fixEmail('matty at gmail dot com'));
  console.log('isSkip:', INTELLIGENCE.isSkip('skip'));
  console.log('isYes:', INTELLIGENCE.isYes('yes'));
} catch(e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack.split('\n').slice(0, 3).join('\n'));
}
