## Set Up

### Environment Variables Setup

The application can run with built-in fallback Firebase credentials, but it's recommended to use your own environment variables for better security:

1. **Create the environment file**:
   Run `npm run create-env` to create an `.env` file from the template.

2. **Configure Firebase credentials**:
   - Option A: Use the built-in fallback credentials (no action needed)
   - Option B (recommended): Add your own Firebase credentials to the `.env` file

   If you encounter a `Firebase: Error (auth/invalid-api-key)` error, the application might be trying to use environment variables that aren't properly set. Either:
   - Make sure your `.env` file is properly configured with valid credentials
   - Or remove the `.env` file entirely to use the fallback values

### Install Dependencies

Use terminal in the root of the project and run:
```
npm i
```

For a complete setup (create environment file and install dependencies):
```
npm run setup
```

## Folder Tour

### /packages

Contains all the Micro frontends and shared code.

### /builds

Contains the last 10 builds, these are use to grab the last 5 versions from for the build.

### /dist

File ready for deployment to filebase hosting.

## Development

Each package can launch a dev environment

cd into /packages/{package-name} and run
`npm run dev`

### Testing package

There is a testing package that loads all the packages on a page.
To run this

`cd packages/testing`
`npm run dev`

For unity development builds the unity webgl build should be built into into packages/testing/public/devBuilds/SpacesMetaverse_SDK

There is one setup for packages/webgl/public/devBuilds/SpacesMetaverse_SDK
This is loaded in when you run a local dev environment for the webgl package.

Firebase has a webgl and space setup for this and will be looking for Build files here.

`cd packages/testing`
`npm run dev`

This is setup to load the SpacesMetaverse_SDK build using data from the firebase WebGlBuld record and space.

It gets the file paths from firebase (which are set to the local development url) and uses firebase user accounts, but loads the files from the local file system.

### To run any Micro frontend package

## Build

To run a full local build
Ensure you are in the root folder and run
`npm run build`

## Build and Deploy to firebase

Ensure you are in the root folder and run
`npm run deploy`

## Links

Individual micro frontends (directly on firebase hosting):
https://disruptive-metaverse.web.app/webgl
https://disruptive-metaverse.web.app/header-auth-links

Other follow this format.
https://disruptive-metaverse.web.app/{microframework-name}

WebFlow Test Page
https://spaces.disruptive.live/spaces/spaces-master-build

## Space Accessibility

### User Groups and Permissions

The system uses Firebase user groups to manage permissions. By default, all new users are added to the 'users' group.

### Space Access Control

Spaces can be configured with different access levels:

1. **Public Access (Default)**: By default, spaces have `accessibleToAllUsers` set to `true`, allowing any user in the 'users' group to access them.
2. **Restricted Access**: When `accessibleToAllUsers` is manually set to `false`, only users explicitly listed in the space's `usersAllowed`, `usersAdmin`, or `usersModerators` arrays can access it.

### Managing Space Accessibility

Space owners can manage accessibility settings through the Space Management modal:

1. Open the main menu in a space
2. Click "Manage Space"
3. Go to the "Settings" tab
4. Toggle the "Public Access" switch (on by default)

### Utility Scripts

The project includes utility scripts for managing space accessibility:

- `scripts/checkSpacesAccessibility.js`: Checks the current accessibility settings for all spaces
- `scripts/setSpacesAccessible.js`: Sets the `accessibleToAllUsers` field for all spaces

To run these scripts:
```
node scripts/checkSpacesAccessibility.js
node scripts/setSpacesAccessible.js
```

Note: You'll need to add your Firebase configuration to these scripts before running them.

