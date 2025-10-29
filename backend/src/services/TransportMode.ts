import { pool } from '../config/database'

let currentMode: 'http' | 'socket' = 'http'

export const getTransportMode = () => currentMode

export const setTransportMode = async (mode: 'http' | 'socket') => {
  currentMode = mode
  await pool.query(
    `INSERT INTO system_settings(key, value, updated_at) VALUES ('robot_transport', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [mode]
  )
}

export const initTransportMode = async () => {
  try {
    const r = await pool.query(`SELECT value FROM system_settings WHERE key = 'robot_transport'`)
    const v = r.rows?.[0]?.value
    if (v === 'http' || v === 'socket') currentMode = v
  } catch {}
}


