# Content approval workflow

The pure review gate implements DRAFT → REVIEWED → VERIFIED → PUBLISHED with sequential transitions, revision-conflict protection, explicit human action and reviewer/date/notes/source/rights evidence. VERIFIED/PUBLISHED additionally require verification evidence. Automation cannot promote AI-assisted material. Quality-sensitive new content is visible only after publication. Existing legacy labels are not retroactively interpreted as independent review.

The gate validates recorded assertions, not reviewer identity, teaching correctness, legal rights or the truth of a source. Real independent review is still required. No corpus entries were promoted by this implementation. Fixtures remain test-only. An editorial dashboard, persistent approval event log and reviewed sense/collocation publication packs remain future integration work.

Release labels additionally require ten mandatory dimensions (vocabulary, hanzi, grammar, examples, listening, reading, writing, question types, mock profile, validation); these cannot be bypassed by declaring them inapplicable. Speaking/translation requirements depend on the verified profile. No current level is Content Complete or Exam Ready.
