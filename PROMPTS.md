
## AI Usage During TrustVault Development

**Project:** TrustVault - Secure Document Management System

### Introduction

During the development of TrustVault, I used AI tools to understand technical concepts, solve coding issues, review my implementation, and improve the application.

AI helped me explore solutions, but I did not blindly follow every suggestion. I reviewed the recommendations, made changes according to my project requirements, and tested the functionality.

### 1. Dashboard Development

**What I asked AI:**
Help me improve the dashboard layout, navigation, and overall user experience.

**How I used the suggestions:**
I reviewed the ideas and used the relevant ones to improve the frontend structure and make the dashboard easier to use.

**Result:**
The frontend production build completed successfully.

### 2. Authentication

**What I asked AI:**
Help me review the login, registration, JWT authentication, and protected API routes.

**How I used the suggestions:**
I used the explanations to understand how authentication works between the frontend and backend and to improve my understanding of secure login.

**Result:**
I tested the deployed login successfully.

### 3. Role-Based Access

**What I asked AI:**
Identify possible ways users could access features or documents without the required permissions.

**How I used the suggestions:**
I reviewed the backend permission checks and focused on access restrictions for viewers and administrators.

**Result:**
Tests cover viewer restrictions, permission granting and revocation, and administrative audit access.

### 4. Document Permissions

**What I asked AI:**
Help me check whether users could still download documents after their access was revoked.

**How I used the suggestions:**
I reviewed the document permission workflow and focused on checking permissions during download requests.

**Result:**
Tests cover authorized downloads, unauthorized access rejection, and permission revocation.

### 5. Audit Logs

**What I asked AI:**
Review the audit logging system and suggest ways to detect unauthorized access and changes to audit records.

**How I used the suggestions:**
I used the explanations to understand audit-chain verification and the importance of recording denied access attempts.

**Result:**
Tests cover audit recording, denied access, chain verification, and detection of modified audit entries.

### 6. Private Document Storage

**What I asked AI:**
Help me integrate Supabase Storage with the FastAPI backend while keeping documents private.

**How I used the suggestions:**
I reviewed the storage implementation and focused on keeping storage credentials on the backend.

**Result:**
I successfully tested local file upload, download, and deletion.

**Related commit:** [Supabase Storage Integration](https://github.com/shafiyashaik964/trustvault-secure-document-management/commit/910daff)

### 7. Deployment and CORS Fix

**What I asked AI:**
Help me identify why the deployed frontend was having trouble communicating with the backend.

**How I used the suggestions:**
I checked the FastAPI CORS configuration and Render logs. I identified failed preflight requests and reviewed the allowed frontend origins.

**Result:**
After correcting the CORS settings, I tested the deployed login successfully.

### My Learning

Using AI helped me understand unfamiliar concepts, solve problems, and approach development tasks more confidently.

I learned that AI suggestions should always be reviewed and tested before being used. I made the final development decisions and took responsibility for checking the results.

My main goal was to build TrustVault - Secure Document Management System.
