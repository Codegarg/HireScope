const fs = require('fs');
const path = 'c:\\Desktop folders\\HireScope\\client\\src\\pages\\ResumeEditor.jsx';
let content = fs.readFileSync(path, 'utf8');

const monthNames = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)";
const datePart = `(?:${monthNames}\\s+)?(?:[0-9]{4}|Present)`;

// New logic to inject
const newLogic = `                                // 2. Sub-headings & Projects (Refined alignment)
                                const monthNames = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)";
                                const datePart = \`(?:\${monthNames}\\\\s+)?(?:[0-9]{4}|Present)\`;
                                const dateRangeRegex = new RegExp(\`^(.+?)\\\\s+(${datePart}\\\\s*[-–]\\\\s*${datePart})$\`, 'i');
                                
                                const dateMatch = trimmed.match(dateRangeRegex);
                                if (dateMatch) {
                                    return (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '0.05rem', fontSize: '0.86rem', color: '#000' }}>
                                            <span>{dateMatch[1].trim()}</span>
                                            <span style={{ textAlign: 'right', marginLeft: '1rem' }}>{dateMatch[2].trim()}</span>
                                        </div>
                                    );
                                }

                                // 3. Project Names or Subtitles Highlight (Bold)
                                const isProjectLine = (trimmed.includes('—') || trimmed.includes('–') || (trimmed.includes(' - ') && trimmed.length < 100)) && !trimmed.startsWith('•');
                                const prevLine = arr[idx - 1] || '';
                                const genDateRegex = new RegExp(\`\\\\b\${datePart}\\\\b\`, 'i');
                                const prevHadDate = prevLine.match(genDateRegex);

                                if ((isProjectLine && (section.title.toLowerCase().includes('project') || trimmed.length < 65)) || (prevHadDate && trimmed.length < 90 && !trimmed.includes('•'))) {
                                     return (
                                        <div key={idx} style={{ fontWeight: '700', marginBottom: '0.15rem', color: '#000', fontSize: '0.86rem' }}>
                                            {trimmed}
                                        </div>
                                    );
                                }`;

// Find the section body map block in SectionCard (approx lines 186-240)
// Matching the start of the date logic and end of subtitles logic
const targetStart = /\/\/ 2\. Sub-headings with Dates \(Split left\/right\)/;
const targetEnd = /\/\/ 4\. Bold Keys/;

const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (targetStart.test(lines[i])) startIdx = i;
    if (targetEnd.test(lines[i]) && startIdx !== -1) {
        endIdx = i;
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = [...lines.slice(0, startIdx), newLogic, "", ...lines.slice(endIdx)];
    fs.writeFileSync(path, newLines.join('\n'), 'utf8');
    console.log("Successfully patched SectionCard!");
} else {
    console.error("Could not find patch target in SectionCard. Start:", startIdx, "End:", endIdx);
    process.exit(1);
}
