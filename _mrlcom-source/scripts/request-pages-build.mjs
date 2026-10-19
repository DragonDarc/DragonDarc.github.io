const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (repository !== 'DragonDarc/DragonDarc.github.io' || !token) throw new Error('Run this publication step in the owner repository workflow');
const url = `https://api.github.com/repos/${repository}/pages/builds`;
const response = await fetch(url, {
  method: 'POST',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'MRLCOM-publication',
  },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`GitHub Pages build request failed: HTTP ${response.status}`);
console.log('GitHub Pages publication requested for https://dragondarc.github.io/mrlcom/');
