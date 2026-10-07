# Personal contextual memory V5

Schema 36 stores optional encountered sentences keyed by word/source/document/location. Inputs are validated, one context is at most 2,000 characters, indexed reads are bounded (default 3, maximum 20). Re-saving a location is idempotent and preserves its creation time.

All context is local by default. No AI or sync call is made. Explicit user-created local backup includes contexts; older backups without the field must not erase newer contexts whose vocabulary still exists. Source IDs are informational, so deleted/imported documents do not invalidate the card. Users can delete individual contexts.

SRS presentation must mask every occurrence of simplified/traditional answers before reveal and must not use a sentence if no answer can be masked. Context is evidence of encountering a word, not evidence of mastery or correct pronunciation.
