export interface ScenarioChatPerson {
  name: string;
  description: string;
}

export interface ScenarioChatChoice {
  id: string;
  text: string;
}

export interface ScenarioChatRound {
  id: string;
  scenario_message: {
    text: string;
    description: string;
  };
  choices: ScenarioChatChoice[];
}

export interface ScenarioChatData {
  version: 1;
  display_name?: string;
  context_description: string;
  participant: ScenarioChatPerson;
  learner: ScenarioChatPerson;
  rounds: ScenarioChatRound[];
}

function parseMaybeJson(raw: unknown): any {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function textValue(raw: unknown, fallback = ''): string {
  return typeof raw === 'string' ? raw : fallback;
}

function contextDescription(parsed: any): string {
  if (typeof parsed?.context_description === 'string') return parsed.context_description;
  if (typeof parsed?.status_line === 'string') return parsed.status_line;
  if (!Array.isArray(parsed?.rounds)) return 'Tình huống bắt đầu';

  const legacyRoundContext = parsed.rounds
    .map((round: any) => textValue(round?.status_line).trim())
    .find((value: string) => value.length > 0);

  return legacyRoundContext || 'Tình huống bắt đầu';
}

function defaultChoices(): ScenarioChatChoice[] {
  return [
    { id: 'choice_1', text: 'Phản hồi phù hợp' },
    { id: 'choice_2', text: 'Phản hồi chưa phù hợp 1' },
    { id: 'choice_3', text: 'Phản hồi chưa phù hợp 2' },
  ];
}

function normalizeChoices(rawChoices: any): ScenarioChatChoice[] {
  const defaults = defaultChoices();
  const choices = Array.isArray(rawChoices) ? rawChoices.slice(0, 3) : [];
  while (choices.length < 3) choices.push(defaults[choices.length]);
  return choices.map((choice: any, index: number) => ({
    id: textValue(choice?.id, defaults[index]?.id || `choice_${index + 1}`) || `choice_${index + 1}`,
    text: textValue(choice?.text, defaults[index]?.text || `Câu trả lời ${index + 1}`),
  }));
}

export function normalizeScenarioChatData(raw: unknown): ScenarioChatData {
  const parsed = parseMaybeJson(raw);
  const rounds = Array.isArray(parsed?.rounds)
    ? parsed.rounds.map((round: any, index: number): ScenarioChatRound => ({
      id: textValue(round?.id, `round_${index + 1}`) || `round_${index + 1}`,
      scenario_message: {
        text: textValue(round?.scenario_message?.text),
        description: textValue(round?.scenario_message?.description),
      },
      choices: normalizeChoices(round?.choices),
    }))
    : [];

  return {
    version: 1,
    display_name: textValue(parsed?.display_name),
    context_description: contextDescription(parsed),
    participant: {
      name: textValue(parsed?.participant?.name, 'Nhân vật tình huống') || 'Nhân vật tình huống',
      description: textValue(parsed?.participant?.description),
    },
    learner: {
      name: textValue(parsed?.learner?.name, 'Bạn') || 'Bạn',
      description: textValue(parsed?.learner?.description),
    },
    rounds: rounds.length > 0
      ? rounds
      : [{
        id: 'round_1',
        scenario_message: { text: '', description: '' },
        choices: defaultChoices(),
      }],
  };
}

export function buildScenarioChatFingerprint(data: ScenarioChatData): string {
  const normalized = normalizeScenarioChatData(data);
  return JSON.stringify({
    context_description: normalized.context_description,
    participant: normalized.participant,
    learner: normalized.learner,
    rounds: normalized.rounds.map(round => ({
      id: round.id,
      scenario_message: round.scenario_message,
      choices: round.choices.map(choice => ({ id: choice.id, text: choice.text })),
    })),
  });
}