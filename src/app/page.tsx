import type { ReactNode } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Sparkles, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-accent/5'>
      {/* 배경 장식 요소 */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -left-40 -top-40 h-96 w-96 rounded-full bg-linear-to-br from-primary/10 via-accent/5 to-transparent blur-3xl' />
        <div className='absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-linear-to-tl from-primary/10 via-accent/5 to-transparent blur-3xl' />
        <div className='absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-accent/5 to-transparent blur-3xl' />
      </div>

      <div className='relative z-10 flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-16 md:px-8 lg:gap-12'>
        <header className='flex w-full flex-col items-center gap-2 text-center md:flex-row md:items-center md:justify-center md:text-left'>
          <div className='group relative flex shrink-0 flex-col items-center gap-2 md:items-center'>
            <div className='relative'>
              {/* 로고 후광 효과 */}
              <div className='absolute inset-0 -z-10 animate-pulse rounded-full bg-linear-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:blur-3xl' />
              <div className='relative transition-all duration-500 hover:scale-105'>
                <Image
                  src='/team-logo.png'
                  alt='Team Logo'
                  width={280}
                  height={280}
                  priority
                  className='h-44 w-auto sm:h-56'
                />
              </div>
            </div>
          </div>

          <div className='flex max-w-2xl flex-col items-center gap-3 lg:items-start'>
            <div className='flex items-center gap-2'>
              <h1 className='bg-linear-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl'>
                School Helper
              </h1>
              <Sparkles className='h-6 w-6 animate-pulse text-primary/60 sm:h-7 sm:w-7' />
            </div>
            <p className='text-base leading-relaxed text-muted-foreground sm:text-lg'>
              학교 생활을 조금 더 가볍고 편안하게 만들어주는
              <br className='hidden sm:block' />
              <span className='font-medium text-foreground/80'>
                개인화 AI 도우미 앱
              </span>
              입니다.
            </p>
          </div>
        </header>

        <section className='flex w-full flex-col gap-4 sm:gap-5 md:flex-row md:gap-6 lg:mt-2'>
          <CTAButton
            href='/counseling'
            icon={<MessageCircle className='h-6 w-6' />}
            title='고민 상담 페이지'
            description='익명으로 가벼운 고민을 나누고 공감받아 보세요.'
            gradient='from-blue-500/10 to-cyan-500/10'
            hoverGradient='from-blue-500/20 to-cyan-500/20'
          />
          <CTAButton
            href='/outfit'
            icon={<Sun className='h-6 w-6' />}
            title='날씨 맞춤 옷차림'
            description='오늘의 날씨에 맞는 착장을 빠르게 추천받아요.'
            gradient='from-amber-500/10 to-orange-500/10'
            hoverGradient='from-amber-500/20 to-orange-500/20'
          />
        </section>
      </div>
    </main>
  );
}

type CTAButtonProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
  hoverGradient: string;
};

function CTAButton({
  href,
  icon,
  title,
  description,
  gradient,
  hoverGradient,
}: CTAButtonProps) {
  return (
    <div className='group relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-foreground/10 bg-linear-to-br from-background/95 to-background/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 sm:p-7 md:p-8'>
      {/* 배경 그라디언트 효과 */}
      <div
        className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      />
      <div
        className={`absolute -inset-20 bg-linear-to-br ${hoverGradient} opacity-0 blur-3xl transition-all duration-700 group-hover:opacity-100`}
      />

      <div className='relative z-10 flex flex-col gap-6'>
        {/* 아이콘과 텍스트 */}
        <div className='flex items-start gap-4'>
          <div className='relative'>
            <div className='absolute inset-0 animate-pulse rounded-2xl bg-linear-to-br from-primary/30 to-accent/30 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100' />
            <span className='relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-foreground/10 to-foreground/5 text-foreground shadow-inner ring-1 ring-foreground/10 transition-all duration-500 group-hover:scale-110 group-hover:from-foreground/20 group-hover:to-foreground/10'>
              {icon}
            </span>
          </div>
          <div className='flex-1 space-y-2'>
            <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>
              {title}
            </h2>
            <p className='text-sm leading-relaxed text-muted-foreground sm:text-base'>
              {description}
            </p>
          </div>
        </div>

        {/* CTA 버튼 */}
        <Button
          asChild
          className='group/btn relative overflow-hidden bg-linear-to-r from-foreground to-foreground/90 text-background shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-foreground/20'
        >
          <Link href={href} className='flex items-center justify-between'>
            <span className='relative z-10 font-semibold'>
              지금 바로 이동하기
            </span>
            <ArrowRight className='relative z-10 ml-2 h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1' />
            <div className='absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-background/20 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full' />
          </Link>
        </Button>
      </div>
    </div>
  );
}
