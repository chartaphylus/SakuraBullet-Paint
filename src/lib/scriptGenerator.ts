import { THEMED_COMMIT_MESSAGES } from '../data/themes';
import type { DailyShiftConfig, MissionCommitEntry } from '../types/paint';

export function generateBashMissionScript(params: {
  authorName: string;
  authorEmail: string;
  repoName: string;
  entries: MissionCommitEntry[];
  messageStyle: DailyShiftConfig['messageStyle'];
}): string {
  const { authorName, authorEmail, repoName, entries, messageStyle } = params;
  const messages = THEMED_COMMIT_MESSAGES[messageStyle] || THEMED_COMMIT_MESSAGES.lycoreco;
  const safeName = (authorName || 'Lycoris Agent').replace(/"/g, '\\"');
  const safeEmail = (authorEmail || 'your-email@users.noreply.github.com').replace(/"/g, '\\"');
  const safeRepo = (repoName || 'sakura-bullet-canvas').replace(/[^a-zA-Z0-9._-]/g, '-');

  const lines: string[] = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    `# 🌸 Sakura Bullet Paint — Café LycoReco Offline Mission Script`,
    `# Target entries: ${entries.length} days`,
    '',
    `mkdir -p "${safeRepo}"`,
    `cd "${safeRepo}"`,
    'if [ ! -d .git ]; then',
    '  git init -b main',
    'fi',
    '',
    `git config user.name "${safeName}"`,
    `git config user.email "${safeEmail}"`,
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

  for (const entry of entries) {
    const count = Math.max(0, entry.count);
    if (!entry.date || count <= 0) continue;
    const baseUnix = Math.floor(new Date(`${entry.date}T12:00:00Z`).getTime() / 1000);
    for (let i = 0; i < count; i++) {
      const ts = baseUnix + i;
      const msg = `${messages[globalIdx % messages.length]} [${entry.date} #${i + 1}]`;
      const msgBytes = new TextEncoder().encode(msg).length;
      lines.push(`commit refs/heads/main`);
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
  const safeName = (authorName || 'Lycoris Agent').replace(/'/g, "''");
  const safeEmail = (authorEmail || 'your-email@users.noreply.github.com').replace(/'/g, "''");
  const safeRepo = (repoName || 'sakura-bullet-canvas').replace(/[^a-zA-Z0-9._-]/g, '-');

  const compactPlan = JSON.stringify(
    entries.map((e) => ({ d: e.date, c: e.count })),
  );

  return `# 🌸 Sakura Bullet Paint — PowerShell Offline Mission Script
$ErrorActionPreference = 'Stop'

$RepoDir = '${safeRepo}'
if (-not (Test-Path $RepoDir)) { New-Item -ItemType Directory -Path $RepoDir | Out-Null }
Set-Location $RepoDir

if (-not (Test-Path '.git')) {
  git init -b main | Out-Null
}

$AuthorName = '${safeName}'
$AuthorEmail = '${safeEmail}'
git config user.name $AuthorName
git config user.email $AuthorEmail

if (-not (Test-Path 'README.md')) {
  '# 🌸 Sakura Bullet Paint Canvas' | Out-File -FilePath 'README.md' -Encoding utf8
  git add README.md
  git commit -m '🌸 Initialize Café LycoReco Canvas' | Out-Null
}

$Plan = '${compactPlan}' | ConvertFrom-Json
$Messages = @(${messages.map((m) => `'${m.replace(/'/g, "''")}'`).join(', ')})

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

