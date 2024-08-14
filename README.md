
# GDrive CLI

An interactive command-line interface (CLI) tool for interacting with Google Drive, built in Node.js. It allows users to perform various operations such as uploading, downloading, and managing files, trash and directories on Google Drive directly from the terminal.


## Features

- Upload files and directories to Google Drive
- Download items from Google Drive
- Custom interactive prompt (inquirer.js)
- You can scrape web pages such as images and videos, and directly upload them to Google Drive
- Optimized concurrent operations 
- Authentication with OAuth2


## Installation
1. Before you start, ensure you have Node.js installed.
    
```bash
git clone https://github.com/Kostaaa1/gdrive-cli.git
cd gdrive-cli
```

2. Install dependencies

```bash
npm install
```

## Usage

1. Obtain Google API Credentials (https://developers.google.com/identity/protocols/oauth2)
    * Go to the Google API Console.
    * Create a new project or select an existing one.
    * Enable the Google Drive API for your project.
    * Create OAuth 2.0 client IDs and obtain the necessary fields.

3. Set Up Environment Variables
    Create a .env file in the root directory of your project and add the following environment variables with your credentials:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URL=your_redirect_url
GOOGLE_AUTH_ENDPOINT=your_auth_endpoint
```

3. Run the script
        
    To start the script, use the following command:
``` bash
npm run start
```

4. Authentication and Token Storage
    * When the script starts:
        * The directory and file at `tokens/googleDriveToken.json` will be created automatically if they do not exist.
        * The tokens will be saved in the tokens/googleDriveToken.json file after user authentication, using the authenticated user's email as a key.
   