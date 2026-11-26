const PLAYER_ID_COOKIE = 'mg_anon_id';
const SESSION_ID_KEY = 'mg_metrics_session_id';

interface ActiveVisit {
	visitId: string;
	gameId: string | null;
	accumulatedMs: number;
	visibleSince: number | null;
}

/**
 * Lightweight, fire-and-forget user metrics tracker for math-games.
 * Tracks session entry/exit, page views, and active time spent per game.
 */
class MathGamesMetrics {
	private playerId: string | null = null;
	private sessionId: string | null = null;
	private lastTrackedPath: string | null = null;
	private activeVisit: ActiveVisit | null = null;
	private lifecycleBound = false;

	initLifecycle(): () => void {
		if (typeof window === 'undefined' || this.lifecycleBound) {
			return () => {};
		}
		this.lifecycleBound = true;

		const onVisibilityChange = () => {
			if (!this.activeVisit) return;
			if (document.visibilityState === 'hidden') {
				this.pauseActiveVisit();
				this.flushActiveVisit();
			} else {
				this.resumeActiveVisit();
			}
		};

		const onPageHide = () => {
			this.pauseActiveVisit();
			this.sendBeacon('session-end', {
				sessionId: this.getOrCreateSessionId(),
				visitId: this.activeVisit?.visitId ?? undefined,
				durationSeconds: this.activeVisit
					? Math.round(this.activeVisit.accumulatedMs / 1000)
					: undefined
			});
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('pagehide', onPageHide);

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('pagehide', onPageHide);
			this.lifecycleBound = false;
		};
	}

	trackPageView(path: string, gameId: string | null = null): void {
		try {
			if (typeof window === 'undefined' || typeof fetch !== 'function') return;
			if (!path || path === this.lastTrackedPath) return;

			// Close out the previous visit's timer before starting the new one
			this.endActiveVisit();

			this.lastTrackedPath = path;
			const visitId = this.uuid();
			const sessionId = this.getOrCreateSessionId();
			const playerId = this.getOrCreatePlayerId();
			const isMobile =
				/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
				window.innerWidth < 768;

			this.activeVisit = {
				visitId,
				gameId,
				accumulatedMs: 0,
				visibleSince: document.visibilityState === 'hidden' ? null : Date.now()
			};

			this.post('page-view', {
				visitId,
				sessionId,
				playerId,
				isMobile,
				referrer: document.referrer || null,
				path,
				gameId
			});
		} catch {
			// Never surface analytics errors to users
		}
	}

	private endActiveVisit(): void {
		if (!this.activeVisit) return;
		this.pauseActiveVisit();
		this.flushActiveVisit();
		this.activeVisit = null;
	}

	private pauseActiveVisit(): void {
		if (!this.activeVisit || this.activeVisit.visibleSince === null) return;
		this.activeVisit.accumulatedMs += Math.max(0, Date.now() - this.activeVisit.visibleSince);
		this.activeVisit.visibleSince = null;
	}

	private resumeActiveVisit(): void {
		if (!this.activeVisit || this.activeVisit.visibleSince !== null) return;
		this.activeVisit.visibleSince = Date.now();
	}

	private flushActiveVisit(): void {
		if (!this.activeVisit) return;
		const durationSeconds = Math.round(this.activeVisit.accumulatedMs / 1000);
		this.post('visit-end', {
			visitId: this.activeVisit.visitId,
			durationSeconds
		});
	}

	private post(op: string, payload: Record<string, unknown>): void {
		if (typeof fetch !== 'function') return;
		fetch('/api/metrics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ op, ...payload }),
			keepalive: true
		}).catch(() => {});
	}

	private sendBeacon(op: string, payload: Record<string, unknown>): void {
		try {
			const body = JSON.stringify({ op, ...payload });
			if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
				const blob = new Blob([body], { type: 'application/json' });
				if (navigator.sendBeacon('/api/metrics', blob)) {
					return;
				}
			}
			this.post(op, payload);
		} catch {
			// Ignore unload errors
		}
	}

	private getOrCreateSessionId(): string {
		if (this.sessionId) return this.sessionId;
		const existing = window.sessionStorage?.getItem(SESSION_ID_KEY);
		if (existing) {
			this.sessionId = existing;
			return existing;
		}
		const created = this.uuid();
		window.sessionStorage?.setItem(SESSION_ID_KEY, created);
		this.sessionId = created;
		return created;
	}

	private getOrCreatePlayerId(): string {
		if (this.playerId) return this.playerId;

		const encodedName = `${encodeURIComponent(PLAYER_ID_COOKIE)}=`;
		const parts = (document.cookie || '').split(';');
		for (const part of parts) {
			const cookie = part.trim();
			if (cookie.startsWith(encodedName)) {
				this.playerId = decodeURIComponent(cookie.slice(encodedName.length));
				return this.playerId;
			}
		}

		const created = this.uuid();
		const maxAge = 365 * 24 * 60 * 60;
		document.cookie = `${encodeURIComponent(PLAYER_ID_COOKIE)}=${encodeURIComponent(created)}; path=/; max-age=${maxAge}; SameSite=Lax`;
		this.playerId = created;
		return created;
	}

	private uuid(): string {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}
}

export const metrics = new MathGamesMetrics();
