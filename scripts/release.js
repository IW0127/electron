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
    }
  ]);

  process.env.GH_TOKEN = answers.githubToken;
  const channel = answers.channel;

  console.log(`🔍 Fetching latest version from GitHub...`);
  execSync('git fetch --tags');

  const getLatestVersionForChannel = (ch) => {
    try {
      const rawTagsOutput = execSync(
        ch === 'latest'
          ? 'git tag --sort=-v:refname | grep -vE "(alpha|beta|rc)"'
          : `git tag -l "*${ch}*" --sort=-v:refname`
      ).toString().trim();

      const rawTags = rawTagsOutput ? rawTagsOutput.split('\n') : [];

      const validTags = rawTags
        .map(tag => semver.clean(tag))
        .filter(tag => semver.valid(tag))
        .sort(semver.rcompare); // Highest version first

      return validTags[0] || '0.0.0';
    } catch {
      return '0.0.0';
    }
  };

  // Check flow rule
  const alphaVersion = getLatestVersionForChannel('alpha');
  const betaVersion = getLatestVersionForChannel('beta');
  const latestStableVersion = getLatestVersionForChannel('latest');

  console.log('\n🔎 Version Flow Check:');
  console.log(`   alpha  : ${alphaVersion}`);
  console.log(`   beta   : ${betaVersion}`);
  console.log(`   latest : ${latestStableVersion}`);
  console.log('channel:', channel);
  console.log('semver.lt(betaVersion, alphaVersion):', semver.lt(betaVersion, alphaVersion));

  if (channel === 'beta' && !semver.lt(betaVersion, alphaVersion)) {
    console.error('❌ Cannot deploy to beta: beta version is not less than alpha.');
    process.exit(1);
  }

  if (channel === 'latest' && !semver.lt(latestStableVersion, betaVersion)) {
    console.error('❌ Cannot deploy to latest: latest version is not less than beta.');
    process.exit(1);
  }


  // Get current latest version for this channel
  let latestVersion = getLatestVersionForChannel(channel);
  // Increment logic
  const parsed = semver.parse(latestVersion);
  let nextVersion;

  if (parsed.patch >= 10) {
    parsed.patch = 0;
    parsed.minor += 1;
  } else {
    parsed.patch += 1;
  }
  
  if (parsed.minor >= 10) {
    parsed.minor = 0;
    parsed.major += 1;
  }
  nextVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;

  if (channel) {
    nextVersion += `-${channel}`;
  }

  console.log(`📦 Next version will be: ${nextVersion}`);
  // Update package.json
  const pkgPath = './package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = nextVersion;

  // Set unique appId, productName, output directory per channel
  const appIdMap = {
    latest: 'com.electron.hrms',
    beta: 'com.electron.hrms.beta',
    alpha: 'com.electron.hrms.alpha'
  };

  const productNameMap = {
    latest: 'hrms',
    beta: 'hrms Beta',
    alpha: 'hrms Alpha'
  };

  const outputDir = `../${channel}`;
  pkg.name = 'hrms' + channel;
  pkg.build = {
    ...pkg.build,
    appId: appIdMap[channel],
    productName: productNameMap[channel],
    directories: {
      output: outputDir,
      buildResources: 'assets'
    }
  };

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
