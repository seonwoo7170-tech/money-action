import { COPY } from '../locales';
import { formatMoney, getMarket } from '../markets';
import type { ActionPlan, Locale, MissionCategory, UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

function getDeviceId() {
  const key = 'money-action-device-id';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export async function createPlan(profile: UserProfile): Promise<ActionPlan> {
  if (API_URL) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`${API_URL}/api/plan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': getDeviceId() },
        body: JSON.stringify(profile), signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as ActionPlan & { error?: string };
      if (!response.ok) throw new Error(payload.error || COPY[profile.locale].planError);
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new Error(COPY[profile.locale].planError);
      throw error;
    } finally { window.clearTimeout(timer); }
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  return buildDemoPlan(profile);
}

type DemoText = {
  headline: (goal:string)=>string; coach:(minutes:number)=>string;
  paths: { id:string; name:string; summary:string; price:string; reason:string; days:number; fit:number }[];
  missions: [MissionCategory,string,string,number][];
  milestones: [number,string,string][];
};

function demoText(locale: Locale, mainSkill: string, marketHint: string): DemoText {
  const sets: Record<Locale, DemoText> = {
    ko: { headline:g=>`${g} 목표를 위한 첫 수익 로드맵`, coach:m=>`이번 주에는 하루 평균 ${m}분만 확보해요. 첫 목표는 큰 수익이 아니라 실제 고객 반응 하나입니다.`, paths:[
      {id:'content-affiliate',name:'문제 해결 콘텐츠',summary:`${mainSkill} 경험을 짧은 해결 콘텐츠로 만들고 현지 수익화 채널과 연결해요.`,days:21,price:'콘텐츠 무료 · 제휴/광고 수익',reason:`${marketHint} 같은 현지 채널을 활용하면서 초기 비용을 낮출 수 있어요.`,fit:91},
      {id:'micro-service',name:'AI 활용 미니 서비스',summary:'소상공인이나 1인 사업자에게 작고 명확한 결과물을 빠르게 제공해요.',days:14,price:'작은 단위 서비스부터',reason:'첫 고객만 확보하면 현금 흐름을 빠르게 검증할 수 있어요.',fit:84},
      {id:'digital-product',name:'실전 디지털 상품',summary:'직접 쓰는 체크리스트·템플릿·가이드를 디지털 상품으로 판매해요.',days:30,price:'저가 상품부터 검증',reason:'한 번 만든 결과물을 반복 판매할 수 있어요.',fit:78}],
      missions:[['prepare','해결할 문제 한 문장으로 쓰기','누구의 어떤 불편을 해결할지 한 문장으로 적어보세요.',15],['prepare','현지 경쟁 서비스 5개 찾아보기','가격과 고객 반응을 비교해 보세요.',25],['build','첫 제안의 이름 정하기','고객이 결과를 바로 이해할 수 있는 이름을 만드세요.',20],['build','샘플 하나 완성하기','완벽함보다 보여줄 수 있는 결과 하나가 우선이에요.',45],['customer','잠재고객 10명 목록 만들기','지인·커뮤니티·SNS에서 후보를 찾아 적어보세요.',25],['customer','첫 연락 메시지 보내기','판매보다 의견을 묻는 짧은 메시지를 3명에게 보내세요.',20],['revenue','첫 주 결과 점검하기','반응이 있었던 행동과 없었던 행동을 구분하세요.',15]],
      milestones:[[7,'첫 제안 완성','샘플 1개 · 고객 후보 10명'],[30,'첫 수익 검증','첫 유료 반응 만들기'],[90,'반복 구조 완성','검증된 행동을 주간 루틴으로 만들기']] },
    en: { headline:g=>`Your first roadmap toward ${g}`, coach:m=>`Protect about ${m} minutes a day this week. The first goal is not big income — it is one real market response.`, paths:[
      {id:'content-affiliate',name:'Problem-solving content',summary:`Turn your ${mainSkill} experience into useful content and connect it to local monetization channels.`,days:21,price:'Free content · affiliate/ad revenue',reason:`It can start lean while testing channels such as ${marketHint}.`,fit:91},
      {id:'micro-service',name:'AI-assisted micro service',summary:'Offer a small, specific outcome to creators or small businesses and deliver it quickly.',days:14,price:'Start with a small fixed offer',reason:'A first customer can validate cash flow faster than building a large product.',fit:84},
      {id:'digital-product',name:'Practical digital product',summary:'Package a checklist, template or guide you actually use and sell it digitally.',days:30,price:'Validate with a low-ticket offer',reason:'One useful asset can be sold repeatedly after the first build.',fit:78}],
      missions:[['prepare','Write the problem in one sentence','Define exactly whose problem you want to solve and what outcome they need.',15],['prepare','Find 5 local competitors','Compare pricing, offers and customer reactions.',25],['build','Name your first offer','Use a name that makes the outcome obvious.',20],['build','Finish one sample','A visible sample matters more than polishing everything.',45],['customer','List 10 potential customers','Find candidates in your network, communities or social platforms.',25],['customer','Send 3 first messages','Ask for feedback before pushing a sale.',20],['revenue','Review week-one signals','Separate actions that got a response from those that did not.',15]],
      milestones:[[7,'First offer ready','1 sample · 10 customer prospects'],[30,'First revenue validation','Create the first paid signal'],[90,'Repeatable system','Turn validated actions into a weekly routine']] },
    ja: { headline:g=>`${g}を目指す最初の収益ロードマップ`, coach:m=>`今週は1日平均${m}分だけ確保しましょう。最初の目標は大きな収益ではなく、実際の市場反応を1つ得ることです。`, paths:[
      {id:'content-affiliate',name:'問題解決コンテンツ',summary:`${mainSkill}の経験を役立つコンテンツにし、現地の収益化チャネルにつなげます。`,days:21,price:'無料コンテンツ・広告/紹介収益',reason:`${marketHint}などの現地チャネルを小さく試せます。`,fit:91},
      {id:'micro-service',name:'AI活用ミニサービス',summary:'小規模事業者や個人向けに、明確で小さな成果物を素早く提供します。',days:14,price:'小さな定額サービスから',reason:'最初の顧客を獲得できれば、早く需要を検証できます。',fit:84},
      {id:'digital-product',name:'実用デジタル商品',summary:'自分で使っているチェックリストやテンプレート、ガイドを商品化します。',days:30,price:'低価格商品から検証',reason:'一度作った資産を繰り返し販売できます。',fit:78}],
      missions:[['prepare','解決する問題を一文で書く','誰のどんな悩みを解決するのか一文にしましょう。',15],['prepare','現地の競合を5つ調べる','価格・提案・反応を比較します。',25],['build','最初の提案名を決める','成果が一目で分かる名前にします。',20],['build','サンプルを1つ完成する','完璧より見せられる成果物を優先します。',45],['customer','見込み客を10人挙げる','知人・コミュニティ・SNSから候補を探します。',25],['customer','最初の連絡を3件送る','売り込む前に短く意見を聞きます。',20],['revenue','1週目の反応を振り返る','反応のあった行動となかった行動を分けます。',15]], milestones:[[7,'最初の提案完成','サンプル1つ・候補10人'],[30,'初収益の検証','有料反応を1つ作る'],[90,'繰り返せる仕組み','検証済み行動を週間ルーティン化']] },
    es: { headline:g=>`Tu primera ruta hacia ${g}`, coach:m=>`Reserva unos ${m} minutos al día esta semana. La primera meta no es ganar mucho, sino conseguir una respuesta real del mercado.`, paths:[
      {id:'content-affiliate',name:'Contenido que resuelve problemas',summary:`Convierte tu experiencia en ${mainSkill} en contenido útil y conéctalo con canales de monetización locales.`,days:21,price:'Contenido gratis · afiliados/anuncios',reason:`Puedes empezar con bajo costo y probar canales como ${marketHint}.`,fit:91},
      {id:'micro-service',name:'Microservicio asistido por IA',summary:'Ofrece un resultado pequeño y específico a negocios o creadores y entrégalo rápido.',days:14,price:'Empieza con una oferta pequeña',reason:'El primer cliente permite validar flujo de caja con rapidez.',fit:84},
      {id:'digital-product',name:'Producto digital práctico',summary:'Convierte una plantilla, lista o guía útil en un producto digital.',days:30,price:'Valida con una oferta económica',reason:'Un activo útil puede venderse muchas veces.',fit:78}],
      missions:[['prepare','Define el problema en una frase','Escribe a quién ayudas, con qué problema y qué resultado busca.',15],['prepare','Busca 5 competidores locales','Compara precios, ofertas y reacción de clientes.',25],['build','Pon nombre a tu primera oferta','Haz que el resultado sea obvio desde el nombre.',20],['build','Termina una muestra','Una muestra visible vale más que perfeccionarlo todo.',45],['customer','Lista 10 clientes potenciales','Busca candidatos en contactos, comunidades o redes.',25],['customer','Envía 3 primeros mensajes','Pide opinión antes de intentar vender.',20],['revenue','Revisa las señales de la primera semana','Separa las acciones que generaron respuesta de las que no.',15]], milestones:[[7,'Primera oferta lista','1 muestra · 10 prospectos'],[30,'Validar primer ingreso','Conseguir una primera señal de pago'],[90,'Sistema repetible','Convertir las acciones validadas en rutina semanal']] },
    'pt-BR': { headline:g=>`Sua primeira rota rumo a ${g}`, coach:m=>`Reserve cerca de ${m} minutos por dia nesta semana. A primeira meta não é uma renda alta, mas uma resposta real do mercado.`, paths:[
      {id:'content-affiliate',name:'Conteúdo que resolve problemas',summary:`Transforme sua experiência em ${mainSkill} em conteúdo útil e conecte a canais locais de monetização.`,days:21,price:'Conteúdo grátis · afiliados/anúncios',reason:`Você pode começar com baixo custo e testar canais como ${marketHint}.`,fit:91},
      {id:'micro-service',name:'Microserviço com apoio de IA',summary:'Ofereça um resultado pequeno e específico para negócios ou criadores e entregue rápido.',days:14,price:'Comece com uma oferta pequena',reason:'O primeiro cliente valida o fluxo de caixa mais rapidamente.',fit:84},
      {id:'digital-product',name:'Produto digital prático',summary:'Transforme uma planilha, checklist, modelo ou guia útil em produto digital.',days:30,price:'Valide com uma oferta de entrada',reason:'Um bom ativo pode ser vendido repetidamente.',fit:78}],
      missions:[['prepare','Defina o problema em uma frase','Escreva para quem você ajuda, qual problema resolve e qual resultado entrega.',15],['prepare','Encontre 5 concorrentes locais','Compare preços, ofertas e reações de clientes.',25],['build','Dê nome à primeira oferta','Faça o resultado ficar óbvio no nome.',20],['build','Finalize uma amostra','Uma amostra visível vale mais do que aperfeiçoar tudo.',45],['customer','Liste 10 clientes potenciais','Procure candidatos em contatos, comunidades ou redes sociais.',25],['customer','Envie 3 primeiras mensagens','Peça opinião antes de tentar vender.',20],['revenue','Revise os sinais da primeira semana','Separe ações que geraram resposta das que não geraram.',15]], milestones:[[7,'Primeira oferta pronta','1 amostra · 10 prospects'],[30,'Validar primeira renda','Gerar a primeira sinalização de pagamento'],[90,'Sistema repetível','Transformar ações validadas em rotina semanal']] },
  };
  return sets[locale];
}

function toIncomePath(path: DemoText['paths'][number]) {
  return { id:path.id, name:path.name, summary:path.summary, fitScore:path.fit, firstRevenueDays:path.days, priceIdea:path.price, reason:path.reason };
}

function buildDemoPlan(profile: UserProfile): ActionPlan {
  const copy = COPY[profile.locale];
  const market = getMarket(profile.market);
  const mainSkill = copy.skillLabels[profile.skills[0]] || profile.skills[0] || 'research';
  const marketHint = market.modelSeeds.slice(0, 2).join(' / ');
  const text = demoText(profile.locale, mainSkill, marketHint);
  const goal = formatMoney(profile.targetIncome, profile.locale, profile.currency);
  const minutes = Math.max(20, Math.round(profile.weeklyHours * 60 / 5));
  return {
    headline: text.headline(goal), coachMessage: text.coach(minutes),
    selectedPath: toIncomePath(text.paths[0]), alternatives: text.paths.slice(1).map(toIncomePath),
    missions: text.missions.map(([category, title, description, taskMinutes], index) => ({ id:`mission-${index+1}`, day:index+1, title, description, minutes:taskMinutes, category, done:false })),
    milestones: text.milestones.map(([day,title,target])=>({day,title,target})), generatedAt:new Date().toISOString(),
  };
}
