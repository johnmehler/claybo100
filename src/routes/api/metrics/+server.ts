import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
	if (cachedClient) return cachedClient;

	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return null;
	}

	cachedClient = createClient(supabaseUrl, supabaseKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	return cachedClient;
}

interface MetricsPayload {
	op?: string;
	visitId?: string;
	sessionId?: string;
	playerId?: string;
	isMobile?: boolean;
	referrer?: string | null;
	path?: string;
	gameId?: string | null;
	durationSeconds?: number;
}

async function ensureSession(client: SupabaseClient, payload: MetricsPayload): Promise<void> {
	const { sessionId, playerId, isMobile, referrer } = payload;
	if (!sessionId || !playerId) return;

	const { error } = await client
		.from('mg_sessions')
		.upsert(
			{
				id: sessionId,
				player_id: String(playerId).slice(0, 64),
				is_mobile: Boolean(isMobile),
				referrer: referrer ? String(referrer).slice(0, 255) : null,
				last_seen_at: new Date().toISOString()
			},
			{ onConflict: 'id', ignoreDuplicates: true }
		);

	if (error) {
		throw new Error(`session upsert failed: ${error.message}`);
	}
}

async function handlePageView(client: SupabaseClient, payload: MetricsPayload): Promise<void> {
	const { visitId, sessionId, playerId, path, gameId } = payload;
	if (!playerId || !path) return;

	if (sessionId) {
		await ensureSession(client, payload);
	}

	const cleanGameId = gameId ? String(gameId).slice(0, 64) : null;
	const eventType = cleanGameId ? 'game_open' : 'page_view';

	const { error } = await client.from('mg_events').insert({
		visit_id: visitId || null,
		session_id: sessionId || null,
		player_id: String(playerId).slice(0, 64),
		event_type: eventType,
		path: String(path).slice(0, 255),
		game_id: cleanGameId
	});

	if (error) {
		throw new Error(`event insert failed: ${error.message}`);
	}

	if (sessionId) {
		await client.rpc('increment_mg_session_counters', {
			p_session_id: sessionId,
			p_page_views_delta: 1,
			p_games_opened_delta: cleanGameId ? 1 : 0
		});
	}
}

async function handleVisitEnd(client: SupabaseClient, payload: MetricsPayload): Promise<void> {
	const { visitId, durationSeconds } = payload;
	if (!visitId) return;

	const cleanDuration =
		typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
			? Math.max(0, Math.round(durationSeconds))
			: null;

	const { error } = await client
		.from('mg_events')
		.update({
			duration_seconds: cleanDuration,
			ended_at: new Date().toISOString()
		})
		.eq('visit_id', visitId);

	if (error) {
		throw new Error(`visit-end failed: ${error.message}`);
	}
}

async function handleSessionEnd(client: SupabaseClient, payload: MetricsPayload): Promise<void> {
	const { sessionId, visitId, durationSeconds } = payload;

	if (visitId) {
		await handleVisitEnd(client, { visitId, durationSeconds });
	}

	if (!sessionId) return;

	const now = new Date().toISOString();
	const { error } = await client
		.from('mg_sessions')
		.update({
			last_seen_at: now,
			ended_at: now
		})
		.eq('id', sessionId);

	if (error) {
		throw new Error(`session-end failed: ${error.message}`);
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const client = getSupabaseClient();
		if (!client) {
			return json({ ok: false, skipped: true });
		}

		const payload = (await request.json().catch(() => ({}))) as MetricsPayload;
		const op = payload?.op;

		if (op === 'session-start') {
			await ensureSession(client, payload);
		} else if (op === 'page-view') {
			await handlePageView(client, payload);
		} else if (op === 'visit-end') {
			await handleVisitEnd(client, payload);
		} else if (op === 'session-end') {
			await handleSessionEnd(client, payload);
		} else {
			return json({ error: 'Invalid op.' }, { status: 400 });
		}

		return json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[api/metrics] Error:', message);
		return json({ ok: false });
	}
};
