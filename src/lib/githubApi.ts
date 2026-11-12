import { THEMED_COMMIT_MESSAGES } from '../data/themes';
import type {
  DailyShiftConfig,
  GitHubConnection,
  MissionCommitEntry,
  SakuraPlanPayload,
} from '../types/paint';
import {
  MISSION_RUNNER_SCRIPT,
  WORKFLOW_YAML,
  createTargetRepoReadme,
  formatPlanJson,
} from './repoTemplateFiles';

const API_BASE = 'https://api.github.com';
const SAFE_OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const SAFE_REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;
const SAFE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeToken(rawToken: string): string {
  const token = rawToken.replace(/[\r\n\0]/g, '').trim();
  if (!token) {
    throw new Error('GitHub Personal Access Token tidak boleh kosong.');
  }
  return token;
}

function assertSafeOwner(owner: string): string {
  const clean = owner.trim();
  if (!SAFE_OWNER_RE.test(clean)) {
    throw new Error('Username GitHub (Owner) tidak valid.');
  }
  return clean;
}

function assertSafeRepo(repo: string): string {
  const clean = repo.trim();
  if (!SAFE_REPO_RE.test(clean) || clean === '.' || clean === '..') {
    throw new Error('Nama repository GitHub tidak valid.');
  }
  return clean;
}

function assertSafeBranch(branch: string): string {
  const clean = (branch || 'main').trim();
  if (
    !clean ||
    clean.length > 128 ||
    clean.startsWith('-') ||
    clean.startsWith('.') ||
    clean.endsWith('.') ||
    clean.includes('..') ||
    clean.includes('//') ||
    /[\s~^:?*[\\\x00-\x1f\x7f]/.test(clean)
  ) {
    throw new Error('Nama branch GitHub tidak valid.');
  }
  return clean;
}

function encodeRepoPath(filePath: string): string {
  return filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function safeGitHubUrl(url: string | undefined, fallback: string): string {
  if (typeof url === 'string' && url.startsWith('https://github.com/')) {
    return url;
  }
  return fallback;
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function fromBase64Utf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function ghFetch<T>(
  path: string,
  rawToken: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sanitizeToken(rawToken);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    referrerPolicy: 'no-referrer',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `GitHub API error (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = `${data.message} (HTTP ${res.status})`;
    } catch {
      // ignore json parse failure
    }
    // Never reflect the token in thrown errors
    if (message.includes(token)) {
      message = `GitHub API error (${res.status})`;
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface VerifiedUserInfo {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  noreplyEmail: string;
  avatarUrl: string;
}

export async function verifyGitHubToken(token: string): Promise<VerifiedUserInfo> {
  const user = await ghFetch<{
    login: string;
    id: number;
    name: string | null;
    email: string | null;
    avatar_url: string;
  }>('/user', token);

  let primaryEmail = user.email;
  if (!primaryEmail) {
    try {
      const emails = await ghFetch<Array<{ email: string; primary: boolean; verified: boolean }>>(
        '/user/emails',
        token,
      );
      const found = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
      if (found) primaryEmail = found.email;
    } catch {
      // Fine-Grained PAT without user:email permission will cleanly fall back to noreply suggestion
    }
  }

  return {
    login: user.login,
    id: user.id,
    name: user.name,
    email: primaryEmail,
    noreplyEmail: `${user.id}+${user.login}@users.noreply.github.com`,
    avatarUrl: user.avatar_url,
  };
}

export interface RepoStatusInfo {
  exists: boolean;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  hasWorkflow: boolean;
}

export async function checkRepository(
  token: string,
  owner: string,
  repo: string,
): Promise<RepoStatusInfo> {
  const safeOwner = assertSafeOwner(owner);
  const safeRepo = assertSafeRepo(repo);
  const fallbackUrl = `https://github.com/${encodeURIComponent(safeOwner)}/${encodeURIComponent(safeRepo)}`;

  try {
    const data = await ghFetch<{
      fork: boolean;
      private: boolean;
      default_branch: string;
      html_url: string;
    }>(`/repos/${encodeURIComponent(safeOwner)}/${encodeURIComponent(safeRepo)}`, token);

    const safeDefaultBranch = assertSafeBranch(data.default_branch || 'main');
    let hasWorkflow = false;
    try {
      await ghFetch(
        `/repos/${encodeURIComponent(safeOwner)}/${encodeURIComponent(safeRepo)}/contents/${encodeRepoPath('.github/workflows/sakura-bullet-paint.yml')}?ref=${encodeURIComponent(safeDefaultBranch)}`,
        token,
      );
      hasWorkflow = true;
    } catch {
      hasWorkflow = false;
    }

    return {
      exists: true,
      isFork: data.fork,
      isPrivate: data.private,
      defaultBranch: safeDefaultBranch,
      htmlUrl: safeGitHubUrl(data.html_url, fallbackUrl),
      hasWorkflow,
    };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return {
        exists: false,
        isFork: false,
        isPrivate: false,
        defaultBranch: 'main',
        htmlUrl: fallbackUrl,
        hasWorkflow: false,
      };
    }
    throw err;
  }
}

export async function createStandaloneRepository(
  token: string,
  repoName: string,
  isPrivate = false,
): Promise<{ owner: string; repo: string; defaultBranch: string; htmlUrl: string }> {
  const safeRepo = assertSafeRepo(repoName);
  const created = await ghFetch<{
    name: string;
    default_branch: string;
    html_url: string;
    owner: { login: string };
  }>('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: safeRepo,
      private: isPrivate,
      auto_init: true,
      description: '🌸 Sakura Bullet Paint — Lycoris Recoil GitHub Contribution Canvas',
    }),
  });

  const safeOwner = assertSafeOwner(created.owner.login);
  const fallbackUrl = `https://github.com/${encodeURIComponent(safeOwner)}/${encodeURIComponent(created.name)}`;

  return {
    owner: safeOwner,
    repo: created.name,
    defaultBranch: assertSafeBranch(created.default_branch || 'main'),
    htmlUrl: safeGitHubUrl(created.html_url, fallbackUrl),
  };
}

interface ExistingFileInfo {
  sha: string;
  content?: string;
}

async function getExistingFileInfo(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<ExistingFileInfo | undefined> {
  try {
    const res = await ghFetch<{ sha: string; content?: string; encoding?: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(filePath)}?ref=${encodeURIComponent(branch)}`,
      token,
    );
    let content: string | undefined;
    if (typeof res.content === 'string' && (!res.encoding || res.encoding === 'base64')) {
      try {
        content = fromBase64Utf8(res.content);
      } catch {
        content = undefined;
      }
    }
    return { sha: res.sha, content };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return undefined;
    throw err;
  }
}

async function getExistingFileSha(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<string | undefined> {
  const info = await getExistingFileInfo(token, owner, repo, branch, filePath);
  return info?.sha;
}

export async function upsertRepoFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string,
  knownSha?: string,
): Promise<string | undefined> {
  const safeOwner = assertSafeOwner(owner);
  const safeRepo = assertSafeRepo(repo);
  const safeBranch = assertSafeBranch(branch);
  const sha = knownSha ?? (await getExistingFileSha(token, safeOwner, safeRepo, safeBranch, filePath));
  const res = await ghFetch<{ commit?: { sha?: string } }>(
    `/repos/${encodeURIComponent(safeOwner)}/${encodeURIComponent(safeRepo)}/contents/${encodeRepoPath(filePath)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: toBase64Utf8(content),
        branch: safeBranch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  return res?.commit?.sha;
}

export async function deployPlanViaActions(
  conn: GitHubConnection,
  plan: SakuraPlanPayload,
  onLog: (msg: string) => void,
): Promise<{ actionsUrl: string; profileUrl: string; commitSha?: string }> {
  const token = sanitizeToken(conn.token);
  const owner = assertSafeOwner(conn.owner);
  const repo = assertSafeRepo(conn.repo);

  onLog(`🔍 Memeriksa repository ${owner}/${repo}...`);
  let status = await checkRepository(token, owner, repo);

  if (!status.exists) {
    onLog(`📦 Repository belum ada, mencoba membuat repo baru "${repo}"...`);
    const created = await createStandaloneRepository(token, repo, false);
    status = {
      exists: true,
      isFork: false,
      isPrivate: false,
      defaultBranch: created.defaultBranch,
      htmlUrl: created.htmlUrl,
      hasWorkflow: false,
    };
    onLog(`✅ Repo standalone berhasil dibuat: ${created.htmlUrl}`);
  }

  if (status.isFork) {
    throw new Error(
      `Repository "${owner}/${repo}" adalah FORK! GitHub tidak menghitung commit di fork ke grafik kontribusi. Buat repo baru (bukan fork) atau gunakan template.`,
    );
  }

  const branch = assertSafeBranch(conn.branch || status.defaultBranch || 'main');

  const runnerInfo = await getExistingFileInfo(token, owner, repo, branch, 'scripts/execute-mission.mjs');
  const expectedRunner = MISSION_RUNNER_SCRIPT.replace(/\r\n/g, '\n').trim();
  const currentRunner = runnerInfo?.content?.replace(/\r\n/g, '\n').trim();

  if (!runnerInfo) {
    onLog('⚙️ Mengunggah scripts/execute-mission.mjs...');
    await upsertRepoFile(
      token,
      owner,
      repo,
      branch,
      'scripts/execute-mission.mjs',
      MISSION_RUNNER_SCRIPT,
      'feat: add Sakura Bullet mission runner [skip ci]',
    );
  } else if (currentRunner !== expectedRunner) {
    onLog('⚙️ Memperbarui scripts/execute-mission.mjs (batched push)...');
    await upsertRepoFile(
      token,
      owner,
      repo,
      branch,
      'scripts/execute-mission.mjs',
      MISSION_RUNNER_SCRIPT,
      'fix: update Sakura Bullet mission runner with batched push [skip ci]',
      runnerInfo.sha,
    );
  }

  const readmeSha = await getExistingFileSha(token, owner, repo, branch, 'README.md');
  if (!readmeSha) {
    onLog('📝 Membuat README.md...');
    await upsertRepoFile(
      token,
      owner,
      repo,
      branch,
      'README.md',
      createTargetRepoReadme(owner, repo),
      'docs: add Sakura Bullet Paint README [skip ci]',
    );
  }

  if (!status.hasWorkflow) {
    onLog('🤖 Mengunggah workflow .github/workflows/sakura-bullet-paint.yml...');
    try {
      await upsertRepoFile(
        token,
        owner,
        repo,
        branch,
        '.github/workflows/sakura-bullet-paint.yml',
        WORKFLOW_YAML,
        'ci: add Sakura Bullet Paint GitHub Actions workflow',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Gagal mengunggah file workflow (${msg}). Pastikan token PAT memiliki izin "Workflows: Read and write" (atau scope "workflow"), lalu coba lagi.`,
      );
    }
  }

  onLog(`🎯 Mengirim sakura-plan.json (mode: ${plan.mode}, ${plan.commits.length} hari aktif)...`);
  const commitSha = await upsertRepoFile(
    token,
    owner,
    repo,
    branch,
    'sakura-plan.json',
    formatPlanJson(plan),
    plan.mode === 'reset'
      ? '🌸 Café LycoReco: Request canvas reset'
      : `🌸 Café LycoReco: Deploy ${plan.theme} paint mission (${plan.commits.length} days)`,
  );

  onLog('🚀 sakura-plan.json berhasil di-commit! Memantau status GitHub Actions...');
  return {
    actionsUrl: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions`,
    profileUrl: `https://github.com/${encodeURIComponent(owner)}`,
    commitSha,
  };
}

export interface WorkflowRunSnapshot {
  id: number;
  runNumber: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  runStartedAt?: string;
}

export type WorkflowPollResult =
  | { state: 'success'; run: WorkflowRunSnapshot; durationSec: number }
  | { state: 'failure'; run: WorkflowRunSnapshot; durationSec: number }
  | { state: 'timeout'; run?: WorkflowRunSnapshot }
  | { state: 'unavailable'; reason: 'permission' | 'error'; message: string };

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function pollWorkflowRunCompletion(
  conn: GitHubConnection,
  commitSha: string | undefined,
  onStatusUpdate: (run: WorkflowRunSnapshot) => void,
  signal?: AbortSignal,
): Promise<WorkflowPollResult> {
  const token = sanitizeToken(conn.token);
  const owner = assertSafeOwner(conn.owner);
  const repo = assertSafeRepo(conn.repo);
  const fallbackUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions`;
  const startedAtMs = Date.now();

  let lastKey = '';
  let lastMatchedRun: WorkflowRunSnapshot | undefined;
  const maxAttempts = 85; // ~5 minutes max at 3.5s interval

  // Wait briefly for GitHub Actions to enqueue the push workflow
  if (!(await sleepWithAbort(2000, signal))) {
    return { state: 'timeout' };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      return { state: 'timeout', run: lastMatchedRun };
    }

    try {
      const query = commitSha
        ? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?head_sha=${encodeURIComponent(commitSha)}&per_page=5`
        : `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?event=push&per_page=10`;

      const data = await ghFetch<{
        workflow_runs?: Array<{
          id: number;
          run_number: number;
          status: string;
          conclusion: string | null;
          html_url?: string;
          head_sha?: string;
          path?: string;
          created_at: string;
          updated_at: string;
          run_started_at?: string;
        }>;
      }>(query, token);

      const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
      const matchedRaw =
        runs.find((r) => (commitSha ? r.head_sha === commitSha : true) && (!r.path || r.path.endsWith('sakura-bullet-paint.yml'))) ||
        runs.find((r) => new Date(r.created_at).getTime() >= startedAtMs - 15000);

      if (matchedRaw) {
        const snapshot: WorkflowRunSnapshot = {
          id: matchedRaw.id,
          runNumber: matchedRaw.run_number,
          status: matchedRaw.status,
          conclusion: matchedRaw.conclusion,
          htmlUrl: safeGitHubUrl(matchedRaw.html_url, fallbackUrl),
          createdAt: matchedRaw.created_at,
          updatedAt: matchedRaw.updated_at,
          runStartedAt: matchedRaw.run_started_at,
        };
        lastMatchedRun = snapshot;

        const key = `${snapshot.id}:${snapshot.status}:${snapshot.conclusion ?? ''}`;
        if (key !== lastKey) {
          lastKey = key;
          onStatusUpdate(snapshot);
        }

        if (snapshot.status === 'completed') {
          const startMs = new Date(snapshot.runStartedAt || snapshot.createdAt).getTime();
          const endMs = new Date(snapshot.updatedAt).getTime();
          const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
          if (snapshot.conclusion === 'success') {
            return { state: 'success', run: snapshot, durationSec };
          }
          return { state: 'failure', run: snapshot, durationSec };
        }
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 403 || status === 404) {
        return {
          state: 'unavailable',
          reason: 'permission',
          message: 'Tidak bisa memantau status Actions otomatis (repo private tanpa izin Actions: Read di PAT).',
        };
      }
      if (attempt >= 3 && !lastMatchedRun) {
        return {
          state: 'unavailable',
          reason: 'error',
          message: err instanceof Error ? err.message : 'Gagal membaca status GitHub Actions.',
        };
      }
    }

    if (!(await sleepWithAbort(3500, signal))) {
      return { state: 'timeout', run: lastMatchedRun };
    }
  }

  return { state: 'timeout', run: lastMatchedRun };
}

export async function runDirectBrowserCommits(
  conn: GitHubConnection,
  entries: MissionCommitEntry[],
  messageStyle: DailyShiftConfig['messageStyle'],
  onProgress: (done: number, total: number, currentDate: string) => void,
  onLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ totalCreated: number; profileUrl: string }> {
  const token = sanitizeToken(conn.token);
  const owner = assertSafeOwner(conn.owner);
  const repo = assertSafeRepo(conn.repo);
  const safeAuthorName = (conn.authorName || owner).replace(/[<>\r\n\0]/g, '').trim() || owner;
  const safeAuthorEmail = conn.authorEmail.replace(/[<>\r\n\0]/g, '').trim();
  if (!safeAuthorEmail || !safeAuthorEmail.includes('@')) {
    throw new Error('Email Akun GitHub wajib diisi dan valid.');
  }

  const status = await checkRepository(token, owner, repo);

  if (!status.exists) {
    throw new Error(`Repository ${owner}/${repo} tidak ditemukan.`);
  }
  if (status.isFork) {
    throw new Error(`Repository ${owner}/${repo} adalah FORK. Gunakan repository standalone agar tampil di grafik kontribusi.`);
  }

  const branch = assertSafeBranch(conn.branch || status.defaultBranch || 'main');
  const safeEntries = entries.filter((e) => SAFE_DATE_RE.test(e.date) && e.count > 0);
  const totalCommits = safeEntries.reduce((sum, e) => sum + Math.min(500, Math.max(0, Math.round(e.count))), 0);
  if (totalCommits === 0) {
    throw new Error('Tidak ada kotak terisi di kanvas.');
  }

  onLog(`🔗 Mengambil HEAD ref dari ${owner}/${repo} (${branch})...`);
  const refData = await ghFetch<{ object: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
  );
  let parentSha = refData.object.sha;

  const commitObj = await ghFetch<{ tree: { sha: string } }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(parentSha)}`,
    token,
  );
  const treeSha = commitObj.tree.sha;

  const pool = THEMED_COMMIT_MESSAGES[messageStyle] || THEMED_COMMIT_MESSAGES.lycoreco;
  let created = 0;

  for (const entry of safeEntries) {
    const count = Math.min(500, Math.max(0, Math.round(entry.count)));
    for (let i = 0; i < count; i++) {
      if (signal?.aborted) {
        if (created > 0) {
          await ghFetch(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
            token,
            { method: 'PATCH', body: JSON.stringify({ sha: parentSha }) },
          );
          onLog(`⏹️ Dibatalkan user. ${created} commit yang sudah jadi tetap disimpan.`);
        }
        throw new Error('Misi dibatalkan oleh user.');
      }

      const sec = String(i % 60).padStart(2, '0');
      const min = String(Math.floor(i / 60) % 60).padStart(2, '0');
      const isoDate = `${entry.date}T12:${min}:${sec}Z`;
      const message = `${pool[created % pool.length]} [${entry.date} #${i + 1}]`;

      const createdCommit = await ghFetch<{ sha: string }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            message,
            tree: treeSha,
            parents: [parentSha],
            author: {
              name: safeAuthorName,
              email: safeAuthorEmail,
              date: isoDate,
            },
            committer: {
              name: safeAuthorName,
              email: safeAuthorEmail,
              date: isoDate,
            },
          }),
        },
      );

      parentSha = createdCommit.sha;
      created += 1;
      onProgress(created, totalCommits, entry.date);
    }
  }

  onLog(`📌 Memperbarui branch ${branch} ke commit terakhir...`);
  await ghFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: parentSha }),
    },
  );

  onLog(`✅ Selesai! ${created} commit berhasil ditambahkan ke ${owner}/${repo}.`);
  return {
    totalCreated: created,
    profileUrl: `https://github.com/${encodeURIComponent(owner)}`,
  };
}
