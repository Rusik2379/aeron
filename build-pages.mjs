import fs from 'node:fs';
import path from 'node:path';
import config from './site.config.mjs';

// Pages serves the public preview. The Node deployment keeps its own settings.
config.formEndpoint = '';
config.siteUrl = '';
const {pages} = await import('./build.mjs');

for (const {route} of pages) {
  const file = path.join('dist', route);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
  if (route === '404.html') {
    const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'aeron';
    if (!/^[a-z0-9_.-]+$/i.test(repository)) throw new Error('Invalid GitHub repository name');
    const base = repository.endsWith('.github.io') ? '/' : `/${repository}/`;
    html = html.replace('<head>', `<head><base href="${base}">`);
  }
  fs.writeFileSync(file, html);
}
fs.writeFileSync('dist/.nojekyll', '');
fs.writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
console.log('GitHub Pages preview is ready. Forms prepare text locally; admin and SMTP require the Node server.');
