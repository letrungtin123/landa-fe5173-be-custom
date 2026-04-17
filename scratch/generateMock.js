const fs = require('fs');

const mockFile = fs.readFileSync('src/data/mock.ts', 'utf8');

// We will inject a dynamic mockLessons generator directly in the file instead!
