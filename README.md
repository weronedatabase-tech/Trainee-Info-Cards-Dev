# Trainee Info Cards

This repository contains the source code for the Trainee Info Cards application.

## Structure

- **frontend/**: Contains the modularized CSS and JavaScript for the web application UI.
- **backend/**: Contains the Google Apps Script code (\`code.js\`) and the shared configuration (\`config.js\`).
- **assets/**: Contains static assets such as icons.
- **index.html**: The main entry point for the static web app.
- **.github/workflows/**: Contains CI/CD pipelines, including automatic deployment to Google Apps Script.

## Environments

The application supports three environments, controlled by \`ACTIVE_ENV\` in \`backend/config.js\`:
- **DEV**: Development environment (Displays a red "TESTING" banner)
- **EXP**: Experimentation environment (Displays a purple "EXPERIMENTATION" banner)
- **PROD**: Production environment (No banner)

## Continuous Deployment

Changes to the \`backend/\` directory are automatically deployed to Google Apps Script via the GitHub Action defined in \`.github/workflows/deploy-gas.yml\`. Ensure you have the required secrets configured in your GitHub repository (\`GAS_SCRIPT_ID\`, \`GAS_DEPLOYMENT_ID\`, \`CLASPRC_JSON\`).
