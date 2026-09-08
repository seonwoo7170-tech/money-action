import type { Locale } from './types';

export const MISSION_UI: Record<Locale, {
  why: string; aiIdeas: string; yourAnswer: string; answerPlaceholder: string;
  askAi: string; askingAi: string; aiReply: string; refined: string;
  deliverable: string; successSignal: string; continueAction: string; answerRequired: string;
}> = {
  ko: { why:'왜 이걸 하나요?', aiIdeas:'AI 추천', yourAnswer:'내 답변', answerPlaceholder:'AI 추천을 고르거나 직접 적어주세요.', askAi:'이 답으로 AI에게 물어보기', askingAi:'AI가 다음 행동을 만들고 있어요…', aiReply:'MoneyAction의 답변', refined:'정리된 실행 결과', deliverable:'오늘 남길 결과물', successSignal:'성공 신호', continueAction:'확정하고 다음 행동으로', answerRequired:'답변을 하나 선택하거나 입력해주세요.' },
  en: { why:'Why this matters', aiIdeas:'AI suggestions', yourAnswer:'Your answer', answerPlaceholder:'Pick an AI suggestion or write your own.', askAi:'Ask AI with this answer', askingAi:'AI is shaping your next action…', aiReply:'MoneyAction response', refined:'Refined output', deliverable:'Deliverable today', successSignal:'Success signal', continueAction:'Confirm and continue', answerRequired:'Choose or enter an answer first.' },
  ja: { why:'なぜ必要？', aiIdeas:'AIの提案', yourAnswer:'あなたの回答', answerPlaceholder:'AIの提案を選ぶか、自分で入力してください。', askAi:'この回答をAIに送る', askingAi:'AIが次の行動を作成中…', aiReply:'MoneyActionの回答', refined:'整理された実行結果', deliverable:'今日残す成果物', successSignal:'成功のサイン', continueAction:'確定して次へ', answerRequired:'回答を選ぶか入力してください。' },
  es: { why:'Por qué importa', aiIdeas:'Sugerencias de IA', yourAnswer:'Tu respuesta', answerPlaceholder:'Elige una sugerencia o escribe la tuya.', askAi:'Preguntar a la IA con esta respuesta', askingAi:'La IA está preparando tu siguiente acción…', aiReply:'Respuesta de MoneyAction', refined:'Resultado refinado', deliverable:'Resultado de hoy', successSignal:'Señal de éxito', continueAction:'Confirmar y continuar', answerRequired:'Elige o escribe una respuesta primero.' },
  'pt-BR': { why:'Por que isso importa', aiIdeas:'Sugestões da IA', yourAnswer:'Sua resposta', answerPlaceholder:'Escolha uma sugestão ou escreva a sua.', askAi:'Perguntar à IA com esta resposta', askingAi:'A IA está preparando sua próxima ação…', aiReply:'Resposta do MoneyAction', refined:'Resultado refinado', deliverable:'Entrega de hoje', successSignal:'Sinal de sucesso', continueAction:'Confirmar e continuar', answerRequired:'Escolha ou digite uma resposta primeiro.' },
};
