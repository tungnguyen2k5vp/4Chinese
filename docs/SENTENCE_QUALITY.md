# Sentence quality and coverage (Phase 37)

## Implemented source safeguards

- Every shared sentence has provenance and review status; learner-facing lookup only admits `REVIEWED` content.
- The deterministic difficulty score and ranking prefer reviewed examples for the intended vocabulary sense, then shorter and closer examples.
- Template-like/generic sentence drafts are rejected before they can become learner-facing content.
- The coverage query counts reviewed sentences by HSK band, rather than equating a relationship row with a reviewed example.

## Release gate

The repository does not yet contain a curator-approved HSK sentence corpus or a generated coverage report. Before declaring coverage complete, import the reviewed corpus through the typed content pipeline, run the report against the target database, and record the actual counts and gaps. No synthetic sentences should be used to meet a numeric target.

