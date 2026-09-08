import type { ActionPlan, Mission, MissionFeedback, UserProfile } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'https://money-action-api.smileseon.workers.dev';

function getDeviceId() {
  const key = 'money-action-device-id';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export async function submitMissionAnswer(profile: UserProfile, plan: ActionPlan, mission: Mission, answer: string): Promise<MissionFeedback> {
  const priorResults = plan.missions
    .filter((item) => item.done || item.aiFeedback)
    .map((item) => ({ day: item.day, title: item.title, answer: item.userAnswer || '', result: item.refinedOutput || item.aiFeedback || '' }));

  const nextMission = plan.missions.find((item) => item.day > mission.day && !item.done);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${API_URL}/api/mission/answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-id': getDeviceId() },
      body: JSON.stringify({
        profile,
        selectedPath: plan.selectedPath,
        mission,
        answer,
        priorResults,
        nextMission: nextMission || null,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as MissionFeedback & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'AI feedback failed.');
    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}
