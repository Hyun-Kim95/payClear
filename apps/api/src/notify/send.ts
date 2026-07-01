import webpush from 'web-push'
import nodemailer from 'nodemailer'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { query } from '../db/pool.js'

function todayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function tomorrowKST(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function configureWebPush(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:demo@payclear.local',
    pub,
    priv,
  )
  return true
}

// FCM 자격증명 초기화(1회). 자격증명 미설정 시 false → FCM skip(VAPID 미설정 시 skip과 동일 패턴).
// 지원: FIREBASE_SERVICE_ACCOUNT(JSON 문자열) 또는 FIREBASE_PROJECT_ID+FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY.
let fcmReady: boolean | null = null

function configureFcm(): boolean {
  if (fcmReady !== null) return fcmReady
  try {
    if (getApps().length > 0) {
      fcmReady = true
      return true
    }
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT
    if (saJson) {
      initializeApp({ credential: cert(JSON.parse(saJson)) })
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // env에 \n이 리터럴로 들어오는 경우를 처리한다.
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      })
    } else {
      fcmReady = false
      return false
    }
    fcmReady = true
    return true
  } catch (e) {
    console.warn('FCM configure failed', e)
    fcmReady = false
    return false
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.NOTIFY_EMAIL_DEV === 'log') {
    console.log(`[NOTIFY_EMAIL] to=${to} subject=${subject}\n${text}`)
    return
  }
  const host = process.env.SMTP_HOST
  if (!host) {
    console.log(`[NOTIFY_EMAIL_SKIP] no SMTP to=${to} subject=${subject}`)
    return
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@payclear.local',
    to,
    subject,
    text,
  })
}

export interface ReminderRunResult {
  sent_push: number
  sent_fcm: number
  sent_email: number
  skipped: number
}

export async function runDueReminders(dryRun = false): Promise<ReminderRunResult> {
  const today = todayKST()
  const tomorrow = tomorrowKST()
  const hasPush = configureWebPush()
  const hasFcm = configureFcm()

  const usersRes = await query<{
    user_id: string
    email: string | null
    email_verified_at: unknown
    push_enabled: boolean
    email_enabled: boolean
    remind_d1: boolean
    remind_d0: boolean
  }>(`
    SELECT u.id AS user_id, u.email, u.email_verified_at,
           COALESCE(ns.push_enabled, TRUE) AS push_enabled,
           COALESCE(ns.email_enabled, TRUE) AS email_enabled,
           COALESCE(ns.remind_d1, TRUE) AS remind_d1,
           COALESCE(ns.remind_d0, TRUE) AS remind_d0
    FROM users u
    LEFT JOIN notification_settings ns ON ns.user_id = u.id
  `)

  let sentPush = 0
  let sentFcm = 0
  let sentEmail = 0
  let skipped = 0

  // 한 사용자에게 모든 채널(Push/FCM/Email)로 발송한다.
  const deliver = async (u: (typeof usersRes.rows)[number], title: string, body: string) => {
    if (u.push_enabled && hasPush) {
      const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
        [u.user_id],
      )
      for (const sub of subs.rows) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body }),
          )
          sentPush++
        } catch (e) {
          console.warn('Push failed', sub.endpoint, e)
        }
      }
    }

    if (u.push_enabled && hasFcm) {
      const fcm = await query<{ token: string }>(
        'SELECT token FROM fcm_tokens WHERE user_id = $1',
        [u.user_id],
      )
      for (const t of fcm.rows) {
        try {
          await getMessaging().send({ token: t.token, notification: { title, body } })
          sentFcm++
        } catch (e) {
          const code = (e as { code?: string })?.code
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            await query('DELETE FROM fcm_tokens WHERE token = $1', [t.token])
          }
          console.warn('FCM failed', t.token, code ?? e)
        }
      }
    }

    if (u.email_enabled && u.email && u.email_verified_at) {
      await sendEmail(u.email, title, body)
      sentEmail++
    }
  }

  for (const u of usersRes.rows) {
    // 1) 비분할 채무: debts.due_on 기준
    const debtsRes = await query<{
      id: string
      due_on: string
      contact_name: string
      direction: string
      principal: number
    }>(`
      SELECT d.id, d.due_on::text AS due_on, c.display_name AS contact_name, d.direction, d.principal
      FROM debts d
      JOIN contacts c ON c.id = d.contact_id
      WHERE d.user_id = $1 AND d.status = 'active' AND d.is_split = FALSE AND d.due_on IS NOT NULL
    `, [u.user_id])

    for (const debt of debtsRes.rows) {
      const dueOn = debt.due_on.slice(0, 10)
      const isD1 = u.remind_d1 && dueOn === tomorrow
      const isD0 = u.remind_d0 && dueOn === today
      if (!isD1 && !isD0) {
        skipped++
        continue
      }

      const ledgerRes = await query<{ type: string; amount: number; deleted_at: unknown }>(
        `SELECT type, amount, deleted_at FROM ledger_entries WHERE debt_id = $1`,
        [debt.id],
      )
      let balance = Number(debt.principal)
      for (const e of ledgerRes.rows) {
        if (e.deleted_at) continue
        if (e.type === 'payment') balance -= Number(e.amount)
        else balance += Number(e.amount)
      }
      if (balance <= 0) {
        skipped++
        continue
      }

      const label = isD0 ? '오늘' : '내일'
      const dir = debt.direction === 'lent' ? '받을' : '갚을'
      const title = `payClear — ${label} 상환 예정`
      const body = `${debt.contact_name} · ${dir} ${balance.toLocaleString('ko-KR')}원 (${dueOn})`

      if (dryRun) {
        console.log(`[DRY_RUN] user=${u.user_id} ${title}: ${body}`)
        continue
      }
      await deliver(u, title, body)
    }

    // 2) 분할 채무: installments.due_on 기준(미납 회차, 참여자 잔액 > 0)
    const instRes = await query<{
      due_on: string
      amount: number
      seq: number
      participant_label: string
      share_amount: number
      paid: number
      contact_name: string
      direction: string
    }>(`
      SELECT i.due_on::text AS due_on, i.amount, i.seq,
             p.label AS participant_label, p.share_amount,
             c.display_name AS contact_name, d.direction,
             COALESCE(SUM(CASE WHEN le.type = 'payment' AND le.deleted_at IS NULL THEN le.amount END), 0) AS paid
      FROM installments i
      JOIN debts d ON d.id = i.debt_id
      JOIN contacts c ON c.id = d.contact_id
      JOIN debt_participants p ON p.id = i.participant_id
      LEFT JOIN ledger_entries le ON le.participant_id = p.id
      WHERE d.user_id = $1 AND d.status = 'active' AND d.is_split = TRUE
      GROUP BY i.id, i.due_on, i.amount, i.seq, p.label, p.share_amount, c.display_name, d.direction
    `, [u.user_id])

    for (const inst of instRes.rows) {
      const dueOn = inst.due_on.slice(0, 10)
      const isD1 = u.remind_d1 && dueOn === tomorrow
      const isD0 = u.remind_d0 && dueOn === today
      if (!isD1 && !isD0) {
        skipped++
        continue
      }
      const remaining = Number(inst.share_amount) - Number(inst.paid)
      if (remaining <= 0) {
        skipped++
        continue
      }

      const label = isD0 ? '오늘' : '내일'
      const dir = inst.direction === 'lent' ? '받을' : '갚을'
      const title = `payClear — ${label} 할부 상환 예정`
      const body = `${inst.contact_name} · ${inst.participant_label} ${inst.seq}회차 ${dir} ${Number(inst.amount).toLocaleString('ko-KR')}원 (${dueOn})`

      if (dryRun) {
        console.log(`[DRY_RUN] user=${u.user_id} ${title}: ${body}`)
        continue
      }
      await deliver(u, title, body)
    }
  }

  return { sent_push: sentPush, sent_fcm: sentFcm, sent_email: sentEmail, skipped }
}
