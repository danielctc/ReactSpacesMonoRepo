# Disruptive Spaces Website

This is the main marketing website for Disruptive Spaces, built with React, Vite, and Chakra UI.

## Features

- Modern, responsive design
- Integration with header-auth-links for authentication
- SEO-friendly with React Helmet
- Fast development with Vite

## Development

To start the development server:

```bash
npm run dev
```

This will start the server at http://localhost:3001.

## Building for Production

To build the website for production:

```bash
npm run build
```

This will create a `dist` directory with the compiled assets.

## Previewing the Production Build

To preview the production build locally:

```bash
npm run preview
```

## Integration with Header Auth Links

The website integrates with the `@disruptive-spaces/header-auth-links` package to provide authentication functionality in the header. This includes:

- Login/Register buttons for unauthenticated users
- User profile display and menu for authenticated users
- Profile editing functionality

## Folder Structure

```
packages/website/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # Entry point
│   ├── theme.js        # Chakra UI theme
│   └── index.css       # Global styles
├── index.html          # HTML template
└── vite.config.js      # Vite configuration
``` 