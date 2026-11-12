export type QuestStatus = 'not_started' | 'active' | 'completed';

export interface QuestRecord {
  id: string;
  title: string;
  description: string;
  giverNpcId: string;
  status: QuestStatus;
  progress: number;
  target: number;
}

export interface QuestState {
  quests: Record<string, QuestRecord>;
  visitedRooms: string[];
  hasNotebookItem: boolean;
  hasLibraryBook: boolean;
  basketballHighScore: number;
  doorsOpenedCount: number;
}

export function createInitialQuestState(): QuestState {
  return {
    quests: {
      'quest-find-room': {
        id: 'quest-find-room',
        title: 'Découverte de l\'Aile Sciences',
        description: 'Trouvez le Laboratoire de Chimie à l\'est du couloir principal.',
        giverNpcId: 'npc-receptionist',
        status: 'not_started',
        progress: 0,
        target: 1,
      },
      'quest-lost-notebook': {
        id: 'quest-lost-notebook',
        title: 'Le Carnet de Léo',
        description: 'Retrouvez le carnet bleu de biologie dans le Labo de Biologie et rapportez-le à Léo.',
        giverNpcId: 'npc-nervous-student',
        status: 'not_started',
        progress: 0,
        target: 1,
      },
      'quest-basketball': {
        id: 'quest-basketball',
        title: 'Défi des Aigles',
        description: 'Marquez 3 paniers au gymnase sous l\'œil du Coach Miller.',
        giverNpcId: 'npc-coach',
        status: 'not_started',
        progress: 0,
        target: 3,
      },
      'quest-library-book': {
        id: 'quest-library-book',
        title: 'Archives de Maplewood',
        description: 'Empruntez les Chroniques de Maplewood auprès de Mme Brooks à la bibliothèque.',
        giverNpcId: 'npc-librarian',
        status: 'not_started',
        progress: 0,
        target: 1,
      },
    },
    visitedRooms: ['courtyard'],
    hasNotebookItem: false,
    hasLibraryBook: false,
    basketballHighScore: 0,
    doorsOpenedCount: 0,
  };
}

export function startQuest(state: QuestState, questId: string): QuestState {
  const existing = state.quests[questId];
  if (!existing || existing.status !== 'not_started') {
    return state;
  }
  return {
    ...state,
    quests: {
      ...state.quests,
      [questId]: { ...existing, status: 'active' },
    },
  };
}

export function recordRoomVisit(state: QuestState, roomId: string): QuestState {
  let next = state;
  if (!state.visitedRooms.includes(roomId)) {
    next = { ...next, visitedRooms: [...state.visitedRooms, roomId] };
  }

  if (roomId === 'lab-chemistry') {
    const q = next.quests['quest-find-room'];
    if (q && q.status !== 'completed') {
      next = {
        ...next,
        quests: {
          ...next.quests,
          'quest-find-room': {
            ...q,
            status: 'completed',
            progress: 1,
          },
        },
      };
    }
  }
  return next;
}

export function pickupLostNotebook(state: QuestState): QuestState {
  if (state.hasNotebookItem) return state;
  const q = state.quests['quest-lost-notebook'];
  return {
    ...state,
    hasNotebookItem: true,
    quests: {
      ...state.quests,
      'quest-lost-notebook': {
        ...q,
        status: q.status === 'not_started' ? 'active' : q.status,
        description: 'Vous avez trouvé le carnet ! Rapportez-le à Léo près des casiers.',
      },
    },
  };
}

export function turnInLostNotebook(state: QuestState): QuestState {
  if (!state.hasNotebookItem) return state;
  const q = state.quests['quest-lost-notebook'];
  return {
    ...state,
    quests: {
      ...state.quests,
      'quest-lost-notebook': {
        ...q,
        status: 'completed',
        progress: 1,
      },
    },
  };
}

export function receiveLibraryBook(state: QuestState): QuestState {
  const q = state.quests['quest-library-book'];
  return {
    ...state,
    hasLibraryBook: true,
    quests: {
      ...state.quests,
      'quest-library-book': {
        ...q,
        status: 'completed',
        progress: 1,
      },
    },
  };
}

export function recordBasketballScore(state: QuestState, score: number): QuestState {
  const q = state.quests['quest-basketball'];
  const best = Math.max(state.basketballHighScore, score);
  const completed = best >= q.target;
  return {
    ...state,
    basketballHighScore: best,
    quests: {
      ...state.quests,
      'quest-basketball': {
        ...q,
        progress: Math.min(q.target, best),
        status: completed ? 'completed' : q.status === 'not_started' ? 'active' : q.status,
      },
    },
  };
}

export function getPrincipalSummaryMessage(state: QuestState): string {
  const completedCount = Object.values(state.quests).filter(
    (q) => q.status === 'completed'
  ).length;
  const totalQuests = Object.keys(state.quests).length;
  const roomsCount = state.visitedRooms.length;

  if (completedCount === totalQuests) {
    return `Félicitations ! Vous avez exploré ${roomsCount} zones du campus et accompli toutes les missions (${completedCount}/${totalQuests}). Vous êtes un véritable ambassadeur des Aigles de Maplewood !`;
  }
  return `Beau parcours ! Vous avez déjà visité ${roomsCount} zones et complété ${completedCount} mission(s) sur ${totalQuests}. Explorez la bibliothèque, les labos et le gymnase pour tout découvrir.`;
}
