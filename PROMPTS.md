\# PROMPTS.md

\# TrustVault – AI-Assisted Development and Engineering Decision Log



\## Project Overview



\*\*Project:\*\* TrustVault – Secure Document Management System



\*\*Technology Stack:\*\*

\- Frontend: React, Vite, JavaScript

\- Backend: Python, FastAPI

\- Database: PostgreSQL, SQLAlchemy

\- Authentication: JWT-based authentication

\- Security: Role-based access control, document permissions, audit logging



\## Purpose of This Document



This document maintains a chronological record of AI-assisted development during TrustVault's implementation.



AI was used to explore implementation approaches, review code, identify potential problems, and assist with debugging. AI-generated suggestions were treated as proposals rather than automatically trusted solutions.



I reviewed the suggestions against the existing project architecture and identified areas requiring further implementation or testing.



\---



\## Entry 01 – Frontend Architecture and Viewer Dashboard



\*\*Date:\*\* 01 November 2026



\*\*Development challenge:\*\*



Continue the Viewer Dashboard implementation without breaking existing navigation, authentication, or shared components.



\*\*My prompt:\*\*



"Continue the existing Viewer Dashboard implementation. Review the current React component structure and provide the required sidebar and supporting code while preserving existing functionality."



\*\*AI-generated suggestion:\*\*



AI provided suggestions for sidebar components and supporting dashboard integration.



\*\*Critical review:\*\*



A component can appear correct independently but still fail when integrated with existing routes, API calls, or role-specific navigation.



\*\*Engineering decision:\*\*



Preserve the existing application structure and verify component imports, navigation paths, and API integration before considering the implementation complete.



\*\*Verification:\*\*



Record the actual navigation and dashboard tests performed.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Entry 02 – Authentication and Identity Verification



\*\*Date:\*\* 06 November 2026



\*\*Development challenge:\*\*



Implement authentication consistently across the React frontend and FastAPI backend.



\*\*My prompt:\*\*



"Review the authentication implementation and provide the required backend authentication routes while maintaining consistency with the existing user model, password hashing, and JWT token implementation."



\*\*AI-generated suggestion:\*\*



AI suggested authentication route implementation.



\*\*Critical review:\*\*



Authentication is not secure merely because a login endpoint returns a token. Password hashing, token validation, token expiry, and user identity verification must work together.



\*\*Engineering decision:\*\*



Keep authentication responsibilities in the backend security layer and verify that frontend requests follow the backend's expected request and response formats.



\*\*Verification:\*\*



Record registration, valid login, invalid password, and invalid or expired token test results.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Entry 03 – Role-Based Authorization



\*\*Date:\*\* 06 November 2026



\*\*Development challenge:\*\*



Maintain separate Admin, Document Owner, and Viewer capabilities.



\*\*My prompt:\*\*



"Review the existing dashboard and backend authorization design. Identify how role-based restrictions should be enforced so that users cannot perform operations outside their assigned roles."



\*\*AI-generated suggestion:\*\*



AI provided implementation guidance for dashboard and role-related functionality.



\*\*Critical review:\*\*



Frontend route protection alone is insufficient. A user can bypass frontend controls and send requests directly to backend endpoints.



\*\*Engineering decision:\*\*



Treat backend authorization as the security boundary. Verify the authenticated user's role and permissions on protected operations rather than trusting frontend role information.



\*\*Verification:\*\*



Record actual tests for unauthorized role access, direct API requests, and allowed role-specific operations.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Entry 04 – Document Permissions and Revocation



\*\*Date:\*\* 06 November 2026



\*\*Development challenge:\*\*



Ensure that document sharing does not give users permanent or unrestricted access.



\*\*My prompt:\*\*



"Review the document permission model and identify how document access, permission revocation, and owner restrictions should be enforced."



\*\*AI-generated suggestion:\*\*



AI assisted with reviewing the SQLAlchemy permission model and document access flow.



\*\*Critical review:\*\*



A permission record in the database is not sufficient if the download endpoint does not check it every time. Revoked users must not retain access through previously granted permissions or predictable file paths.



\*\*Engineering decision:\*\*



Preserve backend permission checks for document operations and verify access after revocation. Storage objects must not be publicly accessible.



\*\*Verification:\*\*



Test owner access, authorized viewer access, unauthorized access, and access after permission revocation.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Entry 05 – Audit Trail and Integrity



\*\*Date:\*\* 06 November 2026



\*\*Development challenge:\*\*



Review the audit logging design and identify whether audit records provide meaningful integrity protection.



\*\*My prompt:\*\*



"Review the AuditLog SQLAlchemy model and audit service. Identify weaknesses in audit record integrity, hash chaining, and verification."



\*\*AI-generated suggestion:\*\*



AI reviewed the audit log model, including actor identifiers, timestamps, previous hashes, and entry hashes.



\*\*Critical review:\*\*



Storing hash fields does not automatically make an audit log tamper-resistant. Hash generation, chain verification, and protection against unauthorized changes are necessary.



\*\*Engineering decision:\*\*



Treat audit integrity as a property that must be demonstrated through implementation and tests. Do not claim tamper-proof logging based only on the presence of hash columns.



\*\*Verification:\*\*



Record tests for audit entry creation, hash-chain consistency, and detection of modified records.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Entry 06 – Secure GitHub Preparation



\*\*Date:\*\* 06 November 2026



\*\*Development challenge:\*\*



Prepare the project for source control without exposing environment variables, private keys, local databases, or uploaded documents.



\*\*My prompt:\*\*



"Help prepare the TrustVault project for GitHub and identify files that should not be included in the repository."



\*\*AI-generated suggestion:\*\*



AI suggested a project-level `.gitignore` and Git initialization workflow.



\*\*Critical review:\*\*



Git was initially initialized in the Windows user directory rather than the project directory. The staged-file review also identified ZIP archives that were unnecessary for source control.



\*\*Engineering decision:\*\*



Preserve the incorrectly initialized Git metadata as a backup, initialize Git in the TrustVault root, exclude sensitive files, and remove the ZIP archives from staging without deleting local copies.



\*\*Verification:\*\*



Confirmed that `backend/.env`, `backend/.env.test`, and `backend/venv/` are ignored using `git check-ignore`. Reviewed the staged filenames before committing.



\*\*Commit:\*\* Pending – add actual commit URL.



\---



\## Reflection and Lessons Learned



The most important lesson from using AI during TrustVault development is that generated code should never be treated as automatically correct, particularly in security-sensitive areas.



I learned to distinguish authentication from authorization, understand why backend permission checks are essential, question audit integrity claims, and inspect Git staging before publishing source code.



My objective is not simply to build an application with AI assistance. It is to understand the decisions behind the implementation, verify the security properties, and be able to explain and modify the system independently.



\## Transparency Statement



AI assistance was used during development and is documented here. All implementation claims, test results, and commit references will reflect work actually performed. Incomplete or unverified functionality will be identified honestly.
