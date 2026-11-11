import { mkdir, writeFile } from 'node:fs/promises';
const root = 'landing-page/assets/fonts';
await mkdir(root, { recursive: true });
const jobs = [
  ['manrope', 'Manrope:wght@400;500;600;700;800', 'manrope']
];
for (const [name, query, repo] of jobs) {
  const response = await fetch(`https://fonts.googleapis.com/css2?family=${query}&display=swap`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } });
  if (!response.ok) throw new Error(`Font CSS ${name}: ${response.status}`);
  const css = await response.text();
  await writeFile(`${root}/${name}-source.css`, css);
  const latin = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map(m => m[1]);
  if (!latin.length) throw new Error(`No Latin font found for ${name}`);
  for (const [i, block] of latin.entries()) {
    const url = block.match(/url\(([^)]+)\)/)?.[1];
    if (!url) throw new Error(`No URL in ${name}`);
    const font = await fetch(url);
    if (!font.ok) throw new Error(`Font binary ${name}: ${font.status}`);
    const suffix = name === 'instrument-serif' && /font-style:\s*italic/.test(block) ? '-italic' : '';
    // Google may repeat a variable font URL for individual requested weights.
    await writeFile(`${root}/${name}${suffix}.woff2`, Buffer.from(await font.arrayBuffer()));
    if (i === 0) console.log(`Saved ${name} Latin font`);
  }
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${repo}/OFL.txt`);
  if (!license.ok) throw new Error(`License ${name}: ${license.status}`);
  await writeFile(`${root}/${name}-OFL.txt`, await license.text());
}
console.log('Active Manrope font family and license downloaded. Archived fonts are untouched.');
