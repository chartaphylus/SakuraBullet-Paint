import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  FolderGit2,
  FolderPlus,
  GitBranch,
  Github,
  HelpCircle,
  KeyRound,
  Loader2,
  Mail,
  Play,
  Rocket,
  RotateCcw,
  Terminal,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import type { ThemePaletteConfig } from '../data/themes';
import type { MissionSummary } from '../lib/calendarGrid';
import {
  checkRepository,
  createStandaloneRepository,
  deployPlanViaActions,
  pollWorkflowRunCompletion,
  runDirectBrowserCommits,
  verifyGitHubToken,
  type RepoStatusInfo,
  type VerifiedUserInfo,
} from '../lib/githubApi';
import { formatPlanJson } from '../lib/repoTemplateFiles';
import {
  generateBashMissionScript,
  generatePowerShellMissionScript,
} from '../lib/scriptGenerator';
import type {
  DailyShiftConfig,
  GitHubConnection,
  SakuraPlanPayload,
  ThemeId,
} from '../types/paint';

interface MissionDeployPanelProps {
  theme: ThemePaletteConfig;
  themeId: ThemeId;
  connection: GitHubConnection;
  onChangeConnection: (conn: GitHubConnection) => void;
  onClearToken: () => void;
  summary: MissionSummary;
  dailyShift: DailyShiftConfig;
  onDeploySuccess?: (msg: string, variant?: 'info' | 'success' | 'error') => void;
}

type DeployTab = 'actions' | 'direct' | 'offline';

type MissionNotificationState =
  | {
      status: 'tracking';
      mode: 'paint' | 'reset';
      runNumber?: number;
      runStatus?: string;
      runUrl?: string;
    }
  | {
      status: 'success';
      mode: 'paint' | 'reset' | 'direct';
      title: string;
      detail: string;
      runUrl?: string;
      profileUrl?: string;
    }
  | {
      status: 'failure';
      title: string;
      detail: string;
      runUrl?: string;
    }
  | {
      status: 'info';
      title: string;
      detail: string;
      runUrl?: string;
    };

export function MissionDeployPanel({
  theme,
  themeId,
  connection,
  onChangeConnection,
  onClearToken,
  summary,
  dailyShift,
  onDeploySuccess,
}: MissionDeployPanelProps) {
  const [activeTab, setActiveTab] = useState<DeployTab>('actions');
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUserInfo | null>(null);
  const [repoStatus, setRepoStatus] = useState<RepoStatusInfo | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{ actionsUrl?: string; profileUrl?: string } | null>(null);
  const [missionBanner, setMissionBanner] = useState<MissionNotificationState | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; date: string } | null>(null);
  const [scriptFormat, setScriptFormat] = useState<'ps1' | 'sh'>('ps1');
  const [copiedScript, setCopiedScript] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const sendDesktopNotification = (title: string, body: string, targetUrl?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const notif = new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        tag: 'sakura-bullet-mission',
      });
      if (targetUrl && targetUrl.startsWith('https://github.com/')) {
        notif.onclick = () => {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          notif.close();
        };
      }
    } catch {
      // Ignore environments restricting new Notification()
    }
  };

  const requestDesktopNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotifPerm(result);
      if (result === 'granted') {
        sendDesktopNotification(
          'Sakura Bullet Paint',
          'Notifikasi desktop aktif! Kamu akan diberi tahu saat GitHub Actions selesai.',
        );
      }
    } catch {
      // Ignore permission rejection
    }
  };

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const buildPlanPayload = (mode: SakuraPlanPayload['mode']): SakuraPlanPayload => ({
    version: 1,
    theme: themeId,
    mode,
    generatedAt: new Date().toISOString(),
    authorName: connection.authorName || connection.owner || 'Lycoris Agent',
    authorEmail: connection.authorEmail.trim(),
    messageStyle: dailyShift.messageStyle,
    dailyShift,
    commits: mode === 'reset' ? [] : summary.commits,
  });

  const handleVerifyUser = async () => {
    if (!connection.token.trim()) {
      setErrorMsg('Masukkan GitHub Personal Access Token terlebih dahulu.');
      return;
    }
    setIsBusy(true);
    setErrorMsg(null);
    setLogs([]);
    try {
      appendLog('Memverifikasi token ke GitHub API...');
      const user = await verifyGitHubToken(connection.token);
      setVerifiedUser(user);
      const nextOwner = connection.owner || user.login;
      onChangeConnection({
        ...connection,
        owner: nextOwner,
        authorName: connection.authorName || user.name || user.login,
        authorEmail: connection.authorEmail || user.email || user.noreplyEmail,
      });
      appendLog(`Terhubung sebagai @${user.login}`);

      if (nextOwner && connection.repo.trim()) {
        const status = await checkRepository(connection.token, nextOwner, connection.repo.trim());
        setRepoStatus(status);
        appendLog(
          status.exists
            ? status.isFork
              ? `Peringatan: Repo "${nextOwner}/${connection.repo}" adalah FORK.`
              : `Repo "${nextOwner}/${connection.repo}" siap.`
            : `Repo "${nextOwner}/${connection.repo}" belum ada — bisa dibuat otomatis.`,
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memverifikasi token.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!connection.token.trim() || !connection.repo.trim()) {
      setErrorMsg('Isi Token dan Nama Repository terlebih dahulu.');
      return;
    }
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const targetOwner = connection.owner || verifiedUser?.login || '';
      if (!targetOwner) {
        throw new Error('Isi Username GitHub (Owner) atau klik "Verifikasi" terlebih dulu.');
      }
      const existing = await checkRepository(connection.token, targetOwner, connection.repo);
      setRepoStatus(existing);
      if (existing.exists) {
        appendLog(`Repository ditemukan: ${existing.htmlUrl} (branch: ${existing.defaultBranch})`);
        onChangeConnection({ ...connection, branch: existing.defaultBranch });
      } else {
        appendLog(`Membuat repository standalone "${connection.repo}"...`);
        const created = await createStandaloneRepository(connection.token, connection.repo, false);
        onChangeConnection({
          ...connection,
          owner: created.owner,
          repo: created.repo,
          branch: created.defaultBranch,
        });
        setRepoStatus({
          exists: true,
          isFork: false,
          isPrivate: false,
          defaultBranch: created.defaultBranch,
          htmlUrl: created.htmlUrl,
          hasWorkflow: false,
        });
        appendLog(`Repository berhasil dibuat: ${created.htmlUrl}`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memeriksa / membuat repository.');
    } finally {
      setIsBusy(false);
    }
  };

  const validateReady = (requireCommits: boolean): boolean => {
    if (!connection.token.trim()) {
      setErrorMsg('Masukkan GitHub Token (PAT) terlebih dahulu.');
      return false;
    }
    if (!connection.owner.trim() || !connection.repo.trim()) {
      setErrorMsg('Username Owner dan Nama Repository wajib diisi.');
      return false;
    }
    if (!connection.authorEmail.trim() || !connection.authorEmail.includes('@')) {
      setErrorMsg('Email Akun GitHub wajib diisi dan harus cocok dengan akun GitHub kamu.');
      return false;
    }
    if (requireCommits && summary.totalCommits === 0) {
      setErrorMsg('Kanvas masih kosong! Atur Auto-Fill 15%–100% atau lukis minimal 1 kotak dulu.');
      return false;
    }
    return true;
  };

  const startWorkflowTracking = async (
    mode: 'paint' | 'reset',
    deployRes: { actionsUrl: string; profileUrl: string; commitSha?: string },
  ) => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    setMissionBanner({
      status: 'tracking',
      mode,
      runStatus: 'queued',
      runUrl: deployRes.actionsUrl,
    });
    onDeploySuccess?.(
      mode === 'reset'
        ? 'Permintaan reset dikirim! Memantau GitHub Actions hingga selesai...'
        : `Misi dikirim ke ${connection.owner}/${connection.repo}! Memantau status workflow...`,
      'info',
    );

    const result = await pollWorkflowRunCompletion(
      connection,
      deployRes.commitSha,
      (run) => {
        if (controller.signal.aborted) return;
        setMissionBanner({
          status: 'tracking',
          mode,
          runNumber: run.runNumber,
          runStatus: run.status,
          runUrl: run.htmlUrl,
        });
        if (run.status === 'queued' || run.status === 'waiting') {
          appendLog(`⏳ Workflow #${run.runNumber} masuk antrean GitHub Actions...`);
        } else if (run.status === 'in_progress') {
          appendLog(`⚙️ Workflow #${run.runNumber} sedang mengeksekusi batched commit push...`);
        }
      },
      controller.signal,
    );

    if (controller.signal.aborted) return;

    if (result.state === 'success') {
      const title =
        mode === 'reset'
          ? `Reset Repo Berhasil! (Run #${result.run.runNumber}, ${result.durationSec}s)`
          : `Misi Berhasil Dieksekusi! (Run #${result.run.runNumber}, ${result.durationSec}s)`;
      const detail =
        mode === 'reset'
          ? 'Histori kanvas repo telah dibersihkan ke 1 commit awal. Kamu bisa lanjut Execute Mission sekarang.'
          : `${summary.totalCommits.toLocaleString()} commit berhasil di-push per batch ke ${connection.owner}/${connection.repo}. Refresh profil GitHub dalam 1–2 menit.`;
      appendLog(`✅ ${title}`);
      setMissionBanner({
        status: 'success',
        mode,
        title,
        detail,
        runUrl: result.run.htmlUrl,
        profileUrl: deployRes.profileUrl,
      });
      onDeploySuccess?.(`✅ ${title}`, 'success');
      sendDesktopNotification(`🌸 ${title}`, detail, deployRes.profileUrl);
      return;
    }

    if (result.state === 'failure') {
      const title = `Workflow #${result.run.runNumber} gagal (${result.run.conclusion || 'error'})`;
      const detail = 'Buka detail GitHub Actions untuk melihat log error workflow.';
      appendLog(`❌ ${title}`);
      setMissionBanner({
        status: 'failure',
        title,
        detail,
        runUrl: result.run.htmlUrl,
      });
      onDeploySuccess?.(`❌ ${title}`, 'error');
      sendDesktopNotification(`⚠️ ${title}`, detail, result.run.htmlUrl);
      return;
    }

    if (result.state === 'unavailable') {
      appendLog(`ℹ️ ${result.message}`);
      setMissionBanner({
        status: 'info',
        title: 'Commit Terkirim ke GitHub!',
        detail: `${result.message} Cek tab GitHub Actions untuk melihat status selesai.`,
        runUrl: deployRes.actionsUrl,
      });
      return;
    }

    setMissionBanner({
      status: 'info',
      title: 'Workflow Masih Berjalan / Belum Terdeteksi Selesai',
      detail: 'Cek langsung tab GitHub Actions pada tombol di bawah untuk melihat progres terbaru.',
      runUrl: result.run?.htmlUrl || deployRes.actionsUrl,
    });
  };

  const handleExecuteActions = async () => {
    if (!validateReady(true)) return;
    pollAbortRef.current?.abort();
    setIsBusy(true);
    setErrorMsg(null);
    setResultLinks(null);
    setMissionBanner(null);
    setLogs([]);
    let deployRes: { actionsUrl: string; profileUrl: string; commitSha?: string } | null = null;
    try {
      const plan = buildPlanPayload('paint');
      deployRes = await deployPlanViaActions(connection, plan, appendLog);
      setResultLinks(deployRes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal deploy misi ke GitHub Actions.');
    } finally {
      setIsBusy(false);
    }
    if (deployRes) {
      void startWorkflowTracking('paint', deployRes);
    }
  };

  const handleResetRepo = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    if (!validateReady(false)) return;
    pollAbortRef.current?.abort();
    setConfirmReset(false);
    setIsBusy(true);
    setErrorMsg(null);
    setResultLinks(null);
    setMissionBanner(null);
    setLogs([]);
    let deployRes: { actionsUrl: string; profileUrl: string; commitSha?: string } | null = null;
    try {
      const plan = buildPlanPayload('reset');
      deployRes = await deployPlanViaActions(connection, plan, appendLog);
      setResultLinks(deployRes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal reset repository.');
    } finally {
      setIsBusy(false);
    }
    if (deployRes) {
      void startWorkflowTracking('reset', deployRes);
    }
  };

  const handleRunDirectCommits = async () => {
    if (!validateReady(true)) return;
    pollAbortRef.current?.abort();
    setIsBusy(true);
    setErrorMsg(null);
    setResultLinks(null);
    setMissionBanner(null);
    setLogs([]);
    setProgress({ done: 0, total: summary.totalCommits, date: '' });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await runDirectBrowserCommits(
        connection,
        summary.commits,
        dailyShift.messageStyle,
        (done, total, date) => setProgress({ done, total, date }),
        appendLog,
        controller.signal,
      );
      setResultLinks({ profileUrl: res.profileUrl });
      const title = `${res.totalCreated.toLocaleString()} Commit Berhasil Di-Push!`;
      const detail = `Semua commit langsung sudah masuk ke ${connection.owner}/${connection.repo}.`;
      setMissionBanner({
        status: 'success',
        mode: 'direct',
        title,
        detail,
        profileUrl: res.profileUrl,
      });
      onDeploySuccess?.(`✅ ${title}`, 'success');
      sendDesktopNotification(`🌸 ${title}`, detail, res.profileUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat commit dari browser.');
    } finally {
      setIsBusy(false);
      abortRef.current = null;
    }
  };

  const scriptContent =
    scriptFormat === 'ps1'
      ? generatePowerShellMissionScript({
          authorName: connection.authorName || connection.owner || 'Lycoris Agent',
          authorEmail: connection.authorEmail || 'your-email@users.noreply.github.com',
          repoName: connection.repo || 'sakura-bullet-canvas',
          entries: summary.commits,
          messageStyle: dailyShift.messageStyle,
        })
      : generateBashMissionScript({
          authorName: connection.authorName || connection.owner || 'Lycoris Agent',
          authorEmail: connection.authorEmail || 'your-email@users.noreply.github.com',
          repoName: connection.repo || 'sakura-bullet-canvas',
          entries: summary.commits,
          messageStyle: dailyShift.messageStyle,
        });

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasToken = connection.token.trim().length > 0;
  const hasTarget = connection.owner.trim().length > 0 && connection.repo.trim().length > 0;
  const hasEmail = connection.authorEmail.trim().includes('@');

  return (
    <section
      id="deploy-section"
      className={`scroll-mt-20 rounded-2xl border ${theme.borderColor} ${theme.surfaceBg} p-4 shadow-sm sm:p-6 transition-colors space-y-5`}
    >
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accentSoftBg} ${theme.accentSoftText}`}>
            <Github className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`font-display text-base font-extrabold sm:text-lg ${theme.textPrimary}`}>
              Eksekusi Misi ke Akun GitHub
            </h3>
            <p className={`text-xs ${theme.textSecondary}`}>
              Tanpa database — semua user langsung pakai akun & repo GitHub masing-masing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`hidden items-center gap-2 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-1.5 font-mono text-[11px] font-semibold md:flex`}>
            <span className={activeTab === 'offline' || hasToken ? 'text-emerald-600 dark:text-emerald-400' : theme.textSecondary}>
              {activeTab === 'offline' || hasToken ? '✓' : '○'} {activeTab === 'offline' ? 'Offline' : 'Token'}
            </span>
            <span className="opacity-30">|</span>
            <span className={hasTarget ? 'text-emerald-600 dark:text-emerald-400' : theme.textSecondary}>
              {hasTarget ? '✓' : '○'} Repo
            </span>
            <span className="opacity-30">|</span>
            <span className={hasEmail ? 'text-emerald-600 dark:text-emerald-400' : theme.textSecondary}>
              {hasEmail ? '✓' : '○'} Email
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-1.5 text-xs font-bold ${theme.textPrimary} hover:border-rose-400`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showGuide ? 'Tutup Panduan' : 'Cara Setup'}
          </button>
        </div>
      </div>

      {/* Collapsible Compact Setup Guide */}
      {showGuide && (
        <div className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-3.5 space-y-2.5 text-xs`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className={theme.textPrimary}>3 Syarat Agar Kotak Hijau Muncul:</strong>
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 font-bold hover:underline ${theme.secondaryAccentText}`}
            >
              Buat Token PAT di GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <ol className={`grid gap-2 sm:grid-cols-3 text-[11px] ${theme.textSecondary}`}>
            <li>
              <strong className={theme.textPrimary}>1. Repo Mandiri:</strong> Buat repo baru (bukan fork), misal{' '}
              <code>sakura-bullet-canvas</code>.
            </li>
            <li>
              <strong className={theme.textPrimary}>2. Izin Token PAT:</strong> Fine-Grained Token dengan izin{' '}
              <em>Contents</em> &amp; <em>Workflows: Read and write</em>.
            </li>
            <li>
              <strong className={theme.textPrimary}>3. Email Cocok:</strong> Isi Author Email sesuai email terverifikasi akun GitHub.
            </li>
          </ol>
        </div>
      )}

      {/* Clean Segmented Method Tabs */}
      <div className="space-y-2">
        <div className={`grid grid-cols-1 gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-1 sm:grid-cols-3`}>
          {(
            [
              { id: 'actions', label: 'GitHub Actions (Rekomendasi)', icon: Cpu },
              { id: 'direct', label: 'Direct Browser API', icon: Zap },
              { id: 'offline', label: 'Export Script Offline', icon: FileCode2 },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  active
                    ? `${theme.accentBg} ${theme.accentText} shadow-sm`
                    : `${theme.textSecondary} hover:opacity-85`
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <p className={`text-xs ${theme.textSecondary}`}>
          {activeTab === 'actions' &&
            'Mengirim file konfigurasi ke repo sehingga ribuan commit dijalankan cepat oleh GitHub Actions (+ jadwal cron harian).'}
          {activeTab === 'direct' &&
            'Membuat commit langsung dari browser melalui GitHub REST API tanpa memasang file workflow (ideal < 400 commit).'}
          {activeTab === 'offline' &&
            'Menghasilkan script PowerShell (.ps1) atau Bash (.sh) untuk dijalankan di terminal lokal tanpa menempel token di browser.'}
        </p>
      </div>

      {/* Verified User Slim Banner */}
      {verifiedUser && activeTab !== 'offline' && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3.5 py-2.5`}>
          <div className="flex items-center gap-2.5">
            <img
              src={verifiedUser.avatarUrl}
              alt={verifiedUser.login}
              className="h-8 w-8 rounded-full border border-emerald-500/40 object-cover"
            />
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <span className={theme.textPrimary}>{verifiedUser.name || verifiedUser.login}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">@{verifiedUser.login}</span>
              </div>
              <div className={`font-mono text-[11px] ${theme.textSecondary}`}>
                Target: {connection.owner || verifiedUser.login}/{connection.repo || 'sakura-bullet-canvas'} ({connection.branch || 'main'})
              </div>
            </div>
          </div>

          {repoStatus && (
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold ${
                repoStatus.isFork
                  ? 'bg-rose-500/15 text-rose-500'
                  : repoStatus.exists
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
              }`}
            >
              {repoStatus.isFork
                ? '⚠ Repo ini Fork'
                : repoStatus.exists
                  ? '✓ Repo Siap'
                  : '○ Repo Belum Ada'}
            </span>
          )}
        </div>
      )}

      {/* Clean Credentials & Target Form */}
      <div className="space-y-3">
        {activeTab !== 'offline' && (
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className={`font-semibold ${theme.textPrimary}`}>
                GitHub Token (PAT){' '}
                <span className={`font-normal ${theme.textSecondary}`}>(tersimpan di sesi browser saja)</span>
              </label>
              <div className="flex items-center gap-3 text-[11px]">
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 font-semibold hover:underline ${theme.secondaryAccentText}`}
                >
                  Buat PAT
                  <ExternalLink className="h-3 w-3" />
                </a>
                {connection.token && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearToken();
                      setVerifiedUser(null);
                      setRepoStatus(null);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-rose-500 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <KeyRound className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${theme.textSecondary}`} />
                <input
                  type={showToken ? 'text' : 'password'}
                  value={connection.token}
                  onChange={(e) => onChangeConnection({ ...connection, token: e.target.value })}
                  placeholder="github_pat_... atau ghp_..."
                  autoComplete="off"
                  className={`w-full rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} py-2 pl-9 pr-9 font-mono text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${theme.textSecondary}`}
                  aria-label="Toggle token visibility"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleVerifyUser}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-4 py-2 text-xs font-bold ${theme.textPrimary} transition hover:border-rose-400 disabled:opacity-50`}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                Verifikasi &amp; Auto-Isi
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${theme.textSecondary}`}>
              <User className="h-3.5 w-3.5" />
              Username GitHub
            </span>
            <input
              type="text"
              value={connection.owner}
              onChange={(e) => {
                setRepoStatus(null);
                onChangeConnection({ ...connection, owner: e.target.value.trim() });
              }}
              placeholder="username-github"
              className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2 font-mono text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${theme.textSecondary}`}>
              <FolderGit2 className="h-3.5 w-3.5" />
              Nama Repo (Non-Fork)
            </span>
            <input
              type="text"
              value={connection.repo}
              onChange={(e) => {
                setRepoStatus(null);
                onChangeConnection({ ...connection, repo: e.target.value.trim() });
              }}
              placeholder="sakura-bullet-canvas"
              className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2 font-mono text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${theme.textSecondary}`}>
              <GitBranch className="h-3.5 w-3.5" />
              Branch
            </span>
            <input
              type="text"
              value={connection.branch}
              onChange={(e) => onChangeConnection({ ...connection, branch: e.target.value.trim() })}
              placeholder="main"
              className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2 font-mono text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${theme.textSecondary}`}>
              <User className="h-3.5 w-3.5" />
              Author Name (Git)
            </span>
            <input
              type="text"
              value={connection.authorName}
              onChange={(e) => onChangeConnection({ ...connection, authorName: e.target.value })}
              placeholder="Nama Kamu"
              className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2 text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${theme.textSecondary}`}>
              <Mail className="h-3.5 w-3.5" />
              Email Akun GitHub
            </span>
            <input
              type="email"
              value={connection.authorEmail}
              onChange={(e) => onChangeConnection({ ...connection, authorEmail: e.target.value.trim() })}
              placeholder="email@gmail.com atau noreply@users.noreply.github.com"
              className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2 font-mono text-base outline-none focus:ring-2 focus:ring-rose-500/25 sm:text-xs ${theme.textPrimary}`}
            />
          </label>
        </div>
      </div>

      {/* Mode Specific Actions */}
      {activeTab === 'actions' && (
        <div className="flex flex-col gap-2.5 border-t border-current/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleExecuteActions}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold sm:w-auto ${theme.accentGradient} ${theme.accentText} shadow-sm transition hover:opacity-95 disabled:opacity-50`}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Execute Mission · {summary.totalCommits.toLocaleString()} Commits
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleCreateRepo}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3.5 py-2.5 text-xs font-bold ${theme.textPrimary} hover:border-rose-400 disabled:opacity-50`}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Cek / Buat Repo
            </button>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={handleResetRepo}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
              confirmReset
                ? 'border-rose-500 bg-rose-600 text-white'
                : `${theme.borderColor} ${theme.surfaceMutedBg} text-rose-500 hover:border-rose-400`
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {confirmReset ? 'Klik Lagi untuk Reset!' : 'Reset Repo'}
          </button>
        </div>
      )}

      {activeTab === 'direct' && (
        <div className="space-y-3 border-t border-current/10 pt-4">
          {summary.totalCommits > 400 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Total commit <strong>{summary.totalCommits.toLocaleString()}</strong>. Di atas 400 commit sebaiknya gunakan{' '}
                <strong>GitHub Actions</strong> agar jauh lebih cepat dan tidak kena rate limit API.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleRunDirectCommits}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold ${theme.accentGradient} ${theme.accentText} shadow-sm disabled:opacity-50`}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Push dari Browser · {summary.totalCommits.toLocaleString()} Commits
            </button>

            {isBusy && abortRef.current && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rounded-xl border border-rose-500 px-3.5 py-2.5 text-xs font-bold text-rose-500"
              >
                Batalkan
              </button>
            )}
          </div>

          {progress && (
            <div className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-3`}>
              <div className="flex justify-between font-mono text-xs">
                <span className={`font-bold ${theme.textPrimary}`}>
                  Progress: {progress.done} / {progress.total}
                </span>
                <span className={theme.textSecondary}>{progress.date}</span>
              </div>
              <div className={`mt-2 h-2 w-full overflow-hidden rounded-full ${theme.surfaceBg}`}>
                <div
                  className={`h-full transition-all ${theme.accentGradient}`}
                  style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'offline' && (
        <div className="space-y-3 border-t border-current/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScriptFormat('ps1')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  scriptFormat === 'ps1'
                    ? `${theme.accentBg} ${theme.accentText}`
                    : `border ${theme.borderColor} ${theme.surfaceMutedBg} ${theme.textPrimary}`
                }`}
              >
                PowerShell (.ps1)
              </button>
              <button
                type="button"
                onClick={() => setScriptFormat('sh')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  scriptFormat === 'sh'
                    ? `${theme.accentBg} ${theme.accentText}`
                    : `border ${theme.borderColor} ${theme.surfaceMutedBg} ${theme.textPrimary}`
                }`}
              >
                Bash (.sh)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(scriptContent);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 1800);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-1.5 text-xs font-bold ${theme.textPrimary}`}
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedScript ? 'Tersalin!' : 'Salin'}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    scriptFormat === 'ps1' ? 'sakura-mission.ps1' : 'sakura-mission.sh',
                    scriptContent,
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold ${theme.accentBg} ${theme.accentText}`}
              >
                <Download className="h-3.5 w-3.5" />
                Download .{scriptFormat}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadFile('sakura-plan.json', formatPlanJson(buildPlanPayload('paint')))
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-1.5 text-xs font-bold ${theme.textPrimary}`}
              >
                <Download className="h-3.5 w-3.5" />
                sakura-plan.json
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B101B]">
            <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 font-mono text-[11px] text-slate-400">
              <span>{scriptFormat === 'ps1' ? 'sakura-mission.ps1' : 'sakura-mission.sh'}</span>
              <span>{summary.totalCommits.toLocaleString()} commits</span>
            </div>
            <pre
              data-allow-context="true"
              className="max-h-48 overflow-auto p-3.5 font-mono text-[11px] leading-relaxed text-slate-200"
            >
              {scriptContent}
            </pre>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Live Mission Status & Completion Notification Banner */}
      {missionBanner && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-3.5 text-xs transition-all ${
            missionBanner.status === 'success'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : missionBanner.status === 'failure'
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              {missionBanner.status === 'tracking' ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : missionBanner.status === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}

              <div className="space-y-1">
                <div className="font-bold">
                  {missionBanner.status === 'tracking'
                    ? missionBanner.runStatus === 'in_progress'
                      ? `⚙️ GitHub Actions sedang berjalan${missionBanner.runNumber ? ` (#${missionBanner.runNumber})` : ''}...`
                      : `⏳ Menunggu GitHub Actions${missionBanner.runNumber ? ` (#${missionBanner.runNumber})` : ''}...`
                    : missionBanner.title}
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {missionBanner.status === 'tracking'
                    ? 'Halaman ini memantau status workflow secara otomatis sampai selesai. Jangan tutup tab dulu jika ingin melihat notifikasi berhasil di sini.'
                    : missionBanner.detail}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {missionBanner.status === 'tracking' && notifPerm === 'default' && (
                <button
                  type="button"
                  onClick={requestDesktopNotifications}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold hover:bg-sky-500/25"
                >
                  <Bell className="h-3 w-3" />
                  Aktifkan Notif Browser
                </button>
              )}
              {missionBanner.status === 'tracking' && notifPerm === 'granted' && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 px-2 py-1 text-[11px] font-semibold">
                  <Bell className="h-3 w-3" />
                  Notif Aktif
                </span>
              )}
              {missionBanner.runUrl && (
                <a
                  href={missionBanner.runUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-current/25 px-2.5 py-1 text-[11px] font-bold hover:underline"
                >
                  Lihat Workflow
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {missionBanner.status === 'success' && missionBanner.profileUrl && (
                <a
                  href={missionBanner.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
                >
                  Cek Profil GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Execution Log Terminal */}
      {(logs.length > 0 || resultLinks) && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B101B] text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              <span>LOG EKSEKUSI</span>
            </div>

            {resultLinks && (
              <div className="flex flex-wrap gap-2">
                {notifPerm === 'default' && (
                  <button
                    type="button"
                    onClick={requestDesktopNotifications}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-700"
                  >
                    <Bell className="h-3 w-3 text-amber-400" />
                    Notif Browser
                  </button>
                )}
                {resultLinks.actionsUrl && (
                  <a
                    href={resultLinks.actionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Buka GitHub Actions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {resultLinks.profileUrl && (
                  <a
                    href={resultLinks.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-700"
                  >
                    Profil GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div
            data-allow-context="true"
            className="max-h-36 space-y-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
          >
            {logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
