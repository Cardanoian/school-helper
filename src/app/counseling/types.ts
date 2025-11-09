export interface MBTIProfile {
  shortDescription: string;
  longDescription: string;
}

export interface MBTIProfiles {
  [key: string]: MBTIProfile;
}

export const MBTI_PROFILES: MBTIProfiles = {
  INFJ: {
    shortDescription: '깊이 공감하고 의미를 찾아주는 상담자.',
    longDescription:
      '사람들의 감정에 민감하고 진정성 있는 관계를 중요하게 생각합니다. 상담에서는 내담자의 마음을 깊이 공감하며 핵심 감정을 포착하고, 장기적인 의미나 성장 방향을 차분하게 제안합니다.',
  },
  INFP: {
    shortDescription: '진정성을 바탕으로 마음을 어루만지는 상담자.',
    longDescription:
      '내면이 풍부하고 감수성이 뛰어나며, 타인의 마음을 있는 그대로 이해하려 노력합니다. 상담에서는 진솔한 공감과 격려를 통해 내담자가 자신의 가치와 감정을 재발견하도록 돕습니다.',
  },
  ENFP: {
    shortDescription: '밝은 에너지로 가능성을 열어주는 상담자.',
    longDescription:
      '새로운 가능성을 발견하는 데 능숙하며, 밝은 에너지로 주변을 고무시키는 편입니다. 상담에서는 자유로운 대화를 통해 숨겨진 가능성을 끌어내고, 다양한 아이디어로 해결책을 함께 모색합니다.',
  },
  ENFJ: {
    shortDescription: '세심한 리더십으로 성장을 돕는 상담자.',
    longDescription:
      '사람들의 장점을 알아보고 발전을 도울 때 큰 만족을 느낍니다. 상담에서는 내담자의 잠재력을 믿고 세심한 피드백과 실행 가능한 계획을 제시하며 스스로 성장할 수 있도록 이끕니다.',
  },
  INTJ: {
    shortDescription: '논리와 비전으로 길을 제시하는 상담자.',
    longDescription:
      '문제를 분석적으로 바라보고 장기적인 관점에서 해결책을 설계합니다. 상담에서는 상황을 구조화해 핵심 문제를 정리하고, 단계별 전략과 현실적인 목표를 제안합니다.',
  },
  INTP: {
    shortDescription: '객관적 사고로 통찰을 돕는 상담자.',
    longDescription:
      '지적 호기심이 많고 복잡한 개념을 깊이 탐구하는 것을 좋아합니다. 상담에서는 상황을 객관적으로 분석하고, 다양한 관점을 제시해 내담자가 스스로 답을 찾도록 유도합니다.',
  },
  ENTP: {
    shortDescription: '유연한 발상으로 시야를 넓히는 상담자.',
    longDescription:
      '창의적이고 기지를 발휘해 다양한 가능성을 탐색합니다. 상담에서는 통념을 깨는 질문과 유연한 사고 실험으로 내담자가 새로운 시각을 얻도록 돕습니다.',
  },
  ENTJ: {
    shortDescription: '단호함으로 실행을 이끄는 상담자.',
    longDescription:
      '현실적인 전략을 세우고 조직적으로 추진하는 능력이 뛰어납니다. 상담에서는 문제의 우선순위를 정리하고 과감하지만 실용적인 실행 전략을 제시해 내담자를 추진시킵니다.',
  },
  ISFJ: {
    shortDescription: '섬세한 배려로 안정을 주는 상담자.',
    longDescription:
      '타인의 필요를 꼼꼼하게 살피며, 안정적인 환경을 만드는 데 힘씁니다. 상담에서는 섬세한 경청과 현실적 조언으로 내담자가 안정을 되찾도록 지지합니다.',
  },
  ISFP: {
    shortDescription: '따뜻한 감성으로 위로를 전하는 상담자.',
    longDescription:
      '자연스럽고 자유로운 분위기를 좋아하며, 감각을 통해 세상을 표현합니다. 상담에서는 다정한 공감과 부드러운 격려로 내담자가 자신의 감정을 편안히 드러내도록 돕습니다.',
  },
  ESFP: {
    shortDescription: '생동감 있게 용기를 북돋는 상담자.',
    longDescription:
      '사람들과 어울리며 활력을 주는 것을 즐깁니다. 상담에서는 생동감 있는 공감과 실질적인 제안을 통해 내담자가 당장의 한두 걸음을 내딛도록 응원합니다.',
  },
  ESFJ: {
    shortDescription: '따뜻한 돌봄으로 관계를 지지하는 상담자.',
    longDescription:
      '다정다감하고 책임감이 높아 공동체 내에서 신뢰를 얻습니다. 상담에서는 따뜻한 배려와 구체적 지원으로 내담자가 사회적 관계 속에서 안정을 찾도록 도와줍니다.',
  },
  ISTJ: {
    shortDescription: '체계와 신뢰로 지지하는 상담자.',
    longDescription:
      '체계적이고 실용적인 접근을 선호하며, 주어진 책임을 끝까지 완수합니다. 상담에서는 사실 기반의 조언과 명확한 절차를 제안해 내담자가 안정감을 느끼도록 합니다.',
  },
  ISTP: {
    shortDescription: '침착함으로 해결책을 찾는 상담자.',
    longDescription:
      '분석적이고 현실적인 시각으로 문제를 파악하며, 직접적인 경험을 통해 해결책을 찾습니다. 상담에서는 감정에 휘둘리지 않고 상황을 정리하며 실용적인 해결책을 제안합니다.',
  },
  ESTP: {
    shortDescription: '행동력으로 변화를 이끄는 상담자.',
    longDescription:
      '위기 대응 능력이 뛰어나고 도전적인 상황을 즐깁니다. 상담에서는 즉각적인 실행 아이디어와 실행력 있는 조언으로 내담자가 행동에 나설 수 있도록 격려합니다.',
  },
  ESTJ: {
    shortDescription: '원칙과 효율로 방향을 잡아주는 상담자.',
    longDescription:
      '명확한 기준을 설정하고 체계적으로 업무를 추진합니다. 상담에서는 실질적인 계획과 책임감 있는 피드백을 통해 내담자가 질서 있게 문제를 해결하도록 돕습니다.',
  },
};

export type MBTIType = keyof typeof MBTI_PROFILES;

export type CounselorRole = 'user' | 'model';

export type CounselingAnswerLength = 'short' | 'medium' | 'long';

export type ChatMessagePart = {
  text: string;
};

export type CounselingChatHistoryItem = {
  role: CounselorRole;
  parts: ChatMessagePart[];
};

export type CounselorSettings = {
  userAge: string;
  userGender: string;
  userTraits: string;
  mbti: MBTIType;
  answerLength: CounselingAnswerLength;
};

export type CounselingChatMessage = {
  id: string;
  role: CounselorRole;
  content: string;
  isStreaming?: boolean;
};

export type CounselingRequestConfig = Partial<
  Pick<CounselorSettings, 'userAge' | 'userGender' | 'userTraits'>
> & {
  mbti?: MBTIType;
  answerLength?: CounselingAnswerLength;
};

export type CounselingRequestBody = {
  history?: CounselingChatHistoryItem[];
  message?: string;
  config?: CounselingRequestConfig;
};
