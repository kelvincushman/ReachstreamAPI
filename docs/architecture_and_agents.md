

# CreatorScrape: Technical Architecture & Claude Code Agent Specifications

**Version**: 1.0
**Date**: October 20, 2025
**Author**: Manus AI

## 1. Technical Architecture

This section outlines the technical architecture for the CreatorScrape platform. The architecture is designed to be scalable, resilient, and cost-effective, leveraging a combination of serverless and managed services on AWS. The entire infrastructure will be provisioned and managed by Claude Code agents.

### 1.1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph User
        A[Developer] --> B{Browser}
    end

    subgraph Frontend (Astro + React on AWS Amplify)
        B --> C[Marketing Website]
        B --> D[Developer Dashboard]
    end

    subgraph Backend (Node.js on AWS Fargate)
        D --> E[API Gateway]
        E --> F[Auth Service]
        E --> G[Billing Service]
        E --> H[API Service]
        F --> I[Supabase (PostgreSQL)]
        G --> I
        H --> J[Scraping Engine]
    end

    subgraph Scraping Engine (AWS Lambda)
        J --> K[TikTok Scraper]
        J --> L[Instagram Scraper]
        J --> M[YouTube Scraper]
        K --> N[Proxy Rotator]
        L --> N
        M --> N
    end

    subgraph External Services
        N --> O[Proxy Providers]
        G --> P[Stripe API]
    end
```

### 1.2. Component Breakdown

| Component | Technology | Hosting | Description |
| --- | --- | --- | --- |
| **Marketing Website** | Astro | AWS Amplify | Public-facing website to attract customers. |
| **Developer Dashboard** | React | AWS Amplify | User-facing dashboard for account and API management. |
| **API Gateway** | Amazon API Gateway | AWS | Manages all incoming API requests, routing, and authentication. |
| **Auth Service** | Node.js (Express) | AWS Fargate | Handles user registration, login, and API key management. |
| **Billing Service** | Node.js (Express) | AWS Fargate | Manages credit-based billing, payments, and subscriptions. |
| **API Service** | Node.js (Express) | AWS Fargate | The core API that orchestrates scraping jobs. |
| **Scraping Engine** | Node.js | AWS Lambda | A collection of serverless functions for scraping each platform. |
| **Proxy Rotator** | Node.js | AWS Lambda | Manages and rotates a pool of proxies to avoid blocking. |
| **Database** | PostgreSQL | Supabase | Stores user data, API keys, and billing information. |
| **Payment Processor** | Stripe | Stripe | Handles all credit card payments. |

### 1.3. Data Model

The database will be hosted on Supabase (PostgreSQL) and will consist of the following tables:

*   **users**: Stores user account information (id, email, password_hash, created_at).
*   **api_keys**: Stores API keys associated with users (id, user_id, key, created_at).
*   **credits**: Stores the credit balance for each user (id, user_id, balance).
*   **credit_purchases**: Logs all credit purchase transactions (id, user_id, amount, stripe_charge_id, created_at).
*   **api_requests**: Logs all API requests made by users (id, user_id, endpoint, status_code, created_at).



## 2. Claude Code Sub-Agent Specifications

To build the CreatorScrape platform, we will use a team of specialized Claude Code sub-agents. Each agent has a specific role and set of responsibilities, ensuring a modular and efficient development process. The agents will be orchestrated by the main Claude Code instance to perform their tasks in a coordinated manner.

### 2.1. Agent Orchestration

The main Claude Code agent will act as the **Project Manager**, orchestrating the other agents and ensuring the project stays on track. The development process will follow the phases outlined in the PRD, with the Project Manager delegating tasks to the appropriate sub-agents at each stage.

### 2.2. Sub-Agent Definitions

#### 1. Infrastructure Agent

*   **Name**: `infra-agent`
*   **Description**: Responsible for provisioning and managing all AWS infrastructure using the AWS CDK (Cloud Development Kit).
*   **Tools**: `aws-cli`, `aws-cdk`, `shell`
*   **System Prompt**:

    ```
    You are an expert in AWS and Infrastructure as Code. Your primary responsibility is to create and manage the AWS resources for the CreatorScrape platform using the AWS CDK. You will be given a component to provision, and you must write the necessary CDK code to create the resources, and then deploy them to the user's AWS account. You must ensure that all resources are created with the principle of least privilege and are configured for scalability and high availability.
    ```

#### 2. Backend Agent

*   **Name**: `backend-agent`
*   **Description**: Responsible for developing the Node.js backend services (Auth, Billing, and API).
*   **Tools**: `node`, `npm`, `file`, `shell`
*   **System Prompt**:

    ```
    You are a senior backend developer specializing in Node.js and Express. Your task is to build the backend services for the CreatorScrape platform. You will write clean, efficient, and well-documented code. You must follow the specifications in the PRD and the architecture document. You will be responsible for creating the API endpoints, implementing the business logic, and integrating with the database and other services.
    ```

#### 3. Scraper Agent

*   **Name**: `scraper-agent`
*   **Description**: Responsible for developing the individual scraper functions for each social media platform.
*   **Tools**: `node`, `npm`, `file`, `shell`, `impit`
*   **System Prompt**:

    ```
    You are a web scraping expert. Your mission is to build robust and reliable scrapers for various social media platforms. You will use the `impit` library to make browser-like requests and a pool of rotating proxies to avoid being blocked. You must analyze the target website's structure, identify the data to be extracted, and write a Node.js function that returns the data in a clean JSON format. Your scrapers will be deployed as AWS Lambda functions.
    ```

#### 4. Frontend Agent

*   **Name**: `frontend-agent`
*   **Description**: Responsible for building the marketing website and the developer dashboard.
*   **Tools**: `node`, `npm`, `file`, `shell`, `astro`, `react`
*   **System Prompt**:

    ```
    You are a skilled frontend developer with expertise in Astro and React. Your job is to create a beautiful and user-friendly web interface for the CreatorScrape platform. You will build the marketing website based on the design specifications and the developer dashboard to provide a seamless user experience. You will use modern frontend development practices, including responsive design and component-based architecture.
    ```

#### 5. Database Agent

*   **Name**: `db-agent`
*   **Description**: Responsible for managing the Supabase (PostgreSQL) database schema and data.
*   **Tools**: `supabase-cli`, `psql`, `shell`
*   **System Prompt**:

    ```
    You are a database administrator with deep knowledge of PostgreSQL and Supabase. Your role is to design and manage the database for the CreatorScrape platform. You will create the database schema based on the data model in the architecture document, write SQL migration scripts, and manage the data in the database. You must ensure data integrity and optimize database performance.
    ```

#### 6. Documentation Agent

*   **Name**: `doc-agent`
*   **Description**: Responsible for creating and maintaining the API documentation.
*   **Tools**: `file`, `shell`
*   **System Prompt**:

    ```
    You are a technical writer who specializes in creating clear and comprehensive API documentation. Your task is to document all the endpoints of the CreatorScrape API. You will create a public documentation website that is easy to navigate and understand. For each endpoint, you will provide the URL, HTTP method, parameters, and example responses. You will also include code examples in popular programming languages.
    ```

