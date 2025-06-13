// scripts/release.js
const inquirer = require('inquirer');
const { build } = require('electron-builder');
const { execSync } = require('child_process');
const semver = require('semver');

(async () => {
  // Step 1: Ask user for details
  const answers = await inquirer.prompt([
    {
      name: 'githubToken',
      type: 'password',
      message: 'Enter your GitHub Token:',
      mask: '*',
      validate: (input) => input ? true : 'GitHub token is required'
    },
    {
      name: 'channel',
      type: 'list',
      message: 'Select release channel:',
      choices: ['latest', 'beta', 'alpha'],
    },
    {
      name: 'versionSuffix',
      type: 'input',
      message: 'Optional: Append custom version suffix (e.g. beta.3, alpha.2):',
    }
  ]);

  process.env.GH_TOKEN = answers.githubToken;
  const channel = answers.channel;

  // Step 2: Get latest version from GitHub
  console.log(`🔍 Fetching latest version from GitHub...`);
  let latestVersion = '0.0.0'; // Default version if no tags exist
  try {
    execSync('git fetch --tags').toString().trim();
    const rawTagsOutput = execSync(`${channel == 'latest' ? 'git tag --sort=-v:refname | grep -vE "(alpha|beta|rc)"' : `git tag  -l "*${channel}*" --sort=-v:refname`}`).toString().trim();
    const rawTags = rawTagsOutput ? rawTagsOutput.split('\n') : [];
    const validTags = rawTags.filter(tag => {
      try {
        return semver.valid(semver.clean(tag));
      } catch (e) {
        return false;
      }
    });

    if (validTags.length > 0) {
      const latestTag = validTags[0]; // Most recent valid semver tag
      latestVersion = semver.clean(latestTag) || '0.0.0';
    }
    console.log('✅ All Git Tags:', rawTags);
    console.log('✅ Current Version:', latestVersion);
  } catch (error) {
    console.log('⚠️ No Git tags found, using default version 1.0.0');
  }

  const nextVersion = semver.inc(
    latestVersion,
    channel === 'latest' ? 'patch' : 'prerelease',
    answers.versionSuffix || channel
  );

  console.log(`📦 Next version will be: ${nextVersion}`);

  // Step 3: Set version in package.json
  const fs = require('fs');
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  const config = pkg.build;
  // Step 4: Publish using electron-builder
  await build({
    publish: 'always',
    config: {
      ...pkg.build,
      publish: {
        provider: 'github',
        repo: 'IW0127/electron',
        owner: 'IW0127',
        releaseType: channel === 'latest' ? 'release' : 'prerelease',
        channel: channel
      }
    }
  });

  console.log(`✅ Successfully published ${nextVersion} to "${channel}" channel.`);
})();
