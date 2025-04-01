/**
 * Script to create an .env file from .env.example
 * 
 * This script helps users quickly set up their environment by copying
 * the example file and prompting them to fill in the values.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const exampleEnvPath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('An .env file already exists. Do you want to overwrite it? (y/n)');
  rl.question('', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('Operation cancelled. Your existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  // Check if .env.example exists
  if (!fs.existsSync(exampleEnvPath)) {
    console.error('.env.example file not found in the root directory.');
    rl.close();
    return;
  }

  // Read the example file
  const exampleEnv = fs.readFileSync(exampleEnvPath, 'utf8');
  
  // Copy example to .env
  fs.writeFileSync(envPath, exampleEnv);
  
  console.log('\x1b[32m%s\x1b[0m', 'Success! .env file created from .env.example');
  console.log('\x1b[33m%s\x1b[0m', 'IMPORTANT: You need to edit the .env file and replace the placeholder values with your actual Firebase credentials');
  console.log('Open the file at:', envPath);
  console.log('');
  console.log('Instructions:');
  console.log('1. Go to your Firebase Console > Project Settings');
  console.log('2. Copy your Web API Key and other configuration values');
  console.log('3. Replace the placeholder values in the .env file');
  console.log('4. Restart your development server if it\'s currently running');
  rl.close();
}

// Add event listeners
rl.on('close', () => {
  process.exit(0);
}); 