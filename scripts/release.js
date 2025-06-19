// const inquirer = require('inquirer');
// const { build } = require('electron-builder');
// const { execSync } = require('child_process');
// const semver = require('semver');

// (async () => {
//   const answers = await inquirer.prompt([
//     {
//       name: 'githubToken',
//       type: 'password',
//       message: 'Enter your GitHub Token:',
//       mask: '*',
//       validate: (input) => input ? true : 'GitHub token is required'
//     },
//     {
//       name: 'channel',
//       type: 'list',
//       message: 'Select release channel:',
//       choices: ['latest', 'beta', 'alpha'],
//     },
//     {
//       name: 'versionSuffix',
//       type: 'input',
//       message: 'Optional: Append custom version suffix (e.g. beta.3, alpha.2):',
//     }
//   ]);

//   process.env.GH_TOKEN = answers.githubToken;
//   const channel = answers.channel;

//   console.log(`🔍 Fetching latest version from GitHub...`);
//   let latestVersion = '0.0.0';
//   try {
//     execSync('git fetch --tags').toString().trim();
//     const rawTagsOutput = execSync(`${channel === 'latest' ? 'git tag --sort=-v:refname | grep -vE "(alpha|beta|rc)"' : `git tag -l "*${channel}*" --sort=-v:refname`}`).toString().trim();
//     const rawTags = rawTagsOutput ? rawTagsOutput.split('\n') : [];
//     const validTags = rawTags.filter(tag => {
//       try {
//         return semver.valid(semver.clean(tag));
//       } catch (e) {
//         return false;
//       }
//     });

//     if (validTags.length > 0) {
//       const latestTag = validTags[0];
//       latestVersion = semver.clean(latestTag) || '0.0.0';
//     }
//     console.log('✅ Current Version:', latestVersion);
//   } catch (error) {
//     console.log('⚠️ No Git tags found, using default version 1.0.0');
//   }

//   const parsed = semver.parse(latestVersion);
//   let release;
//   if (parsed.minor >= 10) {
//     release = 'major';
//   } else if (parsed.patch >= 10) {
//     release = 'minor';
//   } else {
//     release = 'patch';
//   }

//   const nextVersion = semver.inc(
//     latestVersion,
//     channel === 'latest' ? release : 'prerelease',
//     answers.versionSuffix || channel
//   );
//   console.log(`📦 Next version will be: ${nextVersion}`);

//   // Update package.json
//   const fs = require('fs');
//   const pkgPath = './package.json';
//   const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
//   pkg.version = nextVersion;
//   fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

//   // Build and publish
//   await build({
//     publish: 'always',
//     config: {
//       ...pkg.build,
//       publish: {
//         provider: 'github',
//         owner: 'IW0127',
//         repo: 'electron',
//         releaseType: channel === 'latest' ? 'release' : 'prerelease',
//         channel: channel
//       }
//     }
//   });

//   console.log(`✅ Successfully published ${nextVersion} to "${channel}" channel.`);
// })();




const inquirer = require('inquirer');
const { build } = require('electron-builder');
const { execSync } = require('child_process');
const semver = require('semver');
const fs = require('fs');

(async () => {
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

  console.log(`🔍 Fetching latest version from GitHub...`);
  let latestVersion = '0.0.0';
  try {
    execSync('git fetch --tags').toString().trim();
    const rawTagsOutput = execSync(
      channel === 'latest'
        ? 'git tag --sort=-v:refname | grep -vE "(alpha|beta|rc)"'
        : `git tag -l "*${channel}*" --sort=-v:refname`
    ).toString().trim();

    const rawTags = rawTagsOutput ? rawTagsOutput.split('\n') : [];
    console.log('rawTags', rawTags);

    const validTags = rawTags.filter(tag => {
      try {
        return semver.valid(semver.clean(tag));
      } catch {
        return false;
      }
    });

    if (validTags.length > 0) {
      const latestTag = validTags[0];
      latestVersion = semver.clean(latestTag) || '0.0.0';
    }
    console.log('✅ Current Version:', latestVersion);
  } catch (error) {
    console.log('⚠️ No Git tags found, using default version 1.0.0');
    latestVersion = '1.0.0';
  }

  // Custom increment logic
  const parsed = semver.parse(latestVersion);
  let nextVersion;

  if (parsed.patch >= 9) {
    parsed.patch = 1;
    parsed.minor += 1;
    nextVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  } else {
    parsed.patch += 1;
    nextVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  // If suffix is explicitly provided, add it
  if (answers.versionSuffix) {
    nextVersion += `-${answers.versionSuffix}`;
  }
  console.log(`📦 Next version will be: ${nextVersion}`);
  
  // Update package.json
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // Build and publish
  await build({
    publish: 'always',
    config: {
      ...pkg.build,
      publish: {
        provider: 'github',
        owner: 'IW0127',
        repo: 'electron',
        releaseType: channel === 'latest' ? 'release' : 'prerelease',
        channel: channel
      }
    }
  });

  console.log(`✅ Successfully published ${nextVersion} to "${channel}" channel.`);
})();
