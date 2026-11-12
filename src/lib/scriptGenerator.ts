import { THEMED_COMMIT_MESSAGES } from '../data/themes';
import type { DailyShiftConfig, MissionCommitEntry } from '../types/paint';

const SAFE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeIdentity(value: string, fallback: string): string {
  const cleaned = (value || '')
    .replace(/[<>\r\n\0$`"\\]/g, '')
    .trim();
  return cleaned || fallback;
}

function sanitizeRepoDir(repoName: string): string {
  const cleaned = (repoName || 'sakura-bullet-canvas')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+/, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return 'sakura-bullet-canvas';
  }
  return cleaned;
}

function sanitizeEntries(entries: MissionCommitEntry[]): Array<{ date: string; count: number }> {
  return entries
    .filter((e) => SAFE_DATE_RE.test(e.date))
    .map((e) => ({
      date: e.date,
      count: Math.min(500, Math.max(0, Math.round(Number(e.count) || 0))),
    }))
    .filter((e) => e.count > 0);
}

function escapeBashSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function escapePowerShellSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function generateBashMissionScript(params: {
  authorName: string;
  authorEmail: string;
  repoName: string;
  entries: MissionCommitEntry[];
  messageStyle: DailyShiftConfig['messageStyle'];
}): string {
  const { authorName, authorEmail, repoName, entries, messageStyle } = params;
  const messages = THEMED_COMMIT_MESSAGES[messageStyle] || THEMED_COMMIT_MESSAGES.lycoreco;
  const safeName = sanitizeIdentity(authorName, 'Lycoris Agent').replace(/'/g, '');
  const safeEmail = sanitizeIdentity(authorEmail, 'your-email@users.noreply.github.com').replace(/'/g, '');
  const safeRepo = sanitizeRepoDir(repoName);
  const safeEntries = sanitizeEntries(entries);

  const lines: string[] = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    `# 🌸 Sakura Bullet Paint — Café LycoReco Offline Mission Script`,
    `# Target entries: ${safeEntries.length} days`,
    '',
    `REPO_DIR=${escapeBashSingleQuoted(safeRepo)}`,
    `mkdir -p "$REPO_DIR"`,
    `cd "$REPO_DIR"`,
    'if [ ! -d .git ]; then',
    '  git init -b main',
    'fi',
    '',
    `git config user.name ${escapeBashSingleQuoted(safeName)}`,
    `git config user.email ${escapeBashSingleQuoted(safeEmail)}`,
    '',
    'echo "# 🌸 Sakura Bullet Paint Canvas" > README.md',
    'git add README.md',
    'git commit -m "🌸 Initialize Café LycoReco Canvas" --allow-empty >/dev/null 2>&1 || true',
    '',
    'echo "Executing mission via git fast-import..."',
    'git fast-import --quiet <<\'FAST_IMPORT_EOF\'',
  ];

  let markId = 1;
  let globalIdx = 0;

  for (const entry of safeEntries) {
    const baseUnix = Math.floor(new Date(`${entry.date}T12:00:00Z`).getTime() / 1000);
    if (!Number.isFinite(baseUnix)) continue;
    for (let i = 0; i < entry.count; i++) {
      const ts = baseUnix + i;
      const msg = `${messages[globalIdx % messages.length]} [${entry.date} #${i + 1}]`.replace(/[\r\n\0]/g, ' ');
      const msgBytes = new TextEncoder().encode(msg).length;
      lines.push('commit refs/heads/main');
      lines.push(`mark :${markId}`);
      lines.push(`author ${safeName} <${safeEmail}> ${ts} +0000`);
      lines.push(`committer ${safeName} <${safeEmail}> ${ts} +0000`);
      lines.push(`data ${msgBytes}`);
      lines.push(msg);
      lines.push(markId === 1 ? 'from refs/heads/main^0' : `from :${markId - 1}`);
      lines.push('');
      markId += 1;
      globalIdx += 1;
    }
  }

  lines.push('FAST_IMPORT_EOF');
  lines.push('git reset --hard refs/heads/main');
  lines.push(`echo "✅ Mission complete! Total commits generated: ${globalIdx}"`);
  lines.push('echo "👉 Next step: git remote add origin https://github.com/<USERNAME>/<REPO>.git && git push -u origin main"');
  lines.push('');

  return lines.join('\n');
}

export function generatePowerShellMissionScript(params: {
  authorName: string;
  authorEmail: string;
  repoName: string;
  entries: MissionCommitEntry[];
  messageStyle: DailyShiftConfig['messageStyle'];
}): string {
  const { authorName, authorEmail, repoName, entries, messageStyle } = params;
  const messages = THEMED_COMMIT_MESSAGES[messageStyle] || THEMED_COMMIT_MESSAGES.lycoreco;
  const safeName = sanitizeIdentity(authorName, 'Lycoris Agent');
  const safeEmail = sanitizeIdentity(authorEmail, 'your-email@users.noreply.github.com');
  const safeRepo = sanitizeRepoDir(repoName);
  const safeEntries = sanitizeEntries(entries);

  const compactPlan = JSON.stringify(
    safeEntries.map((e) => ({ d: e.date, c: e.count })),
  );

  return `# 🌸 Sakura Bullet Paint — PowerShell Offline Mission Script
$ErrorActionPreference = 'Stop'

$RepoDir = ${escapePowerShellSingleQuoted(safeRepo)}
if (-not (Test-Path $RepoDir)) { New-Item -ItemType Directory -Path $RepoDir | Out-Null }
Set-Location $RepoDir

if (-not (Test-Path '.git')) {
  git init -b main | Out-Null
}

$AuthorName = ${escapePowerShellSingleQuoted(safeName)}
$AuthorEmail = ${escapePowerShellSingleQuoted(safeEmail)}
git config user.name $AuthorName
git config user.email $AuthorEmail

if (-not (Test-Path 'README.md')) {
  '# 🌸 Sakura Bullet Paint Canvas' | Out-File -FilePath 'README.md' -Encoding utf8
  git add README.md
  git commit -m '🌸 Initialize Café LycoReco Canvas' | Out-Null
}

$Plan = ${escapePowerShellSingleQuoted(compactPlan)} | ConvertFrom-Json
$Messages = @(${messages.map((m) => escapePowerShellSingleQuoted(m)).join(', ')})

$TempFile = [System.IO.Path]::GetTempFileName()
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Writer = New-Object System.IO.StreamWriter($TempFile, $false, $Utf8NoBom)

$MarkId = 1
$GlobalIdx = 0
$Epoch = [DateTimeOffset]::new(1970, 1, 1, 0, 0, 0, [TimeSpan]::Zero)

foreach ($Entry in $Plan) {
  $BaseDto = [DateTimeOffset]::ParseExact("$($Entry.d)T12:00:00Z", "yyyy-MM-dd'T'HH:mm:ss'Z'", [System.Globalization.CultureInfo]::InvariantCulture)
  $BaseUnix = [int64]($BaseDto - $Epoch).TotalSeconds
  for ($i = 0; $i -lt [int]$Entry.c; $i++) {
    $Ts = $BaseUnix + $i
    $Msg = "$($Messages[$GlobalIdx % $Messages.Count]) [$($Entry.d) #$($i + 1)]"
    $ByteCount = $Utf8NoBom.GetByteCount($Msg)
    $Writer.WriteLine("commit refs/heads/main")
    $Writer.WriteLine("mark :$MarkId")
    $Writer.WriteLine("author $AuthorName <$AuthorEmail> $Ts +0000")
    $Writer.WriteLine("committer $AuthorName <$AuthorEmail> $Ts +0000")
    $Writer.WriteLine("data $ByteCount")
    $Writer.WriteLine($Msg)
    if ($MarkId -eq 1) {
      $Writer.WriteLine("from refs/heads/main^0")
    } else {
      $Writer.WriteLine("from :$($MarkId - 1)")
    }
    $Writer.WriteLine("")
    $MarkId++
    $GlobalIdx++
  }
}

$Writer.Close()

if ($GlobalIdx -gt 0) {
  cmd /c "git fast-import --quiet < \`"$TempFile\`""
  git reset --hard refs/heads/main | Out-Null
}
Remove-Item $TempFile -Force

Write-Host "✅ Mission complete! Generated $GlobalIdx commits in '$RepoDir'." -ForegroundColor Green
Write-Host "👉 Next step: git remote add origin https://github.com/<USERNAME>/<REPO>.git && git push -u origin main" -ForegroundColor Cyan
`;
}
