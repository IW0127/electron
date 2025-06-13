// scripts/release.js
const inquirer = require('inquirer');
const { build } = require('electron-builder');
const { execSync } = require('child_process');
const semver = require('semver');
const fs = require('fs');

(async () => {
  try {
    const answers = await inquirer.prompt([
      {
        name: 'githubToken',
        type: 'password',
        message: 'Enter your GitHub Token:',
        mask: '*',
        validate: input => input ? true : 'GitHub token is required'
      },
      {
        name: 'channel',
        type: 'list',
        message: 'Select release channel:',
        choices: ['latest', 'beta', 'alpha']
      },
      {
        name: 'versionSuffix',
        type: 'input',
        message: 'Optional: Append custom version suffix (e.g. beta.3, alpha.2):',
        validate: input => !input || semver.valid(`1.0.0-${input}`) ? true : 'Invalid suffix (use like beta.3)'
      }
    ]);

    process.env.GH_TOKEN = answers.githubToken;

    // Fetch tags safely
    const rawTagsOutput = execSync('git tag --sort=-v:refname').toString().trim();
    const rawTags = rawTagsOutput ? rawTagsOutput.split('\n') : [];
    const validTags = rawTags.filter(tag => semver.valid(semver.clean(tag)));
    const latestTag = validTags[0];
    const latestVersion = semver.clean(latestTag) || '1.0.0';

    // Determine new version
    const nextVersion = semver.inc(
      latestVersion,
      answers.channel === 'latest' ? 'patch' : 'prerelease',
      answers.versionSuffix || answers.channel
    );

    console.log(`📦 Latest tag: ${latestTag || 'none'}`);
    console.log(`🚀 Releasing version: ${nextVersion}`);

    // Update package.json
    const pkgPath = './package.json';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    /* // Git commit + tag (optional)
    execSync(`git add package.json`);
    execSync(`git commit -m "release: v${nextVersion}"`);
    execSync(`git tag v${nextVersion}`);
    execSync(`git push && git push origin v${nextVersion}`); */

    // Run electron-builder
    await build({
      publish: 'always',
      config: {
        ...pkg.build,
        publish: {
          provider: 'github',
          repo: 'electron',
          owner: 'IW0127',
          releaseType: answers.channel === 'latest' ? 'release' : 'prerelease',
          channel: answers.channel,
          vPrefixedTagName: true
        }
      }
    });

    console.log(`✅ Published ${nextVersion} to "${answers.channel}" channel.`);
  } catch (err) {
    console.error('❌ Release failed:', err.message);
  }
})();
