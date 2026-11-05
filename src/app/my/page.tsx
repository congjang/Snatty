"use client";

import { useRouter } from "next/navigation";
import { Card } from "../components/Card";
import { TopNavBar } from "../components/TopNavBar";
import { Fab } from "../components/Fab";

export default function MyPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <main className="relative flex min-h-0 h-[100dvh] max-h-[844px] md:max-h-[1024px] w-full max-w-[390px] md:max-w-[744px] flex-col overflow-hidden rounded-3xl bg-[var(--colorBackgroundBase2Default,#f2f2f3)] shadow-xl">
        {/* 상단 TopNav — 마이페이지 */}
        <TopNavBar type="Sub" headline="마이페이지" showButtons={false} />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-4 pb-24">
          {/* 프로필 카드 영역 — 아직 전용 컴포넌트 없음 → red static 컨테이너 */}
          <div className="rounded-2xl bg-red-200 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-300" />
              <div>
                <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-XS,20px)] font-bold text-[var(--colorElementBase1Default,#35363b)]">
                  협업이
                </p>
                <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Caption-M,10px)] text-[var(--colorElementBase2Default,#5e6068)]">
                  figmastudy@mail.com
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="h-12 rounded-lg bg-red-300 text-sm font-semibold text-[var(--colorElementBase1Default,#35363b)]">
                프로필 편집
              </button>
              <button className="h-12 rounded-lg bg-red-300 text-sm font-semibold text-[var(--colorElementBase1Default,#35363b)]">
                내 활동 보기
              </button>
            </div>
          </div>

          {/* 설정 리스트 — List 컴포넌트로 대체 가능하지만, 아직 전용 구조 없으므로 red 컨테이너로 표시 */}
          <Card className="bg-red-200">
            <div className="space-y-2 text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold text-[var(--colorElementBase1Default,#35363b)]">
              <div>나의 활동</div>
              <div>기록하기 설정</div>
              <div>목표 설정</div>
              <div>모아보기 설정</div>
              <div>개인정보 설정</div>
            </div>
          </Card>

          <Card className="bg-red-200">
            <div className="space-y-2 text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold text-[var(--colorElementBase3Default,#8f9099)]">
              <div>앱 설정</div>
              <div>문의하기</div>
              <div>정보 수정 제안</div>
            </div>
          </Card>
        </div>

        {/* FAB — 새 기록 추가 */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <Fab
            variant="primary"
            size="L"
            className="pointer-events-auto absolute bottom-6 right-6"
            aria-label="새 기록 추가"
            onClick={() => router.push("/")}
          />
        </div>
      </main>
    </div>
  );
}

