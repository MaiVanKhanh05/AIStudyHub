const fs = require('fs');

const path = 'd:/AIStudyHub/backend/src/controllers/admin.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Remove hotDoc imports if any
content = content.replace(/import\s+\*\s+as\s+hotDocRepository\s+from\s+['"].*?['"];?\n?/g, '');
content = content.replace(/import\s+\*\s+as\s+lecturerRepository\s+from\s+['"].*?['"];?\n?/g, '');

// Remove getHotDocs, getLecturers, sendHotDocReview functions
content = content.replace(/\n\/\/\s*GET\s*\/api\/admin\/hot-docs[\s\S]*?export const getHotDocs = async \(req, res\) => {[\s\S]*?};\n/g, '');
content = content.replace(/\n\/\/\s*GET\s*\/api\/admin\/lecturers[\s\S]*?export const getLecturers = async \(req, res\) => {[\s\S]*?};\n/g, '');
content = content.replace(/\n\/\/\s*POST\s*\/api\/admin\/hot-docs\/:id\/review[\s\S]*?export const sendHotDocReview = async \(req, res\) => {[\s\S]*?};\n/g, '');

// Also remove them if they don't have the comments above them:
content = content.replace(/export const getHotDocs = async \(req, res\) => {[\s\S]*?};\n/g, '');
content = content.replace(/export const getLecturers = async \(req, res\) => {[\s\S]*?};\n/g, '');
content = content.replace(/export const sendHotDocReview = async \(req, res\) => {[\s\S]*?};\n/g, '');

fs.writeFileSync(path, content);
console.log('Fixed admin.controller.js');
