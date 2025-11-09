'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  MBTI_PROFILES,
  MBTIType,
  type CounselingChatMessage,
  type CounselorSettings,
  type CounselingChatHistoryItem,
  type CounselingAnswerLength,
} from '@/app/counseling/types';

const SETTINGS_STORAGE_KEY = 'counseling-settings';

const DEFAULT_SETTINGS: CounselorSettings = {
  userAge: '',
  userGender: '',
  userTraits: '',
  mbti: 'INFJ',
  answerLength: 'medium',
};

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function CounselingPage() {
  const [messages, setMessages] = useState<CounselingChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<CounselorSettings>(DEFAULT_SETTINGS);
  const [editingSettings, setEditingSettings] =
    useState<CounselorSettings>(DEFAULT_SETTINGS);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<CounselorSettings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        setEditingSettings(merged);
      } catch (error) {
        console.warn('Failed to parse stored settings', error);
        setSettings(DEFAULT_SETTINGS);
        setEditingSettings(DEFAULT_SETTINGS);
        setShowSettingsModal(true);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      setEditingSettings(DEFAULT_SETTINGS);
      setShowSettingsModal(true);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';

    const { lineHeight } = window.getComputedStyle(textarea);
    const parsedLineHeight = Number.parseFloat(lineHeight || '0') || 0;
    const maxHeight =
      parsedLineHeight > 0 ? parsedLineHeight * 2 : textarea.scrollHeight;

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputValue]);

  const historyPayload = useMemo<CounselingChatHistoryItem[]>(
    () =>
      messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      })),
    [messages]
  );

  const applySettings = (nextSettings: CounselorSettings) => {
    setSettings(nextSettings);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(nextSettings)
      );
    }
  };

  const handleOpenSettings = () => {
    setEditingSettings(settings);
    setShowSettingsModal(true);
  };

  const handleApplySettings = () => {
    applySettings(editingSettings);
    setShowSettingsModal(false);
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) {
      return;
    }

    const userMessage: CounselingChatMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    };

    const placeholderAssistant: CounselingChatMessage = {
      id: createId(),
      role: 'model',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
    setInputValue('');
    setIsStreaming(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/counseling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: historyPayload,
          message: trimmed,
          config: settings,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to receive response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';
      let buffer = '';
      let streamClosed = false;

      const handleDataLine = (line: string) => {
        if (!line.startsWith('data:')) {
          return;
        }

        const data = line.slice(5).trimStart();
        if (!data) {
          return;
        }

        if (data === '[DONE]') {
          streamClosed = true;
          return;
        }

        let parsed: { text?: string; error?: string };
        try {
          parsed = JSON.parse(data) as { text?: string; error?: string };
        } catch {
          throw new Error(`SSE parse error: ${data}`);
        }

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (parsed.text) {
          assistantText += parsed.text;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === placeholderAssistant.id
                ? { ...message, content: assistantText }
                : message
            )
          );
        }
      };

      while (!streamClosed) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), {
          stream: !done,
        });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          handleDataLine(line);
          if (streamClosed) break;
        }

        if (done) {
          streamClosed = true;
        }
      }

      const leftover = buffer.trim();
      if (!streamClosed && leftover) {
        handleDataLine(leftover);
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderAssistant.id
            ? { ...message, content: assistantText, isStreaming: false }
            : message
        )
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        '상담봇과 연결하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      );
      setMessages((prev) =>
        prev.filter((message) => message.id !== placeholderAssistant.id)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-background text-foreground'>
      <header className='sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur'>
        <Button
          variant='ghost'
          size='icon'
          asChild
          aria-label='메인 페이지로 이동'
        >
          <Link href='/'>
            <ArrowLeft className='size-5' />
          </Link>
        </Button>
        <h1 className='text-lg font-semibold'>상담 챗봇</h1>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleOpenSettings}
          aria-label='설정 열기'
        >
          <Settings className='size-5' />
        </Button>
      </header>

      <section className='flex flex-1 flex-col px-6 pb-6'>
        <div className='mt-6 flex-1 space-y-4 overflow-y-auto rounded-xl bg-card/70 p-4 shadow-sm'>
          {messages.length === 0 && (
            <div className='flex h-full flex-col items-center justify-center text-sm text-muted-foreground'>
              <p>안녕하세요! 고민을 자유롭게 이야기해 주세요.</p>
              <p>상담봇이 공감하고 해결책을 함께 고민해 드릴게요.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p>{message.content}</p>
                {message.isStreaming && (
                  <span className='mt-2 inline-flex items-center gap-2 text-xs opacity-70'>
                    <Loader2 className='size-3 animate-spin' />
                    작성 중...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {errorMessage && (
          <div className='mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
            {errorMessage}
          </div>
        )}

        <div className='mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-sm'>
          <textarea
            ref={inputRef}
            value={inputValue}
            placeholder='오늘의 고민을 이야기해 주세요...'
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className='w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:outline-none'
            disabled={isStreaming}
          />
          <Button
            type='button'
            onClick={handleSendMessage}
            disabled={isStreaming || inputValue.trim().length === 0}
          >
            {isStreaming ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Send className='mr-2 size-4' />
            )}
            보내기
          </Button>
        </div>
      </section>

      {showSettingsModal && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 py-6'>
          <div className='w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl'>
            <header className='mb-4'>
              <h2 className='text-xl font-semibold'>상담 설정</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                나의 기본 정보와 상담봇의 성격을 설정해 더 맞춤형 상담을
                받아보세요.
              </p>
            </header>

            <div className='space-y-4'>
              <div className='grid gap-2'>
                <label className='text-sm font-medium text-muted-foreground'>
                  나이
                </label>
                <input
                  type='text'
                  value={editingSettings.userAge}
                  onChange={(event) =>
                    setEditingSettings((prev) => ({
                      ...prev,
                      userAge: event.target.value,
                    }))
                  }
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                  placeholder='예: 17세'
                />
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-muted-foreground'>
                  성별
                </label>
                <input
                  type='text'
                  value={editingSettings.userGender}
                  onChange={(event) =>
                    setEditingSettings((prev) => ({
                      ...prev,
                      userGender: event.target.value,
                    }))
                  }
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                  placeholder='예: 여성'
                />
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-muted-foreground'>
                  나의 특징
                </label>
                <textarea
                  value={editingSettings.userTraits}
                  onChange={(event) =>
                    setEditingSettings((prev) => ({
                      ...prev,
                      userTraits: event.target.value,
                    }))
                  }
                  className='min-h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                  placeholder='예: 사람들과의 관계에서 고민이 많아요.'
                />
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-muted-foreground'>
                  상담봇 MBTI
                </label>
                <select
                  value={editingSettings.mbti}
                  onChange={(event) =>
                    setEditingSettings((prev) => ({
                      ...prev,
                      mbti: event.target.value as MBTIType,
                    }))
                  }
                  className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                >
                  {Object.entries(MBTI_PROFILES).map(([type, profile]) => (
                    <option key={type} value={type}>
                      {type} · {profile.shortDescription}
                    </option>
                  ))}
                </select>
                <p className='text-xs text-muted-foreground'>
                  {MBTI_PROFILES[editingSettings.mbti].longDescription}
                </p>
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-muted-foreground'>
                  답변 길이
                </label>
                <div className='grid grid-cols-3 gap-2'>
                  {[
                    { value: 'short', label: '짧게' },
                    { value: 'medium', label: '중간' },
                    { value: 'long', label: '길게' },
                  ].map((option) => (
                    <button
                      type='button'
                      key={option.value}
                      onClick={() =>
                        setEditingSettings((prev) => ({
                          ...prev,
                          answerLength: option.value as CounselingAnswerLength,
                        }))
                      }
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        editingSettings.answerLength === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:border-primary/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <Button
                variant='ghost'
                onClick={() => {
                  setEditingSettings(settings);
                  setShowSettingsModal(false);
                }}
              >
                닫기
              </Button>
              <Button onClick={handleApplySettings}>적용</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
