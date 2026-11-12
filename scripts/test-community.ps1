$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$qaContainer = '4chinese-social-qa-' + [Guid]::NewGuid().ToString('N')
$created = $false
try {
  docker run --detach --name $qaContainer --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine -c wal_level=logical | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated PostgreSQL QA container.' }
  $created = $true
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $qaContainer pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Milliseconds 500
  }
  foreach ($file in @('scripts/test-community-bootstrap.sql','supabase/community.sql','scripts/test-community.sql','supabase/community-v2.sql','scripts/test-community-v2.sql','supabase/community-media.sql','scripts/test-community-media.sql','supabase/community-v3.sql','scripts/test-community-v3.sql')) {
    $source = Join-Path $projectRoot $file
    $destination = '/tmp/' + [IO.Path]::GetFileName($source)
    docker cp $source "${qaContainer}:$destination"
    if ($LASTEXITCODE -ne 0) { throw "Could not copy $file" }
  }
  docker exec $qaContainer psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/test-community-bootstrap.sql -f /tmp/community.sql -f /tmp/test-community.sql -f /tmp/community-v2.sql -f /tmp/test-community-v2.sql -f /tmp/community-v2.sql -f /tmp/community-media.sql -f /tmp/test-community-media.sql -f /tmp/community-media.sql -f /tmp/community-v3.sql -f /tmp/test-community-v3.sql -f /tmp/community-v3.sql
  if ($LASTEXITCODE -ne 0) { throw 'Community SQL checks failed.' }
} finally {
  # Remove only the disposable container created by this invocation; no host volumes exist.
  if ($created -and $qaContainer -match '^4chinese-social-qa-[0-9a-f]{32}$') { docker rm --force $qaContainer | Out-Null }
}
