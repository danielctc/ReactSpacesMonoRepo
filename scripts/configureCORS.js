/**
 * Script to configure CORS for Firebase Storage
 * 
 * This script sets up CORS configuration for Firebase Storage to allow requests from localhost
 * 
 * Prerequisites:
 * 1. Install the Firebase CLI: npm install -g firebase-tools
 * 2. Login to Firebase: firebase login
 * 3. Install required packages: npm install cors-json-file
 * 
 * Usage:
 * node scripts/configureCORS.js
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Create a temporary CORS configuration file
const corsConfigPath = path.join(__dirname, 'cors.json');
const corsConfig = [
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
];

console.log('Creating CORS configuration file...');
fs.writeFileSync(corsConfigPath, JSON.stringify(corsConfig, null, 2));

console.log('Applying CORS configuration to Firebase Storage...');
const command = `firebase storage:cors update ${corsConfigPath} --project disruptive-metaverse`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error applying CORS configuration: ${error.message}`);
    console.log('');
    console.log('You may need to run the following commands manually:');
    console.log('1. firebase login');
    console.log(`2. ${command}`);
    
    // Don't delete the file if there was an error
    console.log(`CORS configuration file created at: ${corsConfigPath}`);
    console.log('You can use this file for manual configuration.');
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(`stdout: ${stdout}`);
  console.log('CORS configuration successfully applied to Firebase Storage!');
  
  // Clean up the temporary file
  fs.unlinkSync(corsConfigPath);
  console.log('Temporary CORS configuration file deleted.');
  
  console.log('');
  console.log('You may need to restart your development server for the changes to take effect.');
}); 