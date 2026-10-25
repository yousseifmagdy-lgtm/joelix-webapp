"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type NoteType = string;
type NoteStatus = "Open" | "Verified" | "Ready";
type BoardLocation = { x: number; y: number };

type ContentNote = {
  id: number;
  type: NoteType;
  title: string;
  body: string;
  status: NoteStatus;
  done?: boolean;
  color?: string;
  imageUrl?: string | null;
  imageName?: string | null;
  imageKey?: string | null;
  sceneImages?: SceneImage[];
  scriptBlocks?: SceneScriptBlock[];
};

type ProductionStep = {
  id: number;
  label: string;
  detail: string;
  done: boolean;
};

type CaseThread = {
  id: number;
  start: BoardLocation;
  end: BoardLocation;
};

type SceneImage = {
  id: number;
  title: string;
  imageUrl: string | null;
  imageName: string | null;
  imageKey: string | null;
};

type SceneScriptBlock = {
  id: number;
  title: string;
  content: string;
};

type CasePage = {
  id: number;
  title: string;
  runtime: string;
  sceneImages: SceneImage[];
  scriptBlocks: SceneScriptBlock[];
  sceneScript?: string;
  notes: ContentNote[];
  locations: Record<number, BoardLocation>;
  steps: ProductionStep[];
  threads: CaseThread[];
  imageUrl?: string | null;
  imageName?: string | null;
  imageKey?: string | null;
};

type UndoSnapshot = {
  roomPages: Record<CreatorRoomId, CasePage[]>;
  activeRoomId: CreatorRoomId;
  activePageId: number;
  activeCaseSide: CaseSide;
  selectedId: number;
};

type CreatorRoomId = "gaming" | "vlog" | "rezq";
type CaseSide = "notes" | "scene";
type SaveStatus = "saved" | "saving" | "retrying" | "error";

export type YouTubeSavedState = {
  roomPages: Record<CreatorRoomId, CasePage[]>;
  activeRoomId: CreatorRoomId;
  activePageId: number;
};

type YouTubeContentProps = {
  savedState: YouTubeSavedState | null;
  storageReady: boolean;
  onStateChange: (state: YouTubeSavedState) => Promise<boolean>;
};

type CreatorRoom = {
  id: CreatorRoomId;
  badge: string;
  name: string;
  contentType: string;
  description: string;
  pageIdeas: readonly string[];
};

type NoteDragState = {
  id: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type ThreadDragState = {
  id: number;
  endpoint: "start" | "end";
  pointerId: number;
};

const creatorRooms: readonly CreatorRoom[] = [
  {
    id: "gaming",
    badge: "JG",
    name: "Joelix Gaming",
    contentType: "Gaming content",
    description: "Challenges, playthroughs, Joelix Jump updates, secrets, boss fights, and gaming highlights.",
    pageIdeas: [
      "Can I beat Joelix Jump on hard mode?",
      "Every mystery box ability ranked",
      "The no-damage boss fight challenge",
      "I built the ultimate Joelix gaming setup",
      "Ten hidden secrets inside Joelix Jump",
      "Road to level one hundred",
      "Twenty-four hours of gaming challenges",
      "The fastest coin combo I could make",
      "Best gaming upgrades on a budget",
      "Joelix Gaming monthly highlights",
    ],
  },
  {
    id: "vlog",
    badge: "YM",
    name: "Yousseif Magdy (Joelix)",
    contentType: "Mostly vlog content",
    description: "Real days, routines, gym sessions, food, travel, behind-the-scenes moments, and honest life updates.",
    pageIdeas: [
      "A full day in my life",
      "My morning reset routine",
      "Gym, work, and food vlog",
      "Behind the scenes of the Joelix app",
      "A productive day in Cairo",
      "What I eat in a real day",
      "My weekend adventure",
      "Building better habits one day at a time",
      "My honest monthly reset",
      "Life update: what comes next",
    ],
  },
  {
    id: "rezq",
    badge: "RZ",
    name: "Rezq",
    contentType: "How to make money content",
    description: "Practical skill-building, freelancing, client work, pricing, safe money habits, and income challenges.",
    pageIdeas: [
      "Five ways to earn your first one hundred dollars",
      "Turn one useful skill into income",
      "How to find your first client",
      "Build a simple freelance offer",
      "How to price your work with confidence",
      "My daily money-making routine",
      "Build a portfolio that gets replies",
      "The follow-up system that wins clients",
      "How to recognize and avoid money scams",
      "The thirty-day income challenge",
    ],
  },
];

const roomOffsets: Record<CreatorRoomId, number> = {
  gaming: 10000,
  vlog: 20000,
  rezq: 30000,
};

const gamingPageSymbols = ["X", "O", "PAD", "X", "O", "PAD", "X", "O", "PAD", "X"];
const rezqPageSymbols = ["$", "£", "BANK", "€", "$", "CASH", "£", "$", "BANK", "€"];

const notePositions = [
  { x: 5, y: 8, rotate: "-2.4deg" },
  { x: 57, y: 6, rotate: "1.8deg" },
  { x: 68, y: 39, rotate: "-1.2deg" },
  { x: 7, y: 43, rotate: "1.4deg" },
  { x: 48, y: 68, rotate: "2.1deg" },
  { x: 8, y: 72, rotate: "-1.7deg" },
  { x: 70, y: 72, rotate: "1deg" },
  { x: 36, y: 4, rotate: "-.8deg" },
];

function notePositionFor(index: number) {
  const fixedPosition = notePositions[index];
  if (fixedPosition) return fixedPosition;

  const extraIndex = index - notePositions.length;
  const rotations = ["-2.1deg", "1.4deg", "-.9deg", "2deg", "-1.3deg"];

  return {
    x: 4 + ((extraIndex * 31) % 66),
    y: 6 + ((extraIndex * 47) % 78),
    rotate: rotations[extraIndex % rotations.length],
  };
}

function nextAvailableNotePosition(index: number, locations: BoardLocation[]) {
  for (let offset = 0; offset < 200; offset += 1) {
    const candidate = notePositionFor(index + offset);
    const positionIsOpen = !locations.some((location) => (
      Math.abs(location.x - candidate.x) < 4 && Math.abs(location.y - candidate.y) < 4
    ));
    if (positionIsOpen) return candidate;
  }

  return notePositionFor(index + locations.length);
}

const noteColorPalette = ["#fff1a8", "#d8f7ff", "#ffd4d8", "#dff6bb", "#f8e9ff", "#ffd8a8", "#d8e4ff", "#ffffff"];

function defaultNoteColor(type: string) {
  const colors: Record<string, string> = {
    evidence: "#d8f7ff",
    scene: "#fff0c7",
    thumbnail: "#ffd4d8",
    cta: "#dff6bb",
    "to-do": "#f8e9ff",
  };
  return colors[type.trim().toLowerCase()] ?? "#fff1a8";
}

function noteTextColor(color: string) {
  const compact = color.trim().replace(/^#/, "");
  const hex = compact.length === 3
    ? compact.split("").map((character) => `${character}${character}`).join("")
    : compact;

  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#1d1b17";

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);

  return luminance > 0.179 ? "#1d1b17" : "#fffdf7";
}

function noteTypeClass(type: string) {
  return type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom";
}

async function storeYouTubeImage(file: File) {
  const formData = new FormData();
  formData.set("image", file);
  const response = await fetch("/api/youtube-images", { method: "POST", body: formData });
  const data = await response.json() as { key?: string; url?: string; error?: string };
  if (!response.ok || !data.key || !data.url) throw new Error(data.error || "The image could not be saved.");
  return { key: data.key, url: data.url };
}

const stepTemplate: Omit<ProductionStep, "done">[] = [
  { id: 1, label: "Case question locked", detail: "One promise, one viewer, one outcome" },
  { id: 2, label: "Evidence captured", detail: "Screen recordings, results, setbacks" },
  { id: 3, label: "Script assembled", detail: "Hook, tension, proof, payoff" },
  { id: 4, label: "Thumbnail tested", detail: "Readable at phone size" },
  { id: 5, label: "Upload package ready", detail: "Title, description, chapters" },
];

const threadTemplate: Omit<CaseThread, "id">[] = [
  { start: { x: 15, y: 14 }, end: { x: 43, y: 40 } },
  { start: { x: 73, y: 14 }, end: { x: 58, y: 40 } },
  { start: { x: 80, y: 45 }, end: { x: 66, y: 53 } },
  { start: { x: 19, y: 49 }, end: { x: 36, y: 52 } },
  { start: { x: 57, y: 79 }, end: { x: 61, y: 58 } },
  { start: { x: 18, y: 79 }, end: { x: 39, y: 58 } },
];

const roomStarterNotes: Record<CreatorRoomId, Omit<ContentNote, "id">[]> = {
  gaming: [
    { type: "Hook", title: "Hard mode starts now", body: "Open one second before the hardest jump, freeze the frame, and ask whether this run can survive.", status: "Ready" },
    { type: "Evidence", title: "Show the difficulty", body: "Capture the hardest obstacles, failed attempts, checkpoint, and final score so the challenge feels real.", status: "Verified" },
    { type: "Thumbnail", title: "Impossible jump?", body: "Use the biggest obstacle, one strong reaction, and a clear danger arrow. Keep the words short.", status: "Open" },
    { type: "Scene", title: "Ability reveal", body: "Open a mystery box, pause on the ability, then immediately demonstrate why it changes the run.", status: "Ready" },
    { type: "Scene", title: "Final boss payoff", body: "Build tension before the final attempt, then let the winning moment breathe before showing the score.", status: "Open" },
    { type: "CTA", title: "Choose the next challenge", body: "Ask viewers to choose the next hard-mode rule or ability challenge in the comments.", status: "Open" },
    { type: "To-do", title: "Capture checklist", body: "Record gameplay, clean microphone audio, reactions, score screen, and three thumbnail poses.", status: "Open", done: false },
  ],
  vlog: [
    { type: "Hook", title: "Start inside the day", body: "Open with the most interesting moment first, then rewind to show how the day reached it.", status: "Ready" },
    { type: "Evidence", title: "Keep it honest", body: "Capture the plan, the unexpected problem, and the result so the vlog has a real story.", status: "Verified" },
    { type: "Thumbnail", title: "One memorable moment", body: "Use a clear face, one location, and a visual detail that represents the whole day.", status: "Open" },
    { type: "Scene", title: "Morning movement", body: "Film a short sequence of waking up, preparing, leaving, and beginning the first mission.", status: "Ready" },
    { type: "Scene", title: "Quiet reflection", body: "End with what went well, what did not, and the one thing tomorrow should improve.", status: "Open" },
    { type: "CTA", title: "Bring viewers along", body: "Ask which part of the next day viewers want to see in more detail.", status: "Open" },
    { type: "To-do", title: "Vlog bag", body: "Charge batteries, clear storage, pack the microphone, and list the three must-film moments.", status: "Open", done: false },
  ],
  rezq: [
    { type: "Hook", title: "A realistic first goal", body: "Open with a clear result a beginner can understand, without promising fast or guaranteed income.", status: "Ready" },
    { type: "Evidence", title: "Show the process", body: "Demonstrate the skill, offer, outreach message, time required, cost, and a realistic example.", status: "Verified" },
    { type: "Thumbnail", title: "One skill. First client.", body: "Show the skill on one side and a real work result on the other. Avoid fake cash imagery.", status: "Open" },
    { type: "Scene", title: "Build the offer", body: "Record the exact steps for turning one useful skill into a simple client offer.", status: "Ready" },
    { type: "Evidence", title: "Risks and limits", body: "Explain common scams, costs, uncertainty, and what results depend on experience or location.", status: "Open" },
    { type: "CTA", title: "Choose the next skill", body: "Ask viewers which useful skill should become the next step-by-step income guide.", status: "Open" },
    { type: "To-do", title: "Verify before publishing", body: "Check every number, link trustworthy sources, remove guarantees, and add a scam warning.", status: "Open", done: false },
  ],
};

function createSceneScript(room: CreatorRoom, pageNumber: number, title: string) {
  const sceneNumber = String(pageNumber).padStart(2, "0");
  if (room.id === "gaming") {
    return `GAME SCENE ${sceneNumber} - ${title.toUpperCase()}

MISSION / PLAYER GOAL
What must the player complete, survive, discover, or prove?

OPENING HOOK
Start with the strongest gameplay moment, danger, reaction, or mystery.

GAMEPLAY SCENE
Describe the level, map, character, enemy, challenge, and camera framing.

PLAYER ACTION + REACTION
Write what happens in the game and the honest reaction on camera.

COMMENTARY / DIALOGUE
Write exactly what Joelix says during this scene.

HUD / SCORE / ABILITY
Show the important coins, health, timer, combo, power-up, or objective.

EDITING + SOUND
List zooms, cuts, impact sounds, music changes, captions, and replay moments.

WIN / FAIL / TRANSITION
End with the result and the next gaming challenge.`;
  }
  const roomDirection = room.id === "vlog"
    ? "Capture the place, action, natural sound, and honest reaction."
    : "Show the real process, evidence, limits, and practical result.";

  return `SCENE ${sceneNumber} — ${title.toUpperCase()}

HOOK / OPENING
Start with the strongest moment or question.

SCENE IMAGE
Describe the main frame, location, subject, and camera angle.

ACTION
${roomDirection}

VOICEOVER / DIALOGUE
Write exactly what will be said in this scene.

B-ROLL / CUTAWAYS
List the extra shots, screen recordings, close-ups, or proof.

ENDING / TRANSITION
Explain how this scene moves into the next part of the video.`;
}

function createNoteStudio(room: CreatorRoom, pageNumber: number, note: ContentNote) {
  const studioId = note.id * 10;
  return {
    sceneImages: [{
      id: studioId + 1,
      title: `${note.title} shot`,
      imageUrl: null,
      imageName: null,
      imageKey: null,
    }],
    scriptBlocks: [{
      id: studioId + 2,
      title: `${note.title} script`,
      content: createSceneScript(room, pageNumber, note.title),
    }],
  };
}

function createCasePage(room: CreatorRoom, pageNumber: number): CasePage {
  const baseId = roomOffsets[room.id] + pageNumber * 100;
  const noteSeeds: ContentNote[] = pageNumber === 1
    ? roomStarterNotes[room.id].map((note, index) => ({ ...note, id: baseId + index + 1 }))
    : [
      { id: baseId + 1, type: "Hook", title: "Opening question", body: `What surprising question will make viewers care about case ${String(pageNumber).padStart(2, "0")}?`, status: "Open" },
      { id: baseId + 2, type: "Thumbnail", title: "Thumbnail angle", body: "Choose one face, one object, one contrast, and no more than four words.", status: "Open" },
      { id: baseId + 3, type: "Scene", title: "Proof scene", body: `Plan the visual moment that proves this ${room.contentType.toLowerCase()} video's promise instead of only explaining it.`, status: "Open" },
      { id: baseId + 4, type: "To-do", title: "Next actions", body: "Research the idea, collect three examples, write the hook, and schedule the recording.", status: "Open", done: false },
    ];
  const notes = noteSeeds.map((note) => ({ ...note, ...createNoteStudio(room, pageNumber, note) }));

  return {
    id: pageNumber,
    title: room.pageIdeas[pageNumber - 1],
    runtime: pageNumber === 1 ? "08:20" : "--:--",
    sceneImages: [{ id: baseId + 80, title: "Hero scene shot", imageUrl: null, imageName: null, imageKey: null }],
    scriptBlocks: [{ id: baseId + 90, title: "Main scene script", content: createSceneScript(room, pageNumber, room.pageIdeas[pageNumber - 1]) }],
    notes,
    locations: Object.fromEntries(notes.map((note, index) => {
      const position = notePositionFor(index);
      return [note.id, { x: position.x, y: position.y }];
    })),
    steps: stepTemplate.map((step, index) => ({ ...step, done: pageNumber === 1 && index < 2 })),
    threads: threadTemplate.map((thread, index) => ({ id: baseId + 50 + index, start: { ...thread.start }, end: { ...thread.end } })),
  };
}

const initialRoomPages = Object.fromEntries(
  creatorRooms.map((room) => [
    room.id,
    Array.from({ length: 10 }, (_, index) => createCasePage(room, index + 1)),
  ]),
) as Record<CreatorRoomId, CasePage[]>;

function restoreRoomPages(savedPages: Record<CreatorRoomId, CasePage[]>) {
  return Object.fromEntries(
    creatorRooms.map((room) => [
      room.id,
      savedPages[room.id].map((page) => {
        const baseId = roomOffsets[room.id] + page.id * 100;
        const sceneImages = Array.isArray(page.sceneImages)
          ? page.sceneImages
          : [{
              id: baseId + 80,
              title: "Hero scene shot",
              imageUrl: page.imageUrl ?? null,
              imageName: page.imageName ?? null,
              imageKey: page.imageKey ?? null,
            }];
        const scriptBlocks = Array.isArray(page.scriptBlocks)
          ? page.scriptBlocks
          : [{
              id: baseId + 90,
              title: "Main scene script",
              content: typeof page.sceneScript === "string"
                ? page.sceneScript
                : createSceneScript(room, page.id, page.title),
            }];
        const notes = page.notes.map((note, noteIndex) => {
          const freshStudio = createNoteStudio(room, page.id, note);
          return {
            ...note,
            sceneImages: Array.isArray(note.sceneImages)
              ? note.sceneImages
              : noteIndex === 0
                ? sceneImages
                : freshStudio.sceneImages,
            scriptBlocks: Array.isArray(note.scriptBlocks)
              ? note.scriptBlocks
              : noteIndex === 0
                ? scriptBlocks
                : freshStudio.scriptBlocks,
          };
        });
        return { ...page, sceneImages, scriptBlocks, notes };
      }),
    ]),
  ) as Record<CreatorRoomId, CasePage[]>;
}

export function YouTubeContent({ savedState, storageReady, onStateChange }: YouTubeContentProps) {
  const [roomPages, setRoomPages] = useState<Record<CreatorRoomId, CasePage[]>>(initialRoomPages);
  const [activeRoomId, setActiveRoomId] = useState<CreatorRoomId>("gaming");
  const [activePageId, setActivePageId] = useState(1);
  const [activeCaseSide, setActiveCaseSide] = useState<CaseSide>("notes");
  const [selectedId, setSelectedId] = useState(initialRoomPages.gaming[0].notes[0].id);
  const [undoCount, setUndoCount] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<NoteType>("Hook");
  const [newColor, setNewColor] = useState("#fff1a8");
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepDetail, setNewStepDetail] = useState("");
  const [imageError, setImageError] = useState("");
  const [noteImageError, setNoteImageError] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [zoomedId, setZoomedId] = useState<number | null>(null);
  const [editingThreads, setEditingThreads] = useState(false);
  const [draggingThreadId, setDraggingThreadId] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState({ width: 800, height: 735 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const boardRef = useRef<HTMLDivElement>(null);
  const noteDragRef = useRef<NoteDragState | null>(null);
  const threadDragRef = useRef<ThreadDragState | null>(null);
  const storageInitializedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const saveSequenceRef = useRef(0);
  const undoStackRef = useRef<UndoSnapshot[]>([]);

  const activeRoom = creatorRooms.find((room) => room.id === activeRoomId) ?? creatorRooms[0];
  const pages = roomPages[activeRoomId];
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const selected = activePage.notes.find((note) => note.id === selectedId) ?? activePage.notes[0] ?? null;
  const zoomedNote = activePage.notes.find((note) => note.id === zoomedId) ?? null;
  const completedSteps = activePage.steps.filter((step) => step.done).length;
  const progress = activePage.steps.length ? Math.round((completedSteps / activePage.steps.length) * 100) : 0;
  const caseNumber = String(activePage.id).padStart(2, "0");
  const sceneImages = selected?.sceneImages ?? [];
  const scriptBlocks = selected?.scriptBlocks ?? [];
  const scriptWordCount = scriptBlocks.reduce((total, block) => {
    const content = block.content.trim();
    return total + (content ? content.split(/\s+/).length : 0);
  }, 0);

  useEffect(() => setNoteImageError(""), [selectedId]);

  useEffect(() => {
    if (!storageReady || storageInitializedRef.current) return;
    const hasEveryRoom = savedState && creatorRooms.every((room) => Array.isArray(savedState.roomPages?.[room.id]));
    if (savedState && hasEveryRoom) {
      const restoredRoom = creatorRooms.some((room) => room.id === savedState.activeRoomId) ? savedState.activeRoomId : "gaming";
      const restoredPages = savedState.roomPages[restoredRoom];
      const restoredPage = restoredPages.find((page) => page.id === savedState.activePageId) ?? restoredPages[0];
      setRoomPages(restoreRoomPages(savedState.roomPages));
      setActiveRoomId(restoredRoom);
      setActivePageId(restoredPage?.id ?? 1);
      setSelectedId(restoredPage?.notes[0]?.id ?? 0);
    }
    storageInitializedRef.current = true;
    skipNextSaveRef.current = true;
  }, [savedState, storageReady]);

  useEffect(() => {
    if (!storageInitializedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const sequence = saveSequenceRef.current + 1;
    saveSequenceRef.current = sequence;
    const state = { roomPages, activeRoomId, activePageId };
    let retryTimer = 0;
    let cancelled = false;
    setSaveStatus("saving");

    const save = async (attempt = 0) => {
      const saved = await onStateChange(state);
      if (cancelled || saveSequenceRef.current !== sequence) return;
      if (saved) {
        setSaveStatus("saved");
        return;
      }
      if (attempt < 2) {
        setSaveStatus("retrying");
        retryTimer = window.setTimeout(() => void save(attempt + 1), 1200 * (attempt + 1));
        return;
      }
      setSaveStatus("error");
    };

    const timer = window.setTimeout(() => void save(), 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [roomPages, activeRoomId, activePageId, onStateChange]);

  useEffect(() => {
    if (!zoomedId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomedId]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measureBoard = () => {
      const bounds = board.getBoundingClientRect();
      setBoardSize({ width: bounds.width, height: bounds.height });
    };
    measureBoard();
    const observer = new ResizeObserver(measureBoard);
    observer.observe(board);
    return () => observer.disconnect();
  }, [activeCaseSide, activePageId, activeRoomId]);

  const updateActivePage = (update: (page: CasePage) => CasePage) => {
    undoStackRef.current = [...undoStackRef.current.slice(-39), {
      roomPages,
      activeRoomId,
      activePageId,
      activeCaseSide,
      selectedId,
    }];
    setUndoCount(undoStackRef.current.length);
    setRoomPages((rooms) => ({
      ...rooms,
      [activeRoomId]: rooms[activeRoomId].map((page) => page.id === activePageId ? update(page) : page),
    }));
  };

  const undoLastAction = () => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    setRoomPages(snapshot.roomPages);
    setActiveRoomId(snapshot.activeRoomId);
    setActivePageId(snapshot.activePageId);
    setActiveCaseSide(snapshot.activeCaseSide);
    setSelectedId(snapshot.selectedId);
    setZoomedId(null);
    setDraggingId(null);
    setDraggingThreadId(null);
    setImageError("");
    setNoteImageError("");
    setUndoCount(undoStackRef.current.length);
  };

  const changeCreatorRoom = (roomId: CreatorRoomId) => {
    const firstPage = roomPages[roomId][0];
    noteDragRef.current = null;
    threadDragRef.current = null;
    setDraggingId(null);
    setDraggingThreadId(null);
    setZoomedId(null);
    setEditingThreads(false);
    setImageError("");
    setNewStepLabel("");
    setNewStepDetail("");
    setActiveCaseSide("notes");
    setActiveRoomId(roomId);
    setActivePageId(firstPage.id);
    setSelectedId(firstPage.notes[0]?.id ?? 0);
  };

  const changePage = (pageId: number, side: CaseSide = activeCaseSide) => {
    const nextPage = pages.find((page) => page.id === pageId);
    if (!nextPage) return;
    noteDragRef.current = null;
    threadDragRef.current = null;
    setDraggingId(null);
    setDraggingThreadId(null);
    setZoomedId(null);
    setEditingThreads(false);
    setImageError("");
    setNewStepLabel("");
    setNewStepDetail("");
    setActiveCaseSide(side);
    setActivePageId(pageId);
    setSelectedId(nextPage.notes[0]?.id ?? 0);
  };

  const openNoteStudio = (noteId: number) => {
    setSelectedId(noteId);
    setZoomedId(null);
    setImageError("");
    setActiveCaseSide("scene");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToNoteBoard = () => {
    setActiveCaseSide("notes");
    setImageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateSelected = (patch: Partial<ContentNote>) => {
    if (!selected) return;
    updateActivePage((page) => ({
      ...page,
      notes: page.notes.map((note) => note.id === selected.id ? { ...note, ...patch } : note),
    }));
  };

  const pinNote = (title: string, type: NoteType, body?: string, color?: string) => {
    const id = Date.now();
    const noteBase: ContentNote = {
      id,
      type,
      title,
      body: body ?? (type === "To-do"
        ? "Write the next clear action for this video and mark it complete when finished."
        : "Add the clue, fact, shot, or script line that makes this part of the case useful."),
      status: "Open",
      done: type === "To-do" ? false : undefined,
      color: color || defaultNoteColor(type),
      imageUrl: null,
      imageName: null,
      imageKey: null,
    };
    const note: ContentNote = { ...noteBase, ...createNoteStudio(activeRoom, activePage.id, noteBase) };
    const openSlot = nextAvailableNotePosition(activePage.notes.length, Object.values(activePage.locations));
    updateActivePage((page) => ({
      ...page,
      notes: [...page.notes, note],
      locations: { ...page.locations, [id]: { x: openSlot.x, y: openSlot.y } },
    }));
    setSelectedId(id);
  };

  const addNote = (event: FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    pinNote(newTitle.trim(), newType.trim() || "Evidence", undefined, newColor);
    setNewTitle("");
    setNewType("Hook");
    setNewColor("#fff1a8");
  };

  const quickAddNote = () => {
    pinNote(
      "New investigator note",
      "Evidence",
      "Write your idea, clue, shot, or research note here.",
    );
  };

  const removeNote = (id: number) => {
    const nextNotes = activePage.notes.filter((note) => note.id !== id);
    updateActivePage((page) => {
      const locations = { ...page.locations };
      delete locations[id];
      return { ...page, notes: nextNotes, locations };
    });
    if (zoomedId === id) setZoomedId(null);
    if (draggingId === id) {
      noteDragRef.current = null;
      setDraggingId(null);
    }
    if (selectedId === id) {
      setSelectedId(nextNotes[0]?.id ?? 0);
      setActiveCaseSide("notes");
    }
  };

  const beginNoteDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: number) => {
    if (event.button !== 0 || editingThreads) return;
    const location = activePage.locations[id];
    if (!location) return;
    noteDragRef.current = {
      id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: location.x,
      originY: location.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(id);
    setDraggingId(id);
  };

  const moveNote = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = noteDragRef.current;
    const board = boardRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !board) return;
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (Math.hypot(deltaX, deltaY) > 5) drag.moved = true;
    const bounds = board.getBoundingClientRect();
    const maxX = Math.max(0, (1 - event.currentTarget.offsetWidth / bounds.width) * 100);
    const maxY = Math.max(0, (1 - event.currentTarget.offsetHeight / bounds.height) * 100);
    const x = Math.min(maxX, Math.max(0, drag.originX + (deltaX / bounds.width) * 100));
    const y = Math.min(maxY, Math.max(0, drag.originY + (deltaY / bounds.height) * 100));
    updateActivePage((page) => ({ ...page, locations: { ...page.locations, [drag.id]: { x, y } } }));
    event.preventDefault();
  };

  const finishNoteDrag = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = noteDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    noteDragRef.current = null;
    setDraggingId(null);
    if (!cancelled && !drag.moved) setZoomedId(drag.id);
  };

  const beginThreadDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: number, endpoint: "start" | "end") => {
    if (event.button !== 0) return;
    threadDragRef.current = { id, endpoint, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingThreadId(id);
    event.stopPropagation();
  };

  const moveThreadEndpoint = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = threadDragRef.current;
    const board = boardRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !board) return;
    const bounds = board.getBoundingClientRect();
    const location = {
      x: Math.min(98, Math.max(2, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(98, Math.max(2, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
    updateActivePage((page) => ({
      ...page,
      threads: page.threads.map((thread) => thread.id === drag.id ? { ...thread, [drag.endpoint]: location } : thread),
    }));
    event.preventDefault();
    event.stopPropagation();
  };

  const finishThreadDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = threadDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    threadDragRef.current = null;
    setDraggingThreadId(null);
    event.stopPropagation();
  };

  const addThread = () => {
    setEditingThreads(true);
    updateActivePage((page) => ({
      ...page,
      threads: [...page.threads, {
        id: Date.now(),
        start: { x: 24 + (page.threads.length % 3) * 8, y: 24 },
        end: { x: 55 + (page.threads.length % 3) * 7, y: 61 },
      }],
    }));
  };

  const removeThread = () => {
    if (activePage.threads.length <= 1) return;
    updateActivePage((page) => ({ ...page, threads: page.threads.slice(0, -1) }));
  };

  const updateProductionStep = (id: number, patch: Partial<ProductionStep>) => {
    updateActivePage((page) => ({
      ...page,
      steps: page.steps.map((step) => step.id === id ? { ...step, ...patch } : step),
    }));
  };

  const addProductionStep = (event: FormEvent) => {
    event.preventDefault();
    if (!newStepLabel.trim()) return;
    const step: ProductionStep = {
      id: Date.now(),
      label: newStepLabel.trim(),
      detail: newStepDetail.trim() || "Add the details for this production mission.",
      done: false,
    };
    updateActivePage((page) => ({ ...page, steps: [...page.steps, step] }));
    setNewStepLabel("");
    setNewStepDetail("");
  };

  const removeProductionStep = (id: number) => {
    updateActivePage((page) => ({ ...page, steps: page.steps.filter((step) => step.id !== id) }));
  };

  const addSceneImage = () => {
    if (!selected) return;
    updateSelected({
      sceneImages: [...sceneImages, {
        id: Date.now(),
        title: `Scene shot ${sceneImages.length + 1}`,
        imageUrl: null,
        imageName: null,
        imageKey: null,
      }],
    });
  };

  const updateSceneImage = (id: number, patch: Partial<SceneImage>) => {
    updateSelected({ sceneImages: sceneImages.map((image) => image.id === id ? { ...image, ...patch } : image) });
  };

  const uploadSceneImage = async (id: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Choose an image file.");
      return;
    }
    try {
      const stored = await storeYouTubeImage(file);
      updateSceneImage(id, { imageUrl: stored.url, imageName: file.name, imageKey: stored.key });
      setImageError("");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "The image could not be saved. Try again.");
    }
  };

  const removeSceneImage = (id: number) => {
    updateSelected({ sceneImages: sceneImages.filter((image) => image.id !== id) });
    setImageError("");
  };

  const addScriptBlock = () => {
    if (!selected) return;
    const nextNumber = scriptBlocks.length + 1;
    updateSelected({
      scriptBlocks: [...scriptBlocks, {
        id: Date.now(),
        title: `Script widget ${nextNumber}`,
        content: `SCENE BEAT ${String(nextNumber).padStart(2, "0")}

ACTION
Describe what happens on camera.

VOICEOVER / DIALOGUE
Write exactly what will be said.

CUT / TRANSITION
Connect this beat to the next shot.`,
      }],
    });
  };

  const updateScriptBlock = (id: number, patch: Partial<SceneScriptBlock>) => {
    updateSelected({ scriptBlocks: scriptBlocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  };

  const removeScriptBlock = (id: number) => {
    updateSelected({ scriptBlocks: scriptBlocks.filter((block) => block.id !== id) });
  };

  const uploadSelectedNoteImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;
    if (!file.type.startsWith("image/")) {
      setNoteImageError("Choose an image file.");
      return;
    }
    const noteId = selected.id;
    try {
      const stored = await storeYouTubeImage(file);
      updateActivePage((page) => ({
        ...page,
        notes: page.notes.map((note) => note.id === noteId ? { ...note, imageUrl: stored.url, imageName: file.name, imageKey: stored.key } : note),
      }));
      setNoteImageError("");
    } catch (error) {
      setNoteImageError(error instanceof Error ? error.message : "The note image could not be saved. Try again.");
    }
  };

  const removeSelectedNoteImage = () => {
    updateSelected({ imageUrl: null, imageName: null, imageKey: null });
    setNoteImageError("");
  };

  const getThreadStyle = (thread: CaseThread) => {
    const deltaX = ((thread.end.x - thread.start.x) / 100) * boardSize.width;
    const deltaY = ((thread.end.y - thread.start.y) / 100) * boardSize.height;
    return {
      left: `${thread.start.x}%`,
      top: `${thread.start.y}%`,
      width: `${Math.hypot(deltaX, deltaY)}px`,
      transform: `rotate(${Math.atan2(deltaY, deltaX) * (180 / Math.PI)}deg)`,
    } as CSSProperties;
  };

  return (
    <div className={`screen youtube-screen room-${activeRoomId}`}>
      <datalist id="evidence-type-suggestions">
        <option value="Hook" /><option value="Evidence" /><option value="Scene" /><option value="Thumbnail" /><option value="CTA" /><option value="To-do" />
      </datalist>
      <header className="page-heading youtube-heading">
        <div>
          <span className="eyebrow">Creator intelligence unit · {activeRoom.name} · Case {caseNumber} · {activeCaseSide === "notes" ? "Note Board" : `Studio for ${selected?.title || "note"}`}</span>
          <h1>YouTube Content</h1>
          <p>Build every video like an investigation: collect clues, connect the story, and close the case with a publish-ready plan.</p>
        </div>
        <div className="youtube-heading-actions">
          <button type="button" className="youtube-undo-button" onClick={undoLastAction} disabled={!undoCount} aria-label="Undo the last change"><span aria-hidden="true">↶</span> Undo <b>{undoCount}</b></button>
          <span className={`case-live-badge save-${saveStatus}`} role="status" aria-live="polite">
            <i /> {saveStatus === "saving" ? "Saving..." : saveStatus === "retrying" ? "Retrying save..." : saveStatus === "error" ? "Save failed" : "All changes saved"}
          </span>
        </div>
      </header>

      <section className="creator-room-hub" aria-label="YouTube creator rooms">
        <div className="creator-room-heading">
          <div><span>Channel control</span><strong>Choose a creator room</strong></div>
          <b>3 separate workspaces</b>
        </div>
        <nav className="creator-room-tabs" aria-label="Choose a YouTube creator page">
          {creatorRooms.map((room) => (
            <button
              type="button"
              key={room.id}
              data-room={room.id}
              className={room.id === activeRoomId ? "active" : ""}
              onClick={() => changeCreatorRoom(room.id)}
              aria-pressed={room.id === activeRoomId}
            >
              <span className="creator-room-mark" aria-hidden="true">{room.badge}</span>
              <span className="creator-room-copy"><strong>{room.name}</strong><small>{room.contentType}</small></span>
              <em>{roomPages[room.id].length} pages</em>
            </button>
          ))}
        </nav>
        <div className="creator-room-brief" aria-live="polite">
          <span>{activeRoom.badge}</span>
          <div className="creator-room-description"><small>Active creator room</small><strong>{activeRoom.name}</strong><p>{activeRoom.description}</p></div>
          {activeRoomId === "gaming" && (
            <div className="creator-theme-emblems gaming-emblems" aria-hidden="true">
              <span className="arcade-x">X</span>
              <span className="arcade-o">O</span>
              <span className="game-controller"><i /><b /><em /></span>
            </div>
          )}
          {activeRoomId === "rezq" && (
            <div className="creator-theme-emblems rezq-emblems" aria-hidden="true">
              <span className="bank-gate"><i /></span>
              <span className="cash-note">$</span>
              <span className="money-signs">$ £ €</span>
            </div>
          )}
        </div>
      </section>

      <nav className="case-page-strip" aria-label="YouTube content pages">
        <div><span>{activeRoom.name} case book</span><strong>10 note boards · every note opens its own studio</strong></div>
        <div className="case-page-buttons">
          {pages.map((page) => (
            <section className={`case-page-pair ${page.id === activePageId ? "current" : ""}`} key={page.id} aria-label={`Case ${page.id}: ${page.title}`}>
              <div className="case-page-pair-heading">
                <span>Case</span><strong>{String(page.id).padStart(2, "0")}</strong>
                {activeRoomId === "gaming" && (
                  gamingPageSymbols[page.id - 1] === "PAD"
                    ? <i className="page-theme-icon mini-controller" aria-hidden="true"><b /></i>
                    : <i className="page-theme-icon gaming-page-icon" aria-hidden="true">{gamingPageSymbols[page.id - 1]}</i>
                )}
                {activeRoomId === "rezq" && <i className="page-theme-icon rezq-page-icon" aria-hidden="true">{rezqPageSymbols[page.id - 1]}</i>}
              </div>
              <div className="case-side-buttons single-case-side">
                <button
                  type="button"
                  className={page.id === activePageId ? "active" : ""}
                  onClick={() => changePage(page.id, "notes")}
                  aria-current={page.id === activePageId ? "page" : undefined}
                  aria-label={`Open case ${page.id} note board: ${page.title}`}
                >
                  <small>{page.notes.length} linked scenes</small>Note Board
                </button>
              </div>
            </section>
          ))}
        </div>
      </nav>

      <section className="youtube-command" aria-label="Video case summary">
        <label className="case-title-field">
          <span>Current investigation</span>
          <input value={activePage.title} onChange={(event) => updateActivePage((page) => ({ ...page, title: event.target.value }))} aria-label="Current video title" />
        </label>
        <div className="case-progress-block">
          <span><small>Case progress</small><strong>{progress}%</strong></span>
          <div className="case-progress-track" aria-label={`${progress}% complete`}><i style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="case-stat"><small>{activeCaseSide === "notes" ? "Clues pinned" : "Script words"}</small><strong>{activeCaseSide === "notes" ? String(activePage.notes.length).padStart(2, "0") : scriptWordCount.toLocaleString("en-US")}</strong></div>
        <div className="case-stat"><small>Target runtime</small><strong>{activePage.runtime}</strong></div>
      </section>

      <div className={`youtube-workspace ${activeCaseSide === "notes" ? "notes-workspace" : "scene-workspace"}`}>
        {activeCaseSide === "notes" && (
          <section className="case-board-shell">
          <div className="case-board-topline">
            <div><span className="board-led" /><strong>Investigation map {caseNumber}/10</strong></div>
            <div className="thread-controls">
              <button type="button" className="quick-note-button" onClick={quickAddNote} aria-label="Add a new note to the board">
                + Note
              </button>
              <button type="button" className={editingThreads ? "active" : ""} onClick={() => setEditingThreads((value) => !value)} aria-pressed={editingThreads}>
                {editingThreads ? "Lock threads" : "Edit red lines"}
              </button>
              <button type="button" onClick={addThread} aria-label="Add red line">+ Line</button>
              <button type="button" onClick={removeThread} disabled={activePage.threads.length <= 1} aria-label="Remove last red line">− Line</button>
            </div>
          </div>
          <div className={`evidence-board ${editingThreads ? "editing-threads" : ""}`} ref={boardRef} data-case={`${activeRoom.badge} / CASE ${caseNumber}`}>
            <div className="board-scan" aria-hidden="true" />
            {activeRoomId === "gaming" && (
              <div className="board-theme-watermarks gaming-board-watermarks" aria-hidden="true">
                <span className="board-game-x">X</span>
                <span className="board-game-o">O</span>
                <span className="board-controller-wrap"><span className="game-controller"><i /><b /><em /></span></span>
              </div>
            )}
            {activeRoomId === "rezq" && (
              <div className="board-theme-watermarks rezq-board-watermarks" aria-hidden="true">
                <span className="board-bank-wrap"><span className="bank-gate"><i /></span></span>
                <span className="board-cash-wrap"><span className="cash-note">$</span></span>
                <span className="board-money-signs">$ £ €</span>
              </div>
            )}

            {activePage.threads.map((thread, index) => (
              <div
                className={`case-string dynamic-string ${editingThreads ? "thread-editing" : ""} ${thread.id === draggingThreadId ? "dragging" : ""}`}
                style={{ ...getThreadStyle(thread), "--thread-delay": `${index * 45}ms` } as CSSProperties}
                key={thread.id}
                aria-hidden={!editingThreads}
              >
                {editingThreads && (
                  <>
                    <button
                      type="button"
                      className="thread-handle thread-start"
                      aria-label={`Move start of red line ${index + 1}`}
                      onPointerDown={(event) => beginThreadDrag(event, thread.id, "start")}
                      onPointerMove={moveThreadEndpoint}
                      onPointerUp={finishThreadDrag}
                      onPointerCancel={finishThreadDrag}
                    />
                    <button
                      type="button"
                      className="thread-handle thread-end"
                      aria-label={`Move end of red line ${index + 1}`}
                      onPointerDown={(event) => beginThreadDrag(event, thread.id, "end")}
                      onPointerMove={moveThreadEndpoint}
                      onPointerUp={finishThreadDrag}
                      onPointerCancel={finishThreadDrag}
                    />
                  </>
                )}
              </div>
            ))}

            <article className="case-master-file">
              <span>Master file · Page {caseNumber}</span>
              <strong>{activePage.title}</strong>
              <small>Question → Conflict → Proof → Payoff</small>
              <i aria-hidden="true">CONFIDENTIAL</i>
            </article>

            {activePage.notes.map((note, index) => {
              const position = notePositionFor(index);
              const location = activePage.locations[note.id] ?? position;
              const noteColor = note.color || defaultNoteColor(note.type);
              const style = {
                "--note-x": `${location.x}%`,
                "--note-y": `${location.y}%`,
                "--note-rotate": position.rotate,
                "--note-delay": `${index * 70}ms`,
                "--note-color": noteColor,
                "--note-ink": noteTextColor(noteColor),
              } as CSSProperties;
              return (
                <div
                  key={note.id}
                  style={style}
                  className={`evidence-note type-${noteTypeClass(note.type)} ${note.id === selected?.id ? "selected" : ""} ${note.id === draggingId ? "dragging" : ""} ${note.done ? "note-done" : ""}`}
                >
                  <button
                    type="button"
                    className="evidence-note-card"
                    onPointerDown={(event) => beginNoteDrag(event, note.id)}
                    onPointerMove={moveNote}
                    onPointerUp={finishNoteDrag}
                    onPointerCancel={(event) => finishNoteDrag(event, true)}
                    onClick={(event) => {
                      if (event.detail === 0) {
                        setSelectedId(note.id);
                        setZoomedId(note.id);
                      }
                    }}
                    aria-pressed={note.id === selected?.id}
                    aria-label={`${note.title}. Drag to move, or activate to zoom.`}
                  >
                    <i className="note-pin" aria-hidden="true" />
                    <span>{note.type} · {note.status}</span>
                    <strong>{note.title}</strong>
                    <small>{note.body}</small>
                    {note.imageUrl && <u className="note-photo-badge">IMG</u>}
                    {note.type === "To-do" && <em>{note.done ? "✓ Completed" : "□ To do"}</em>}
                    <b aria-hidden="true">#{String(index + 1).padStart(2, "0")}</b>
                  </button>
                  <button
                    type="button"
                    className="note-scene-link"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); openNoteStudio(note.id); }}
                    aria-label={`Open the scene and script studio linked to ${note.title}`}
                  >
                    <span aria-hidden="true">▶</span> {activeRoomId === "gaming" ? "Game Scene + Script" : "Scene + Script"}
                  </button>
                  <button type="button" className="note-delete" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); removeNote(note.id); }} aria-label={`Remove note ${note.title}`}>×</button>
                </div>
              );
            })}
          </div>
          <p className="board-footnote"><span>●</span> Unlimited notes · Use + Note to pin an idea · Drag notes normally · Turn on Edit red lines, then drag their glowing endpoints</p>
          </section>
        )}

        <aside className={`case-desk ${activeCaseSide === "scene" ? "scene-desk" : "notes-desk"}`}>
          {activeCaseSide === "scene" && (
            <>
              <section className="scene-note-bridge">
                <button type="button" onClick={returnToNoteBoard}><span aria-hidden="true">←</span> Return to Note Board</button>
                <div><small>{activeRoomId === "gaming" ? "Player mission studio" : "Linked note studio"}</small><strong>{selected?.title || "Untitled note"}</strong><span>{selected?.type || "Note"} · {activeRoomId === "gaming" ? "Gameplay scene and script linked to this note" : "Changes here belong only to this note"}</span></div>
                <b>{String(Math.max(0, activePage.notes.findIndex((note) => note.id === selected?.id)) + 1).padStart(2, "0")}/{String(activePage.notes.length).padStart(2, "0")}</b>
              </section>
              <section className="director-studio-header" id="director-overview">
                <div className="director-hero-media" aria-hidden="true" />
                <div className="studio-film-grain" aria-hidden="true" />
                <div className="studio-lights" aria-hidden="true"><i /><i /><i /></div>
                {activeRoomId === "gaming" && (
                  <>
                    <div className="gaming-studio-hud" aria-hidden="true"><span>PLAYER 1 · CAPTURE READY</span><b>GAME SCENE MODE</b><i /><i /><i /><i /></div>
                    <div className="gaming-studio-symbols" aria-hidden="true"><strong>X</strong><em>O</em><span className="game-controller"><i /><b /><em /></span></div>
                  </>
                )}
                <nav className="director-studio-nav" aria-label="Director studio sections">
                  <a className="director-studio-brand" href="#director-overview" aria-label="Joelix Film Studio — Director&apos;s Studio">
                    <span className="director-brand-slate" aria-hidden="true"><i /><i /></span>
                    <b>{activeRoomId === "gaming" ? "Joelix Game" : "Joelix Film"}</b><small>Studio</small>
                  </a>
                  <div>
                    <a className="active" href="#director-overview">Dashboard</a>
                    <a href="#director-shots">Scenes</a>
                    <a href="#director-scripts">Scripts</a>
                    <a href="#director-production">Production</a>
                  </div>
                  <span className="director-nav-status"><i /> {activeRoomId === "gaming" ? "Live capture" : "On set"}</span>
                </nav>
                <div className="director-hero-copy">
                  <span>{activeRoomId === "gaming" ? "Player one · mission studio" : "Welcome to your studio"} <i aria-hidden="true">◆</i></span>
                  <h2>{activeRoomId === "gaming" ? <>Build Your <em>Game Scene</em>.</> : <>Bring Your <em>Vision</em> to Life.</>}</h2>
                  <p>{activeRoomId === "gaming" ? "Design the gameplay, player reaction, HUD moments, abilities, sound effects, and commentary for this note." : "Plan, visualize, and direct every Joelix scene with a complete cinematic workspace built for storytellers."}</p>
                  <div className="director-hero-actions">
                    <button type="button" onClick={addSceneImage}>{activeRoomId === "gaming" ? "Create gameplay shot" : "Create new shot"} <b aria-hidden="true">→</b></button>
                    <a href="#director-scripts">{activeRoomId === "gaming" ? "Open game script" : "Open screenplay"}</a>
                  </div>
                </div>
                <div className="director-studio-meters">
                  <span><small>Shot images</small><b>{sceneImages.length}</b></span>
                  <span><small>Script widgets</small><b>{scriptBlocks.length}</b></span>
                  <span><small>Total words</small><b>{scriptWordCount.toLocaleString("en-US")}</b></span>
                  <em><i /> REC READY</em>
                </div>
                <small className="director-auto-save">Saved automatically with this linked note</small>
              </section>

              <section className="director-deck director-shot-deck" id="director-shots">
                <header className="director-deck-heading">
                  <div><span>Visual shot wall</span><h3>Scene Images</h3><p>Add reference frames, camera angles, locations, props, or storyboard shots.</p></div>
                  <button type="button" onClick={addSceneImage}><b>＋</b> Add image widget</button>
                </header>
                {imageError && <p className="case-image-error" role="alert">{imageError}</p>}
                <div className="director-shot-grid">
                  {sceneImages.map((sceneImage, index) => (
                    <article className="director-shot-card" key={sceneImage.id}>
                      <header><span>SHOT {String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => removeSceneImage(sceneImage.id)} aria-label={`Remove image widget ${sceneImage.title}`}>× Remove</button></header>
                        <label className="director-widget-title"><span>Shot name</span><input value={sceneImage.title} onChange={(event) => updateSceneImage(sceneImage.id, { title: event.target.value })} aria-label={`Name for shot ${index + 1}`} /></label>
                      {sceneImage.imageUrl ? (
                        <>
                          <figure className="director-shot-preview">
                            <Image src={sceneImage.imageUrl} alt={sceneImage.title || `Scene shot ${index + 1}`} fill unoptimized sizes="(max-width: 859px) 94vw, 44vw" />
                            <figcaption>{sceneImage.imageName || sceneImage.title}</figcaption>
                          </figure>
                          <label className="director-upload-button">Replace shot<input className="case-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadSceneImage(sceneImage.id, event)} /></label>
                        </>
                      ) : (
                        <label className="director-shot-dropzone">
                          <input className="case-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadSceneImage(sceneImage.id, event)} />
                          <b aria-hidden="true">＋</b><strong>Upload image for this shot</strong><small>JPG, PNG, WEBP or GIF · No Joelix size cap</small>
                        </label>
                      )}
                    </article>
                  ))}
                  {!sceneImages.length && <div className="director-empty-widget"><b>NO SHOTS ON SET</b><span>Press “Add image widget” to create the first camera shot.</span></div>}
                </div>
              </section>

              <section className="director-deck director-script-deck" id="director-scripts">
                <header className="director-deck-heading">
                  <div><span>Screenplay desk</span><h3>Script Widgets</h3><p>Separate your hook, dialogue, voice-over, scene beats, and transitions.</p></div>
                  <button type="button" onClick={addScriptBlock}><b>＋</b> Add script widget</button>
                </header>
                <div className="director-script-grid">
                  {scriptBlocks.map((block, index) => {
                    const blockWords = block.content.trim() ? block.content.trim().split(/\s+/).length : 0;
                    return (
                      <article className="director-script-card" key={block.id}>
                        <header><span>SCRIPT {String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => removeScriptBlock(block.id)} aria-label={`Remove script widget ${block.title}`}>× Remove</button></header>
                        <label className="director-widget-title"><span>Script title</span><input value={block.title} onChange={(event) => updateScriptBlock(block.id, { title: event.target.value })} aria-label={`Title for script widget ${index + 1}`} /></label>
                        <label className="director-script-editor"><span>Action · Dialogue · Voice-over · Direction</span><textarea value={block.content} onChange={(event) => updateScriptBlock(block.id, { content: event.target.value })} placeholder="Write this part of the scene..." rows={18} aria-label={`Script widget ${index + 1} content`} /></label>
                        <footer><span><b>{blockWords.toLocaleString("en-US")}</b> words</span><small>Auto-saved</small></footer>
                      </article>
                    );
                  })}
                  {!scriptBlocks.length && <div className="director-empty-widget"><b>THE SCRIPT DESK IS EMPTY</b><span>Press “Add script widget” to write the first scene beat.</span></div>}
                </div>
              </section>
            </>
          )}

          {activeCaseSide === "notes" && (selected ? (
            <section className="case-panel selected-clue-panel">
              <div className="case-panel-heading"><div><span>Selected clue</span><strong>#{String(activePage.notes.findIndex((note) => note.id === selected.id) + 1).padStart(2, "0")}</strong></div><i>{selected.type}</i></div>
              <label><span>Note title</span><input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>
              <div className="clue-select-row">
                <label><span>Evidence type · write anything</span><input list="evidence-type-suggestions" value={selected.type} onChange={(event) => updateSelected({ type: event.target.value, done: event.target.value === "To-do" ? Boolean(selected.done) : undefined })} placeholder="Example: Interview clue" /></label>
                <label><span>Status</span><select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as NoteStatus })}><option>Open</option><option>Verified</option><option>Ready</option></select></label>
              </div>
              <div className="note-color-editor">
                <label><span>Note color</span><span className="note-color-input"><input type="color" value={selected.color || defaultNoteColor(selected.type)} onChange={(event) => updateSelected({ color: event.target.value })} /><b>{selected.color || defaultNoteColor(selected.type)}</b></span></label>
                <div className="note-color-swatches" aria-label="Quick note colors">
                  {noteColorPalette.map((color) => <button type="button" key={color} style={{ "--swatch-color": color } as CSSProperties} className={(selected.color || defaultNoteColor(selected.type)) === color ? "active" : ""} onClick={() => updateSelected({ color })} aria-label={`Use color ${color}`} />)}
                </div>
              </div>
              <label><span>Investigator note</span><textarea value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} rows={6} /></label>
              <div className="selected-note-image-editor">
                <span className="selected-note-image-label">Image inside this note</span>
                {selected.imageUrl ? (
                  <>
                    <figure className="selected-note-image-preview">
                      <Image src={selected.imageUrl} alt={`Attached to ${selected.title}`} fill unoptimized sizes="340px" />
                      <figcaption>{selected.imageName || "Note image"}</figcaption>
                    </figure>
                    <div className="selected-note-image-actions">
                      <label>Replace image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadSelectedNoteImage} /></label>
                      <button type="button" onClick={removeSelectedNoteImage}>Remove</button>
                    </div>
                  </>
                ) : (
                  <label className="selected-note-image-dropzone">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadSelectedNoteImage} />
                    <b>+</b><strong>Add image to this note</strong><small>It will appear when you open the note · No Joelix size cap</small>
                  </label>
                )}
                {noteImageError && <p className="case-image-error" role="alert">{noteImageError}</p>}
              </div>
              {selected.type === "To-do" && (
                <label className={`todo-complete-toggle ${selected.done ? "done" : ""}`}>
                  <input type="checkbox" checked={Boolean(selected.done)} onChange={(event) => updateSelected({ done: event.target.checked, status: event.target.checked ? "Ready" : "Open" })} />
                  <b>{selected.done ? "✓" : ""}</b><span>{selected.done ? "Task completed" : "Mark this task complete"}</span>
                </label>
              )}
              <button type="button" className="archive-clue" onClick={() => removeNote(selected.id)}>Remove selected note</button>
            </section>
          ) : (
            <section className="case-panel selected-clue-panel empty-clue-panel">
              <div className="case-panel-heading"><div><span>Selected clue</span><strong>Board clear</strong></div><i>0</i></div>
              <p>No notes remain on this page. Use + Note above or “Pin a clue or to-do” below to add a new one.</p>
            </section>
          ))}

          {activeCaseSide === "scene" && (
            <section className="case-panel production-checklist scene-production-panel" id="director-production">
            <div className="case-panel-heading"><div><span>Mission route</span><strong>Production</strong></div><i>{completedSteps}/{activePage.steps.length}</i></div>
            <p className="production-help">Edit every step, change its details, or build your own production route.</p>
            <div className="editable-production-list">
              {activePage.steps.map((step, index) => (
                <div key={step.id} className={`production-step-row ${step.done ? "done" : ""}`}>
                  <button type="button" className="production-check" onClick={() => updateProductionStep(step.id, { done: !step.done })} aria-label={`${step.done ? "Mark incomplete" : "Mark complete"}: ${step.label}`}>{step.done ? "✓" : index + 1}</button>
                  <div className="production-step-copy">
                    <input value={step.label} onChange={(event) => updateProductionStep(step.id, { label: event.target.value })} aria-label={`Production step ${index + 1} title`} />
                    <input value={step.detail} onChange={(event) => updateProductionStep(step.id, { detail: event.target.value })} aria-label={`Production step ${index + 1} details`} />
                  </div>
                  <button type="button" className="production-remove" onClick={() => removeProductionStep(step.id)} aria-label={`Remove production step ${step.label}`}>×</button>
                </div>
              ))}
              {!activePage.steps.length && <p className="production-empty">No production steps yet. Add your first mission below.</p>}
            </div>
            <form className="production-add-form" onSubmit={addProductionStep}>
              <label><span>New production step</span><input value={newStepLabel} onChange={(event) => setNewStepLabel(event.target.value)} placeholder="Example: Record voice-over" /></label>
              <label><span>Step details</span><input value={newStepDetail} onChange={(event) => setNewStepDetail(event.target.value)} placeholder="What must be finished?" /></label>
              <button type="submit" disabled={!newStepLabel.trim()}>+ Add production step</button>
            </form>
            </section>
          )}

          {activeCaseSide === "notes" && (
            <section className="case-panel add-clue-panel">
            <div className="case-panel-heading"><div><span>New evidence</span><strong>Pin a clue or to-do</strong></div><i>＋</i></div>
            <form onSubmit={addNote}>
              <label><span>Clue title</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="What do you need to do?" /></label>
              <label><span>Evidence type · write anything</span><input list="evidence-type-suggestions" value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="Example: Sponsor idea" /></label>
              <label><span>Note color</span><span className="note-color-input"><input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)} /><b>{newColor}</b></span></label>
              <button type="submit" disabled={!newTitle.trim()}>Pin to map</button>
            </form>
            </section>
          )}
        </aside>
      </div>

      {zoomedNote && (
        <div className="note-zoom-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setZoomedId(null); }}>
          <article
            className={`note-zoom-card type-${noteTypeClass(zoomedNote.type)} ${zoomedNote.done ? "note-done" : ""} ${zoomedNote.imageUrl ? "has-note-image" : ""}`}
            style={{
              "--note-color": zoomedNote.color || defaultNoteColor(zoomedNote.type),
              "--note-ink": noteTextColor(zoomedNote.color || defaultNoteColor(zoomedNote.type)),
            } as CSSProperties}
            role="dialog"
            aria-modal="true"
            aria-labelledby="zoomed-note-title"
          >
            <i className="note-pin" aria-hidden="true" />
            <button type="button" className="note-zoom-close" onClick={() => setZoomedId(null)} aria-label="Close enlarged note">×</button>
            <span>{zoomedNote.type} · {zoomedNote.status}</span>
            <h2 id="zoomed-note-title">{zoomedNote.title}</h2>
            {zoomedNote.imageUrl && (
              <figure className="note-zoom-image">
                <Image src={zoomedNote.imageUrl} alt={`Attached to ${zoomedNote.title}`} fill unoptimized sizes="(max-width: 640px) 84vw, 520px" />
                <figcaption>{zoomedNote.imageName || "Note image"}</figcaption>
              </figure>
            )}
            <p>{zoomedNote.body}</p>
            {zoomedNote.type === "To-do" && <strong className="zoom-todo-state">{zoomedNote.done ? "✓ Task completed" : "□ Task waiting"}</strong>}
            <footer><b>CASE {caseNumber}</b><small>Press Escape or click outside to close</small></footer>
          </article>
        </div>
      )}
    </div>
  );
}
