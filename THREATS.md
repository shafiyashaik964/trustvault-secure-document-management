\# TrustVault – Threat Model and Security Analysis



\*\*Project:\*\* TrustVault – Secure Document Management System

\*\*Date:\*\* 06 November 2026

\*\*Status:\*\* Initial threat assessment – verification in progress



\## 1. Purpose



TrustVault manages sensitive documents through authentication, role-based access control, document sharing, and audit logging.



This document identifies potential threats, their impact, planned security controls, and tests required to evaluate the application's security.



\## 2. Assets to Protect



\- User accounts and personal information.

\- Password hashes and JWT authentication tokens.

\- Uploaded documents and their contents.

\- Document ownership and sharing permissions.

\- Admin, Owner, and Viewer privileges.

\- Audit records and their integrity.

\- Database credentials and application secrets.



\## 3. Threat Identification and Mitigation



| ID | Threat | Attack Scenario | Security Control |

|---|---|---|---|

| T01 | Unauthorized API access | An attacker accesses an endpoint without logging in. | Require authentication on protected backend endpoints. |

| T02 | Privilege escalation | A Viewer attempts Admin or Owner operations. | Enforce role checks on the backend. |

| T03 | IDOR / BOLA | A user changes a document ID to access another user's document. | Verify ownership and permissions on every document request. |

| T04 | Permission bypass | An unauthorized user attempts to download a document. | Check document permissions before providing file content. |

| T05 | Revoked permission reuse | A user downloads a document after access has been revoked. | Recheck current permissions for every download. |

| T06 | Malicious file upload | An attacker uploads a disguised executable or unsupported file. | Validate file size, extension, MIME type, and content. |

| T07 | Path traversal | An attacker attempts to access files outside the storage directory. | Generate server-side filenames and restrict file paths. |

| T08 | JWT tampering | An attacker modifies or reuses an invalid or expired token. | Validate token signatures and expiration. |

| T09 | Password attacks | An attacker attempts password guessing or exploits weak password storage. | Use secure password hashing and evaluate login rate limiting. |

| T10 | Secret exposure | Database credentials or signing keys are committed to GitHub. | Use environment variables and Git ignore rules. |

| T11 | Audit log tampering | An attacker modifies or deletes audit records. | Restrict audit modifications and implement integrity verification. |

| T12 | Public storage exposure | An unauthorized person accesses a document through a public storage URL. | Use private storage and backend authorization. |

| T13 | SQL injection | An attacker submits malicious SQL through an input field. | Use parameterized SQLAlchemy queries and validate inputs. |

| T14 | CORS misconfiguration | An untrusted website attempts browser-based API requests. | Configure allowed frontend origins. CORS does not replace authentication. |

| T15 | Information disclosure | An error response exposes internal paths or sensitive configuration. | Return safe error messages and protect application logs. |



\## 4. Security Testing Plan



The following tests will be performed to evaluate the identified threats.



| Test ID | Test Description | Expected Result |

|---|---|---|

| ST01 | Access a protected endpoint without a token. | Request is rejected. |

| ST02 | Use a Viewer account to access an Admin endpoint. | Access is denied. |

| ST03 | Use another user's document ID. | Unauthorized access is denied. |

| ST04 | Revoke sharing permission and retry download. | Download is denied. |

| ST05 | Upload an unsupported file type. | Upload is rejected. |

| ST06 | Upload a file exceeding the size limit. | Upload is rejected. |

| ST07 | Submit an invalid or expired JWT. | Request is rejected. |

| ST08 | Inspect Git staging for secrets. | Environment files and private keys are excluded. |

| ST09 | Attempt unauthorized audit log modification. | Modification is rejected. |

| ST10 | Inspect frontend build and deployment configuration. | Backend secrets are not exposed. |



\*\*Testing rule:\*\* Record actual results only after running each test. Do not mark a test as passed based on an expected result.



\## 5. Risk Prioritization



| Risk | Priority | Reason |

|---|---|---|

| Unauthorized document access | Critical | May expose confidential documents. |

| Privilege escalation | High | May allow unauthorized administrative operations. |

| Permission revocation failure | High | May preserve access after sharing ends. |

| Secret exposure | Critical | May compromise database or authentication security. |

| Malicious file upload | High | May introduce harmful content. |

| Audit log manipulation | High | May undermine accountability. |

| Information disclosure | Medium | May expose internal application details. |



\## 6. Existing Controls and Verification Status



The project includes authentication, document permission checks, upload validation, and audit logging in its existing design.



However, the presence of a feature does not prove that it is secure.



The following areas require additional verification:



\- Backend role authorization for every sensitive endpoint.

\- Document ownership and permission checks.

\- Permission revocation behavior.

\- JWT expiration and signature validation.

\- Audit hash-chain generation and verification.

\- Private cloud storage configuration.

\- Login rate limiting and brute-force protection.

\- Deployment secret management.



\## 7. Residual Risks



\- A hash field alone does not make audit logs tamper-proof.

\- CORS is not an authentication or authorization mechanism.

\- A private storage bucket must be verified in the deployed environment.

\- File type validation cannot guarantee that every uploaded file is harmless.

\- Security testing cannot guarantee the absence of all vulnerabilities.



\## 8. Security Commitment



TrustVault follows a defense-in-depth approach.



Authentication, authorization, document permissions, secure file handling, secret management, and audit logging are treated as separate security controls.



All security claims will be supported by implementation review and test evidence. Unverified protections will remain identified as pending verification.

## 9. Actual Test Execution Evidence

**Test command:**
python -m pytest backend/tests -v

**Execution result (06 November 2026):**
- Total tests: 17
- Passed: 17
- Failed: 0
- Warnings: 4 deprecation warnings

**Verified test areas:**
- Audit access recording and denied-access recording.
- Audit-chain verification.
- Detection of modified audit entries.
- Authorized document downloads.
- Unauthorized document download rejection.
- Permission revocation enforcement.
- Owner permission granting and revocation.
- Viewer permission restrictions.
- Authentication requirements for audit endpoints.
- Admin-only audit log access and verification.

**Remaining verification:**

The test run does not establish that every threat in this document has been tested. File-upload edge cases, JWT expiry, IDOR using separate user accounts, deployment storage privacy, and frontend secret exposure still require separate verification.
