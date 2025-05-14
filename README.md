# ThatRightDeal

A repository for the ThatRightDeal project.

## Description

This repository contains the source code and resources for the ThatRightDeal project.

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (v6 or higher recommended)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/username/ThatRightDeal.git
   cd ThatRightDeal
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file and add your actual API keys and configuration values.

## Environment Configuration

This project uses environment variables to manage API keys and other sensitive configuration. The following steps explain how to set up your environment:

1. Copy the example environment file:

   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholder value with your actual ATTOM API key.

3. The following environment variable is used in this project:

   - **ATTOM API**
     - `ATTOM_API_KEY`: API key for accessing ATTOM property data services

4. The `.env` file is excluded from version control in `.gitignore` to prevent exposing sensitive information.

### About ATTOM API

The ATTOM API provides access to property data, including:

- Property characteristics
- Owner information
- Tax assessments
- Sales history
- Foreclosure data
- And more

For more information about the ATTOM API, visit [ATTOM Data Solutions](https://www.attomdata.com/).

## Scripts

- `npm start`: Start the application
- `npm run daily-task`: Run the daily task script

## License

This project is licensed under the MIT License.
