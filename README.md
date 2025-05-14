# ThatRightDeal

A repository for the ThatRightDeal project.

## Description

This repository contains the source code and resources for the ThatRightDeal project. It uses Supabase PostgreSQL as a service database for data storage and retrieval.

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

2. Edit the `.env` file and replace the placeholder values with your actual API keys and configuration.

3. The following environment variables are used in this project:

   - **ATTOM API**

     - `ATTOM_API_KEY`: API key for accessing ATTOM property data services

   - **Supabase Configuration**
     - `SUPABASE_URL`: Your Supabase project URL (e.g., https://xyzproject.supabase.co)
     - `SUPABASE_KEY`: Your Supabase anon/public key

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

### About Supabase

Supabase is an open-source Firebase alternative that provides:

- PostgreSQL Database: A powerful, open-source relational database
- Authentication: User management and authentication
- Auto-generated APIs: Instant RESTful APIs for your database
- Storage: File storage with security rules
- Realtime: Build realtime applications

This project uses Supabase as a service database to store and retrieve data. For more information about Supabase, visit [Supabase](https://supabase.com/).

## Database Setup

To use the Supabase PostgreSQL database with this project:

1. Create a Supabase account at [supabase.com](https://supabase.com/) if you don't have one already.
2. Create a new Supabase project.
3. In your Supabase project dashboard, navigate to Settings > API to find your project URL and anon/public key.
4. Add these values to your `.env` file as `SUPABASE_URL` and `SUPABASE_KEY`.
5. Create the necessary tables in your Supabase database:

   - `api_data`: Stores data fetched from external APIs
     - Columns:
       - `id`: UUID (primary key, auto-generated)
       - `userId`: Integer
       - `title`: Text
       - `body`: Text
       - `fetched_at`: Timestamp

   You can create this table using the Supabase dashboard or with the following SQL:

   ```sql
   CREATE TABLE api_data (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     userId INTEGER,
     title TEXT,
     body TEXT,
     fetched_at TIMESTAMP WITH TIME ZONE
   );
   ```

## Scripts

- `npm start`: Start the application and test the Supabase connection
- `npm run daily-task`: Run the daily task script that fetches data and stores it in Supabase

## GitHub Actions Workflow

This project includes a GitHub Actions workflow that runs the daily task automatically:

1. **Schedule**: The workflow runs daily at midnight UTC
2. **Manual Trigger**: You can also trigger the workflow manually from the Actions tab

### Setting up GitHub Secrets

To make the GitHub Actions workflow work correctly, you need to add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click on "Secrets and variables" → "Actions"
4. Click on "New repository secret"
5. Add the following secrets:
   - `ATTOM_API_KEY`: Your ATTOM API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key

These secrets will be used to create the `.env` file during the workflow execution, ensuring that both the ATTOM API and Supabase are properly configured.

## License

This project is licensed under the MIT License.
