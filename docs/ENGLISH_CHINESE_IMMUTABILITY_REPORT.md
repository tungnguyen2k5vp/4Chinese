# V7.2 English-Only Change — Chinese and Data Immutability

## Evidence-backed gates

- `DATABASE_SCHEMA_UNCHANGED`: PASS. SHA-256 of `src/db/schema.ts`, `src/db/migrations.ts` and `src/db/database.ts` after this phase matches the recorded pre-phase baseline.
- `SRS_SCHEDULER_UNCHANGED`: PASS. The active study clock and English learner/review repository hashes match the pre-phase baseline; review UI still calls existing review actions.
- `USER_DATA_NOT_TOUCHED`: PASS for this work session. No database reset/migration, persistent seed, destructive operation, import, APK install or production write was performed. Browser capture uses a non-persistent isolated context and temporary in-memory preview fixtures.
- `CHINESE_PRESENTATION_UNCHANGED`: PASS for the audited protected Chinese route/components. Hashes for Chinese Home, HSK, Statistics, Grammar, Reader and Review plus language context and backup format match the recorded baseline. English-mode profile presentation is conditional; Chinese preference values and Chinese branch are preserved.
- The audited user-data repositories listed below match their pre-phase hashes. No vocabulary source file was edited in this phase; a complete pre-phase hash inventory of every vocabulary source was not retained, so the report does not claim a full vocabulary-dataset hash certification.

Database schema source version is **45**, unchanged. The following SHA-256 values were recorded before the phase and re-read after the last source edit; all 15 matched exactly.

| Protected file | Before = after SHA-256 |
|---|---|
| `src/db/schema.ts` | `CC9FD360BC23B253EEA2B1FECAEAB55B8C90C086D30DAA4A3DA57475FED62DC0` |
| `src/db/migrations.ts` | `0395C612F935DAE01EA9B7AC6E5EE593A1897756D17440E81C758E81FE949A2A` |
| `src/db/database.ts` | `B6AE25B8AA7E01DA804794340EC028B5BBFED94A62BBB0C4E09430F051333825` |
| `src/db/vocabulary-context.ts` | `1355827041B20DE48F030BBC77654127A7BA47D1AEBEB2F36AC48533FEEDACB5` |
| `src/db/backup-repository.ts` | `DA243DB8B322DA224C942A819E237482682D179ABAC3298195A6A46777F939E5` |
| `src/db/english/learner.ts` | `67BFD861C863FF830DC0FA84ED3E88E2D8DB169CC7BA6524092A33923AB77E4A` |
| `src/services/review/active-study-clock.ts` | `C7772224CB3242307136C89C41202F90A357AE10F774F37445AF89A764026F46` |
| `src/services/languages/LanguageProvider.tsx` | `0421EADD9A078DF4582C80072022C2266F578C6E3F20AC39A3B28E21E8657707` |
| `src/app/(tabs)/index.tsx` | `0ACA9AD1CD977245BFCD655891EDE5B088F8D4CECF0D9FCA39FE16C0411F7502` |
| `src/app/(tabs)/hsk.tsx` | `BE377F8DA400C01A385C0310B795AAB478CDDC5964D0CEDDA489C7F54BF2265B` |
| `src/app/(tabs)/stats.tsx` | `225BC7E0D89FB26DBF83737567CA00296060E9FAD2A4F236356E95C9EF86E243` |
| `src/app/grammar/index.tsx` | `1E563FF42C7F3E2FE82528CFB8DD120ABC753EFF094D4603726BEF159899B45B` |
| `src/app/reader/index.tsx` | `1E9B50F1A9DFD9FA0579D771D162EC0D2A50A17E8D14B0CE5C13048AEC9A03DF` |
| `src/app/review/session.tsx` | `E6C8E1B606BF8D5F5128A086656AD936561B8406076595BBF619F714D417B429` |
| `src/services/backup/format.ts` | `44392139CD0829097C893918116B17BA1B6B185AA29BD6F7CD12B9DC83C5E9C1` |

The worktree already contained pre-existing changes at phase start. These results compare the named protected files to the phase baseline, not to an assumed clean Git commit. New files and English UI changes are intentionally outside the protected set.

## Limitations

These hashes establish unchanged files, not a general security audit. No native binary or physical-device run was performed. UI preview fixtures are not persisted to the application database.
