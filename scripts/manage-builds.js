const fs = require('fs');
const path = require('path');

const buildsDir = path.join(__dirname, '..', 'builds');
const packagesDir = path.join(__dirname, '..', 'packages');
const distDir = path.join(__dirname, '..', 'dist');
const baseURL = "https://disruptive-metaverse.web.app"; // Base URL for hosted files

const maxBuilds = 10;  // Maximum number of build folders to keep
// Packages to exclude from deployment
const excludedPackages = ['website']; 

const COLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m'
};

/**
 * Ensures necessary directories exist.
 */
function ensureDirectories() {
    if (!fs.existsSync(buildsDir)) {
        fs.mkdirSync(buildsDir, { recursive: true });
    }
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    console.log('Directories ensured');
}

/**
 * Archives current builds to a new directory named with the current datetime.
 */
function archiveCurrentBuild() {
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const buildPath = path.join(buildsDir, dateStamp);
    fs.mkdirSync(buildPath, { recursive: true });

    fs.readdirSync(packagesDir).forEach(packageName => {
        // Skip excluded packages
        if (excludedPackages.includes(packageName)) {
            console.log(`Skipping excluded package: ${packageName}`);
            return;
        }
        
        const packagePath = path.join(packagesDir, packageName);
        const packageDistPath = path.join(packagePath, 'dist');
        if (fs.existsSync(packageDistPath) && fs.statSync(packageDistPath).isDirectory()) {
            const packageDest = path.join(buildPath, packageName);
            copyDirectory(packageDistPath, packageDest);
        }
    });

    console.log(`Build archived at ${buildPath}`);
    cleanupOldBuilds();
}

/**
 * Copies contents from source directory to target directory recursively.
 */
function copyDirectory(source, target) {
    fs.mkdirSync(target, { recursive: true });
    const items = fs.readdirSync(source);
    items.forEach(item => {
        const srcFile = path.join(source, item);
        const tgtFile = path.join(target, item);
        if (fs.statSync(srcFile).isDirectory()) {
            copyDirectory(srcFile, tgtFile);
        } else {
            fs.copyFileSync(srcFile, tgtFile);
        }
    });
}

/**
 * Removes old build directories to maintain only a maximum number of builds.
 */
function cleanupOldBuilds() {
    const builds = fs.readdirSync(buildsDir)
        .map(build => ({ name: build, time: fs.statSync(path.join(buildsDir, build)).mtime }))
        .sort((a, b) => b.time - a.time);  // Sort by modification time, newest first

    while (builds.length > maxBuilds) {
        const oldest = builds.pop(); // Get the oldest build directory
        fs.rm(path.join(buildsDir, oldest.name), { recursive: true }, (err) => {
            if (err) {
                console.error(`Error removing old build directory ${oldest.name}: ${err}`);
            } else {
                console.log(`Removed old build directory: ${oldest.name}`);
            }
        });
    }
}

/**
 * Populates the /dist directory with the latest version of each JS bundle file from all builds.
 */
function populateDistWithHistoricalBuilds() {
    ensureDirectories();
    const latestFiles = {}; // Store paths to manage file versions

    fs.readdirSync(buildsDir).forEach(build => {
        const buildPath = path.join(buildsDir, build);
        if (fs.statSync(buildPath).isDirectory()) {
            fs.readdirSync(buildPath).forEach(package => {
                // Skip excluded packages
                if (excludedPackages.includes(package)) {
                    return;
                }
                
                const assetsPath = path.join(buildPath, package, 'assets');
                if (fs.existsSync(assetsPath) && fs.statSync(assetsPath).isDirectory()) {
                    fs.readdirSync(assetsPath).forEach(file => {
                        if (file.endsWith('.js')) {
                            const fullPath = path.join(assetsPath, file);
                            const targetDir = path.join(distDir, package, 'assets');
                            if (!fs.existsSync(targetDir)) {
                                fs.mkdirSync(targetDir, { recursive: true });
                            }
                            fs.copyFileSync(fullPath, path.join(targetDir, file));
                        }
                    });
                }
            });
        }
    });

    // Log script tags for the latest versions of each file
    logScriptTags();
}

/**
 * Logs HTML script tags for embedding the latest JS files.
 */
function logScriptTags() {
    console.log(`\n${COLORS.GREEN}==============================================================================================================`);
    console.log(`Latest script tags for WebFlow:`);
    console.log(`--------------------------------------------------------------------------------------------------------------${COLORS.RESET}`);
    fs.readdirSync(distDir).forEach(package => {
        // Skip excluded packages and testing
        if (package === 'testing' || excludedPackages.includes(package)) {
            return;
        }
        const assetsPath = path.join(distDir, package, 'assets');
        if (fs.existsSync(assetsPath) && fs.statSync(assetsPath).isDirectory()) {
            fs.readdirSync(assetsPath).forEach(file => {
                if (file.endsWith('.js')) {
                    const scriptPath = `${baseURL}/${package}/assets/${file}`;
                    console.log(`\n${COLORS.CYAN}<!-- ${package} -->${COLORS.RESET}`);
                    console.log(`<script type="module" crossorigin src="${scriptPath}"></script>`);
                }
            });
        }
    });
    console.log(`\n${COLORS.GREEN}--------------------------------------------------------------------------------------------------------------${COLORS.RESET}`);
    console.log(`Manage WebFlow scripts here: ${COLORS.BLUE}https://webflow.com/dashboard/sites/disruptive-spaces/code${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}==============================================================================================================${COLORS.RESET}\n`);
}

/**
 * Removes 'devBuilds' directory from the distribution folder.
 */
function removeDevBuildsFromDist() {
    const devBuildsDistPath = path.join(distDir, 'webgl', 'devBuilds'); // Adjust 'webgl' if necessary for other packages
    if (fs.existsSync(devBuildsDistPath)) {
        fs.rmSync(devBuildsDistPath, { recursive: true, force: true });
        console.log(`Removed 'devBuilds' from dist: ${devBuildsDistPath}`);
    }
}

function main() {
    ensureDirectories();
    archiveCurrentBuild();
    populateDistWithHistoricalBuilds();
    removeDevBuildsFromDist();
}

main();
