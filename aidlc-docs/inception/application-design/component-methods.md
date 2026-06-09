# Component Methods

## Auth & Session

```ts
getServerSession(): Promise<AuthSession | null>
requireUser(): Promise<AuthUser>
requireVerifiedUser(): Promise<AuthUser>
requireAdmin(): Promise<AuthUser>
startGoogleOAuth(redirectTo: string): Promise<AuthRedirect>
sendPasswordReset(email: string): Promise<void>
```

## Profile & Identity

```ts
ensureProfileForAuthUser(authUserId: string): Promise<Profile>
generateNickname(baseNickname: string): Promise<Nickname>
updateNickname(userId: string, baseNickname: string): Promise<Nickname>
listDefaultAvatars(): Promise<DefaultAvatar[]>
updateAvatar(userId: string, input: AvatarInput): Promise<Profile>
getPublicProfile(userId: string): Promise<PublicProfile>
```

## Competition Data

```ts
upsertCompetition(input: CompetitionInput): Promise<Competition>
upsertTeam(input: TeamInput): Promise<Team>
upsertMatch(input: MatchInput): Promise<Match>
getFixture(competitionId: string, filters?: FixtureFilters): Promise<Match[]>
getMatch(matchId: string): Promise<MatchDetail>
isPredictionOpen(matchId: string, now: Date): Promise<boolean>
```

## External Football API Adapter

```ts
fetchCompetitionFixtures(providerCompetitionId: string): Promise<ProviderFixture[]>
fetchMatchResults(providerCompetitionId: string): Promise<ProviderMatchResult[]>
normalizeFixture(payload: ProviderFixture): MatchInput
normalizeResult(payload: ProviderMatchResult): MatchResultInput
syncCompetition(providerCompetitionId: string): Promise<SyncReport>
```

## Pools & Membership

```ts
createPool(ownerUserId: string, input: CreatePoolInput): Promise<Pool>
searchPublicPools(query: PoolSearchInput): Promise<PoolSummary[]>
joinPool(userId: string, input: JoinPoolInput): Promise<PoolMembership>
leavePool(userId: string, poolId: string): Promise<void>
removePoolMember(adminUserId: string, poolId: string, memberUserId: string): Promise<void>
getPoolDetail(userId: string, poolId: string): Promise<PoolDetail>
```

## Predictions

```ts
submitPrediction(userId: string, input: PredictionInput): Promise<Prediction>
updatePrediction(userId: string, predictionId: string, input: PredictionInput): Promise<Prediction>
getUserPrediction(userId: string, matchId: string): Promise<Prediction | null>
listUserPredictions(userId: string, competitionId: string): Promise<PredictionSummary[]>
lockPredictionsForMatch(matchId: string): Promise<void>
```

## Scoring & Rankings

```ts
scorePrediction(prediction: Prediction, result: MatchResult): ScoreBreakdown
recalculateMatchScores(matchId: string): Promise<ScoringReport>
getPoolLeaderboard(poolId: string): Promise<LeaderboardRow[]>
getUserPoolScore(userId: string, poolId: string): Promise<UserPoolScore>
```

## Notifications

```ts
getUpcomingMatchCues(userId: string): Promise<UpcomingMatchCue[]>
getPredictionLockWarnings(userId: string): Promise<PredictionLockWarning[]>
getScoreOutcomeCues(userId: string, matchId: string): Promise<ScoreOutcomeCue[]>
```

## Admin Console

```ts
getSyncStatus(adminUserId: string): Promise<SyncStatus>
triggerCompetitionSync(adminUserId: string, competitionId: string): Promise<SyncReport>
overrideMatchResult(adminUserId: string, input: MatchResultOverrideInput): Promise<MatchResult>
listSystemAuditEvents(adminUserId: string, filters?: AuditFilters): Promise<AuditEvent[]>
```

## UX Education Layer

```ts
getPublicRulesSummary(): Promise<RulesSummary>
getFullRules(userId: string): Promise<RulesDocument>
getOnboardingState(userId: string): Promise<OnboardingState>
completeOnboardingStep(userId: string, step: OnboardingStep): Promise<OnboardingState>
getScoreExplanation(matchId: string, userId: string): Promise<ScoreExplanation>
```

## Notes

- Detailed business rules and validation internals will be finalized in Functional Design.
- All mutating methods must enforce schema validation and authorization before database writes.
- Public read methods must never expose PII or hidden pool data.
