# Launch Checklist

## Pre-Launch

### Specification Review
- [ ] OpenAPI spec reviewed for accuracy and completeness
- [ ] All endpoints documented with request/response examples
- [ ] Error codes and messages are consistent across the spec
- [ ] Breaking changes from previous versions are documented

### Quickstart Tested
- [ ] Quickstart guide followed end-to-end by someone unfamiliar with the API
- [ ] All code samples in documentation execute without errors
- [ ] SDK examples verified against the current API version

### SDK Published
- [ ] SDK version pinned to match API version
- [ ] SDK published to package registry (npm, PyPI, etc.)
- [ ] Changelog updated with new features and breaking changes
- [ ] SDK documentation reflects current method signatures

### Rate Limiting Verified
- [ ] Rate limits documented (requests per minute/hour per token)
- [ ] Rate limit headers present in all responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- [ ] 429 responses tested and confirmed to include `Retry-After` header
- [ ] Rate limits tested under load to confirm enforcement

### No Sensitive Data Leaks
- [ ] Error messages do not expose internal stack traces
- [ ] Error responses do not include database identifiers or internal paths
- [ ] Logs scrubbed of tokens, passwords, and PII before any external sharing
- [ ] API responses audited — no fields returned that are not documented
- [ ] Security review completed on authentication and token handling

---

## Launch Day

### Announce
- [ ] Changelog or release notes published
- [ ] Announcement sent to mailing list / developer newsletter
- [ ] Social posts and community channels updated
- [ ] Status page updated to reflect new API version availability

### Monitor Errors
- [ ] Error rate dashboards active and reviewed hourly for the first 8 hours
- [ ] Alerting configured for error rate spikes (>1% 5xx rate)
- [ ] On-call rotation confirmed and team notified of launch
- [ ] Rollback plan documented and accessible to on-call

---

## Week 1

### Review Errors
- [ ] Aggregate error logs and categorize by type and endpoint
- [ ] Identify top 5 error sources and assign owners
- [ ] Review any 401/403 patterns that may indicate auth documentation gaps
- [ ] Confirm no data integrity issues from production traffic

### Fix Documentation
- [ ] Address any quickstart or guide issues reported by early integrators
- [ ] Update FAQ based on support volume from launch week
- [ ] Correct any spec inaccuracies discovered from real usage
- [ ] Publish a "known issues" or "post-launch notes" page if needed
